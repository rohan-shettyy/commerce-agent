"""
Tools for the ShopBot AI assistant.

This module defines LangChain tools used by the agent to interact with the
product catalog, search index, and filter products by attributes.
"""

import json
from typing import List, Optional, Dict, Any, Union

import faiss
from langchain_core.tools import tool
from sentence_transformers import SentenceTransformer

from backend.catalog.loader import Product

# ---------------------------------------------------------------------------
# Module-level State
# ---------------------------------------------------------------------------

_catalog: List[Product] = []
_text_index: Optional[faiss.IndexFlatIP] = None
_encoder: Optional[SentenceTransformer] = None


def initialize_tools(catalog: List[Product], text_index: faiss.IndexFlatIP,
                     encoder: SentenceTransformer) -> None:
    """Initialize the tool state with the product catalog and search index.

    Args:
        catalog: List of all products in the store.
        text_index: Built FAISS index for semantic search.
        encoder: Sentence transformer for encoding search queries.
    """
    global _catalog, _text_index, _encoder
    _catalog = catalog
    _text_index = text_index
    _encoder = encoder


# ---------------------------------------------------------------------------
# Tool Definitions
# ---------------------------------------------------------------------------

@tool("search_products")
def search_products_by_text(query: str) -> str:
    """Search the product catalog using a natural language query.

    Use this tool whenever the user asks for product recommendations,
    wants to find a product, or describes what they are looking for.
    Returns the top 5 most semantically relevant products as a JSON string.

    Args:
        query: The user's natural language search query, e.g. 'running shoes'.

    Returns:
        JSON string containing a list of matched products.
    """
    if _text_index is None or _encoder is None or not _catalog:
        return json.dumps({"error": "Catalog or search index is not initialized."})
    
    # 1. Encode query
    query_vec = _encoder.encode([query])
    # 2. Normalize embedding with L2 norm
    faiss.normalize_L2(query_vec)
    # 3. Search pre-built FAISS text index
    k = min(10, len(_catalog))  # Fetch more to allow for filtering
    distances, indices = _text_index.search(query_vec, k)
    
    # 4. Return matched products meeting relevance threshold
    threshold = 0.6
    results = []
    for i, idx in enumerate(indices[0]):
        if 0 <= idx < len(_catalog):
            score = float(distances[0][i])
            if score < threshold:
                continue
                
            p = _catalog[idx]
            results.append({
                "id": p.id,
                "name": p.name,
                "brand": p.brand,
                "price": p.price,
                "description": p.description,
                "rating": p.rating,
                "category": p.category,
                "image_url": p.image_url,
                "relevance_score": round(score, 3)
            })
    return json.dumps(results)


@tool("get_product_details")
def get_product_details(product_id: str) -> str:
    """Get full details for a specific product by its ID.

    Use this tool when the user asks for more information about a specific
    product, or when you need to verify product attributes before recommending.

    Args:
        product_id: The UUID string of the product.

    Returns:
        JSON string with full product details, or an error message if not found.
    """
    if not _catalog:
        return json.dumps({"error": "Catalog is not initialized."})

    for p in _catalog:
        if p.id == product_id:
            return p.model_dump_json()
    return json.dumps({"error": f"Product {product_id} not found."})


@tool("list_categories")
def list_categories() -> str:
    """List all available product categories in the catalog.

    Use this tool when the user asks what types of products are available,
    or when you need to know the categories before filtering.

    Returns:
        JSON string with an array of category name strings.
    """
    if not _catalog:
        return "[]"
    categories = sorted(list({p.category for p in _catalog}))
    return json.dumps(categories)


@tool("filter_products")
def filter_products(category: Optional[str] = None,
                    max_price: Optional[float] = None,
                    min_rating: Optional[float] = None) -> str:
    """Filter products by category, maximum price, and/or minimum rating.

    Use this tool when the user specifies constraints like 'under $50',
    'books with rating above 4', or 'all electronics'.
    All parameters are optional; pass null to skip that filter.

    Args:
        category: Product category string, e.g. 'electronics'. Case-insensitive.
        max_price: Maximum price in USD, e.g. 50.0.
        min_rating: Minimum rating (1.0-5.0), e.g. 4.0.

    Returns:
        JSON string with up to 10 matching products sorted by rating.
    """
    if not _catalog:
        return "[]"

    filtered = []
    for p in _catalog:
        if category and category.lower() != p.category.lower():
            continue
        if max_price is not None and p.price > max_price:
            continue
        if min_rating is not None and p.rating < min_rating:
            continue
        filtered.append(p)
    
    # Sort by rating descending
    filtered.sort(key=lambda x: x.rating, reverse=True)
    
    # Return top 10 results
    results = [p.model_dump() for p in filtered[:10]]
    if not results:
        return "[]"
    return json.dumps(results)


@tool("lookup_products_by_name")
def lookup_products_by_name(product_names: List[str]) -> str:
    """Find specific products in the catalog by their exact or near-exact names.

    Use this tool whenever the user mentions specific product names.
    This tool ensures those products are retrieved and prioritized.
    The order of names in the input list will be preserved in the output.

    Args:
        product_names: A list of product names as mentioned by the user.

    Returns:
        JSON string containing the list of matched products in order.
    """
    if not _catalog:
        return "[]"

    results = []
    # Search for each name to maintain order
    for name in product_names:
        name_lower = name.lower().strip()
        for p in _catalog:
            # Check for exact or close match
            if name_lower == p.name.lower().strip() or name_lower in p.name.lower():
                results.append({
                    "id": p.id,
                    "name": p.name,
                    "brand": p.brand,
                    "price": p.price,
                    "description": p.description,
                    "rating": p.rating,
                    "category": p.category,
                    "image_url": p.image_url,
                    "mention_priority": True
                })
                # Break internal loop to move to next name (only find first match per name)
                break
    
    return json.dumps(results)


# Expose tools array for LangChain
AGENT_TOOLS = [
    search_products_by_text, 
    get_product_details, 
    list_categories, 
    filter_products, 
    lookup_products_by_name
]
