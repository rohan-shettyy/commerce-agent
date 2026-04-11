"""
Pydantic schemas for the Commerce AI Agent API.

Defines the structure of requests and responses for chat, search, and voice
endpoints to ensure consistent data validation and serialization.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ProductSummary(BaseModel):
    """Simplified product representation for search and chat results.

    Attributes:
        id: Unique identifier for the product.
        name: Product display name.
        brand: Brand name.
        price: Unit price.
        image_url: URL to the primary product image.
        rating: Average customer rating (0-5).
        category: Primary product category.
        description: Detailed product blurb.
        tags: Keywords for search indexing.
        in_stock: Availability status.
        attributes: Nested metadata like color and size.
    """
    id: str
    name: str
    brand: str
    price: float
    image_url: str
    rating: float
    category: str
    description: Optional[str] = ""
    tags: Optional[List[str]] = []
    in_stock: Optional[bool] = True
    attributes: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    """Request schema for the /api/chat endpoint.

    Attributes:
        session_id: Unique UUID for the conversation session.
        message: Optional text message from the user.
        context: Optional additional context for the agent.
        image_base64: Optional base64-encoded image string for multimodal chat.
        image_mime: MIME type of the uploaded image (e.g., image/jpeg).
    """
    session_id: str
    message: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    image_base64: Optional[str] = None
    image_mime: Optional[str] = None


class ImageSearchResponse(BaseModel):
    """Response schema for the /api/search/image endpoint.

    Attributes:
        session_id: The session ID associated with the search.
        reply: A natural language description of the search results from the AI.
        products: A list of products found to be similar.
        similarity_scores: Vector similarity scores for each result.
    """
    session_id: str
    reply: str
    products: List[ProductSummary]
    similarity_scores: List[float]


class ChatResponse(BaseModel):
    """Response schema for the /api/chat endpoint.

    Attributes:
        session_id: The session ID associated with the chat.
        reply: The natural language reply from the AI agent.
        products: A list of products recommended or mentioned by the agent.
        tool_calls_made: A list of internal tool names invoked by the agent.
        latency_ms: Total server-side processing time in milliseconds.
    """
    session_id: str
    reply: str
    products: List[ProductSummary]
    tool_calls_made: List[str]
    latency_ms: float
