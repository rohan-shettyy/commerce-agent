"""
Agent orchestration module for ShopBot.

Creates and caches a singleton LangGraph ReAct agent with bounded in-memory
checkpointing to prevent memory exhaustion from stale sessions.
"""

import threading
from typing import Any, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent

from backend.agent.memory import BoundedMemorySaver
from backend.agent.tools import AGENT_TOOLS
from backend.config import settings

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are ShopBot, a friendly and helpful AI shopping assistant for an online store.
You have access to a product catalog and can help customers find products,
compare options, and answer questions about what's available.

Guidelines:
- Always use the provided tools to look up products; never invent product names or prices.
- Present product recommendations in a clear, scannable format with name, price, and rating.
- If a request is ambiguous, ask one clarifying question (e.g., "What's your budget?").
- Keep responses concise -- 2-4 sentences for general answers, bullet points for product lists.
- If asked about yourself, say you are ShopBot, an AI shopping assistant.
- Never claim to be human."""


# ---------------------------------------------------------------------------
# Singleton Agent Access
# ---------------------------------------------------------------------------

_agent_instance: Optional[Any] = None
_agent_lock = threading.Lock()


def get_agent() -> Any:
    """Return the singleton LangGraph compiled agent, creating it on first call.

    Returns:
        The compiled LangGraph ReAct agent graph.
    """
    global _agent_instance

    if _agent_instance is not None:
        return _agent_instance

    with _agent_lock:
        # Double-checked locking
        if _agent_instance is not None:
            return _agent_instance

        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3,
        )

        checkpointer = BoundedMemorySaver()

        _agent_instance = create_react_agent(
            model=llm,
            tools=AGENT_TOOLS,
            checkpointer=checkpointer,
            prompt=SYSTEM_PROMPT,
        )

    return _agent_instance


# ---------------------------------------------------------------------------
# Singleton Agent Access
# ---------------------------------------------------------------------------

_agent_instance: Optional[Any] = None
_agent_lock = threading.Lock()


def get_agent() -> Any:
    """Return the singleton LangGraph compiled agent, creating it on first call.

    Returns:
        The compiled LangGraph ReAct agent graph.
    """
    global _agent_instance

    if _agent_instance is not None:
        return _agent_instance

    with _agent_lock:
        # Double-checked locking
        if _agent_instance is not None:
            return _agent_instance

        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3,
        )

        checkpointer = BoundedMemorySaver()

        _agent_instance = create_react_agent(
            model=llm,
            tools=AGENT_TOOLS,
            checkpointer=checkpointer,
            prompt=SYSTEM_PROMPT,
        )

    return _agent_instance
