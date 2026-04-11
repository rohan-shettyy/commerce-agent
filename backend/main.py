"""
Main entry point for the Commerce AI Agent API.

This module initializes the FastAPI application, sets up middleware,
loads the product catalog, builds search indices, and includes API routes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List, Dict, Any
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

from backend.config import settings
from backend.utils.logger import get_logger
from backend.catalog.loader import load_catalog, Product

from backend.agent.tools import initialize_tools
from backend.api.routes import chat, voice, search

logger = get_logger(__name__)

# Global state for catalog
CATALOG: List[Product] = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles application startup and shutdown events.

    Loads the product catalog, builds FAISS indices, and initializes agent tools.
    """
    global CATALOG
    logger.info("Application startup starting...")
    
    # 1. Load catalog
    CATALOG = load_catalog()
    logger.info("Catalog loaded successfully.")
    
    app.state.catalog = CATALOG
    
    # 2. Build FAISS text index
    logger.info("Building FAISS text index...")
    encoder = SentenceTransformer("all-MiniLM-L6-v2")
    texts = [f"{p.name}. {p.description}. Tags: {', '.join(p.tags)}" for p in CATALOG]
    embeddings = encoder.encode(texts)
    faiss.normalize_L2(embeddings)
    dimension = embeddings.shape[1]
    text_index = faiss.IndexFlatIP(dimension)
    text_index.add(embeddings)
    logger.info("FAISS text index built successfully.")
    
    # 3. Build FAISS image index using CLIP
    logger.info("Building FAISS image index...")
    from backend.utils.embeddings import build_image_index
    image_index, image_ids = build_image_index(CATALOG)
    app.state.image_index = image_index
    app.state.image_ids = image_ids
    logger.info("FAISS image index built successfully.")
    
    # 4. Initialize LangChain Agent tools
    initialize_tools(CATALOG, text_index, encoder)
    logger.info("Agent tools initialized.")
    
    logger.info("Application startup complete.")
    yield
    logger.info("Application shutdown starting...")
    logger.info("Application shutdown complete.")


app = FastAPI(title="ShopBot AI Commerce API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(chat.router, prefix="/api")
app.include_router(voice.router, prefix="/api/voice")
app.include_router(search.router, prefix="/api/search")

@app.get("/health", tags=["System"], summary="API Health Check")
async def health_check() -> Dict[str, str]:
    """Returns the current status of the API and configured model."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "model": settings.GEMINI_MODEL
    }

@app.get("/api/products", response_model=List[Product], tags=["Catalog"], summary="List all products")
async def get_products() -> List[Product]:
    """Returns the full product catalog as a list."""
    return CATALOG

@app.get("/api/docs/overview", tags=["System"], summary="Machine-readable API summary")
async def docs_overview() -> Dict[str, Any]:
    """Returns a structured overview of all API endpoints for programmatic consumption."""
    return {
        "version": "1.0.0",
        "model": settings.GEMINI_MODEL,
        "endpoints": [
            {
                "method": "POST",
                "path": "/api/chat",
                "summary": "Send a message to the AI agent",
                "tags": ["Chat"]
            },
            {
                "method": "POST",
                "path": "/api/voice/transcribe",
                "summary": "Transcribe audio using Gemini native voice understanding",
                "tags": ["Voice"]
            },
            {
                "method": "POST",
                "path": "/api/voice/tts",
                "summary": "Synthesize speech from text using Gemini TTS",
                "tags": ["Voice"]
            },
            {
                "method": "POST",
                "path": "/api/search/image",
                "summary": "Search products by image using CLIP + Gemini Vision",
                "tags": ["Search"]
            },
            {
                "method": "GET",
                "path": "/api/products",
                "summary": "List all products in the catalog",
                "tags": ["Catalog"]
            }
        ]
    }
