"""
Chat route handler for the Commerce AI Agent.

This module processes POST /api/chat requests, invoking the LangGraph agent
with per-session bounded memory and multimodal input support.
"""

import asyncio
import json
import time
import traceback
from typing import Dict, List, Any, Union

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from google.api_core.exceptions import ResourceExhausted

from backend.agent.agent import get_agent
from backend.api.models import ChatRequest, ChatResponse, ProductSummary
from backend.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Timeout for the AI agent reasoning and tool calls
AGENT_TIMEOUT_SECONDS = 60


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Send a message to the AI agent",
    description="""Send a text message to ShopBot and receive a response.
    The agent maintains conversation history per session_id.
    Supports product search, recommendations, and general Q&A.
    """,
    response_description="Agent reply with optional structured product results",
    tags=["Chat"],
)
async def chat_endpoint(request: ChatRequest) -> Union[ChatResponse, JSONResponse]:
    """Process a chat message and return the agent's response.

    Args:
        request: The incoming chat request with session ID and optional image.

    Returns:
        A ChatResponse object or a JSONResponse in case of handled errors.

    Raises:
        HTTPException: For invalid input data.
    """
    if not request.message or not request.message.strip():
        if not request.image_base64:
            raise HTTPException(status_code=422, detail="Message cannot be empty")

    start_time = time.monotonic()

    try:
        # 1. Get the singleton agent
        agent = get_agent()

        # 2. Prepare the input message (Multimodal Support)
        if request.image_base64:
            mime = request.image_mime or "image/jpeg"
            message_content = [
                {"type": "text", "text": request.message or "Help me with this image."},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{request.image_base64}"},
                },
            ]
        else:
            message_content = request.message

        # 3. Invoke the agent with thread_id for state persistence
        config = {
            "configurable": {"thread_id": request.session_id},
            "recursion_limit": 20,
        }
        
        try:
            result = await asyncio.wait_for(
                agent.ainvoke(
                    {"messages": [("user", message_content)]},
                    config=config,
                ),
                timeout=AGENT_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            raise

        # 4. Parse result from LangGraph messages state
        messages = result.get("messages", [])
        if not messages:
            raise ValueError("No messages returned from agent")

        final_message = messages[-1]
        reply = final_message.content

        # Flatten multimodal content list to string if necessary
        if isinstance(reply, list):
            reply = "".join(
                [c.get("text", "") if isinstance(c, dict) else str(c) for c in reply]
            )

        # 5. Extract tool outputs to identify products returned to the user
        tool_calls_made: List[str] = []
        products_map: Dict[str, ProductSummary] = {}

        for msg in messages:
            # Check for AI messages that made tool calls
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tool_calls_made.append(tc["name"])

            # Check for Tool messages (the outputs)
            if msg.type == "tool":
                # Tools: search_products, filter_products, get_product_details
                if msg.name in ["search_products", "filter_products", "get_product_details"]:
                    try:
                        parsed_output = json.loads(msg.content)
                        items = parsed_output if isinstance(parsed_output, list) else [parsed_output]
                        for p in items:
                            if isinstance(p, dict) and "id" in p and p["id"] not in products_map:
                                products_map[p["id"]] = ProductSummary(**p)
                    except (json.JSONDecodeError, TypeError, KeyError) as parse_e:
                        logger.warning(f"Failed to parse tool output from {msg.name}: {parse_e}")

        latency_ms = (time.monotonic() - start_time) * 1000

        return ChatResponse(
            session_id=request.session_id,
            reply=str(reply),
            products=list(products_map.values()),
            tool_calls_made=tool_calls_made,
            latency_ms=latency_ms
        )

    except asyncio.TimeoutError:
        logger.warning(f"Agent timed out for session {request.session_id}")
        return JSONResponse(
            status_code=504,
            content={"detail": "The request took too long. Please try a simpler question."}
        )
    except ResourceExhausted as res_err:
        logger.warning(f"Rate limited: {str(res_err)}")
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit reached. Please wait a moment and try again."}
        )
    except Exception:
        logger.error(f"Internal error in chat endpoint:\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"detail": "An error occurred. Please try again."}
        )


