"""
Product catalog loader for ShopBot.

Handles parsing the static products.json file into validated Pydantic models
used across the backend.
"""

import json
import os
from typing import List, Optional

from pydantic import BaseModel, Field

from backend.utils.logger import get_logger

logger = get_logger(__name__)


class Attributes(BaseModel):
    """Product-specific metadata like color, size, and material.

    Attributes:
        color: Visual base color of the item.
        size: Physical dimensions or unit size.
        material: Primary material composition.
    """
    color: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None


class Product(BaseModel):
    """Full representation of a product in the catalog.

    Attributes:
        id: Unique UUID string.
        name: Catchy display name for the product.
        brand: Manufacturer or brand name.
        category: Primary product category.
        price: Unit price in USD.
        description: Detailed product blurb.
        tags: List of keywords for search indexing.
        image_url: Remote URL for the product image.
        rating: Average customer rating.
        in_stock: Availability status.
        attributes: Nested metadata.
    """
    id: str = Field(description="UUID v4")
    name: str
    brand: str
    category: str
    price: float
    description: str
    tags: List[str]
    image_url: str
    rating: float
    in_stock: bool
    attributes: Optional[Attributes] = None


def load_catalog() -> List[Product]:
    """Load and validate the product catalog from the local JSON file.

    Returns:
        A list of validated Product objects.

    Raises:
        ValueError: If the catalog file is missing or contains invalid data.
    """
    # Resolve path relative to the backend directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    catalog_path = os.path.join(base_dir, "catalog", "products.json")
    
    if not os.path.exists(catalog_path):
        # Fallback for alternative execution contexts
        fallback_path = os.path.join(os.getcwd(), "backend", "catalog", "products.json")
        if os.path.exists(fallback_path):
            catalog_path = fallback_path
        else:
            raise ValueError(f"Catalog file not found at {catalog_path} or {fallback_path}")

    with open(catalog_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse catalog JSON: {e}")

    products = []
    for idx, item in enumerate(data):
        try:
            prod = Product.model_validate(item)
            products.append(prod)
        except Exception as e:
            raise ValueError(f"Validation error at product index {idx}: {e}")

    logger.info(f"Successfully loaded {len(products)} products from {catalog_path}")
    return products
