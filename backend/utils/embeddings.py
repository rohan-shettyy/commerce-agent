"""
Embedding utilities for text and images using CLIP and SentenceTransformers.

Provides functions to generate vector embeddings for catalog indexing and
real-time similarity search.
"""

from io import BytesIO
from typing import List, Tuple, Optional

import faiss
import httpx
import numpy as np
from PIL import Image
from sentence_transformers import SentenceTransformer

from backend.catalog.loader import Product
from backend.utils.logger import get_logger

logger = get_logger(__name__)

# Module-level singleton for the CLIP encoder
_IMAGE_ENCODER: Optional[SentenceTransformer] = None


def get_image_encoder() -> SentenceTransformer:
    """Return the singleton instance of the CLIP encoder.

    Returns:
        The loaded SentenceTransformer model (clip-ViT-B-32).
    """
    global _IMAGE_ENCODER
    if _IMAGE_ENCODER is None:
        logger.info("Loading CLIP model (clip-ViT-B-32)...")
        _IMAGE_ENCODER = SentenceTransformer("clip-ViT-B-32")
    return _IMAGE_ENCODER


def embed_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """Generate a normalized CLIP embedding for raw image bytes.

    Args:
        image_bytes: The raw bytes of the image file.

    Returns:
        A normalized 1D numpy array representing the image vector.
    """
    encoder = get_image_encoder()
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    image = image.resize((224, 224))
    embedding = encoder.encode(image)
    
    # Normalize with L2 norm for cosine similarity equivalent search
    faiss.normalize_L2(embedding.reshape(1, -1))
    return embedding.flatten().astype(np.float32)


def embed_image_from_url(url: str, timeout: int = 15) -> np.ndarray:
    """Fetch an image from a URL and generate its CLIP embedding.

    Args:
        url: The public URL of the image.
        timeout: HTTP request timeout in seconds.

    Returns:
        A normalized 1D numpy array representing the image vector.
    """
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        response = client.get(url)
        response.raise_for_status()
        return embed_image_from_bytes(response.content)


def embed_text_clip(text: str) -> np.ndarray:
    """Generate a specialized CLIP-space embedding for a text string.

    Args:
        text: The text query to encode.

    Returns:
        A normalized 1D numpy array in the CLIP latent space.
    """
    encoder = get_image_encoder()
    embedding = encoder.encode(text)
    faiss.normalize_L2(embedding.reshape(1, -1))
    return embedding.flatten().astype(np.float32)


def build_image_index(products: List[Product]) -> Tuple[faiss.IndexFlatIP, List[str]]:
    """Build a FAISS index from the images of all products in the catalog.

    Args:
        products: The list of products to index.

    Returns:
        A tuple containing the FAISS index and the list of matching product IDs.
    """
    product_id_list = []
    embeddings_list = []
    
    logger.info(f"Starting image indexing for {len(products)} products...")
    
    for i, product in enumerate(products):
        try:
            emb = embed_image_from_url(product.image_url)
            embeddings_list.append(emb)
            product_id_list.append(product.id)
            
            if (i + 1) % 10 == 0:
                logger.debug(f"Indexed image {i+1}/{len(products)}: {product.name}")
        except Exception as e:
            logger.error(f"Failed to index image for product {product.id}: {e}")
            
    if not embeddings_list:
        logger.warning("No images indexed; creating empty index with CLIP dimensions (512).")
        return faiss.IndexFlatIP(512), []
        
    embeddings_matrix = np.vstack(embeddings_list)
    dimension = embeddings_matrix.shape[1]
    
    image_index = faiss.IndexFlatIP(dimension)
    image_index.add(embeddings_matrix)
    
    logger.info(f"Image FAISS index built with {len(product_id_list)} entries.")
    return image_index, product_id_list
