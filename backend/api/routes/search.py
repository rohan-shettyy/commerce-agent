"""
Image search route for the Commerce AI Agent.

This module handles POST /api/search/image requests by performing a dual-path
search: CLIP-based visual similarity search in the product catalog and
Gemini Vision-based semantic description.
"""

import asyncio
import json
import time
from typing import List, Tuple, Union

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import JSONResponse
from google import genai
from google.genai import types

from backend.agent.agent import get_agent
from backend.api.models import ImageSearchResponse, ProductSummary
from backend.config import settings
from backend.utils.embeddings import embed_image_from_bytes
from backend.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Constants & Shared Resources
# ---------------------------------------------------------------------------

# Module-level singleton client
client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Maximum image upload size (10MB)
MAX_IMAGE_SIZE = 10 * 1024 * 1024

# CLIP Similarity threshold
CLIP_RELEVANCE_THRESHOLD = 0.8


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/image",
    response_model=ImageSearchResponse,
    summary="Search products by image using CLIP + Gemini Vision",
    description="""Upload a product image to find visually similar items.
    Uses CLIP embeddings for fast vector similarity search against the catalog,
    enriched with Gemini Vision for natural-language image description.
    Supported formats: JPEG, PNG, WebP. Max size: 10MB.
    """,
    response_description="Agent reply with matched products and similarity scores",
    tags=["Search"]
)
async def search_image(
    request: Request,
    image: UploadFile = File(...),
    session_id: str = Form(...)
) -> Union[ImageSearchResponse, JSONResponse]:
    """Search for products visually similar to the uploaded image.

    Args:
        request: The FastAPI request object for state access.
        image: The uploaded image file.
        session_id: The active session identifier.

    Returns:
        An ImageSearchResponse with matches and descriptions, or a JSONResponse on error.

    Raises:
        HTTPException: For invalid file sizes or unsupported formats.
    """
    start_time = time.monotonic()
    
    # 1. Validation
    image_bytes = await image.read()
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Image must be under 10MB")
        
    if len(image_bytes) < 4:
        raise HTTPException(status_code=415, detail="Invalid file data")
        
    magic = image_bytes[:4]
    is_jpeg = magic[:3] == b'\xff\xd8\xff'
    is_png = magic == b'\x89PNG'
    is_webp = magic == b'RIFF'
    
    if not (is_jpeg or is_png or is_webp):
        raise HTTPException(status_code=415, detail="Unsupported format. Use JPEG, PNG, or WebP.")
        
    image_index = getattr(request.app.state, 'image_index', None)
    image_ids = getattr(request.app.state, 'image_ids', [])
    catalog = getattr(request.app.state, 'catalog', [])
    
    if image_index is None:
        raise HTTPException(status_code=500, detail="Image index not initialized")
    
    # 2 & 3. Parallel CLIP Search and Vision Description
    async def run_clip_search() -> Tuple[List[ProductSummary], List[float]]:
        """Perform vector similarity search using CLIP model."""
        try:
            query_embedding = await asyncio.to_thread(embed_image_from_bytes, image_bytes)
            # Fetch more matches to allow for threshold filtering
            distances, indices = image_index.search(query_embedding.reshape(1, -1), k=10)
            
            similar_products = []
            filtered_scores = []
            catalog_map = {p.id: p for p in catalog}
            
            for i, idx_val in enumerate(indices[0]):
                score = float(distances[0][i])
                if score < CLIP_RELEVANCE_THRESHOLD:
                    continue
                    
                pid = image_ids[idx_val]
                if pid in catalog_map:
                    similar_products.append(ProductSummary(**catalog_map[pid].model_dump()))
                    filtered_scores.append(score)
            
            # Keep only top 5 if many matched
            return similar_products[:5], filtered_scores[:5]
        except Exception as e:
            logger.error(f"CLIP search failed: {e}")
            return [], []

    async def run_vision_description() -> str:
        """Get semantic description from Gemini Vision."""
        try:
            prompt = "Describe this product image in one sentence for a shopping assistant."
            desc_response = await asyncio.to_thread(
                client.models.generate_content,
                model=settings.GEMINI_MODEL,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=image.content_type),
                    prompt
                ]
            )
            return desc_response.text.strip() if desc_response.text else "unknown product"
        except Exception as e:
            error_msg = str(e).lower()
            if "429" in error_msg or "resource_exhausted" in error_msg:
                return "RATE_LIMIT_ERROR"
            logger.error(f"Vision description failed: {e}")
            return "a specific visually requested product"

    [product_summaries, similarity_scores], image_description = await asyncio.gather(
        run_clip_search(),
        run_vision_description()
    )
    
    if image_description == "RATE_LIMIT_ERROR":
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit reached for Vision Model. Please wait."}
        )

    # 4. Agent Response Generation
    product_list_str = json.dumps([p.model_dump() for p in product_summaries], indent=2)
    
    if product_summaries:
        agent_input = (
            f"The user uploaded an image of: {image_description}. "
            f"I found {len(product_summaries)} relevant products: {product_list_str}. "
            "Please present these options in a friendly, helpful way."
        )
    else:
        agent_input = (
            f"The user uploaded an image of: {image_description}. "
            "I could not find any products in our catalog that are visually similar. "
            "Please politely inform the user and ask if they are looking for something else."
        )
    
    try:
        agent = get_agent()
        config = {
            "configurable": {"thread_id": session_id},
            "recursion_limit": 20,
        }
        result = await asyncio.wait_for(
            agent.ainvoke({"messages": [("user", agent_input)]}, config=config),
            timeout=60
        )
        
        messages = result.get("messages", [])
        if not messages:
            raise ValueError("No response from agent")
            
        reply = messages[-1].content
        if isinstance(reply, list):
            reply = "".join([c.get("text", "") if isinstance(c, dict) else str(c) for c in reply])
    except Exception as e:
        logger.error(f"Agent search-response generation failed: {e}")
        if product_summaries:
            reply = f"I found several items matching the {image_description} you provided. Here are some comparable options:"
        else:
            reply = f"I see you've shared an image of {image_description}, but I couldn't find a close match in our current catalog. Is there something else I can help you find?"
        
    return ImageSearchResponse(
        session_id=session_id,
        reply=str(reply),
        products=product_summaries,
        similarity_scores=similarity_scores
    )
