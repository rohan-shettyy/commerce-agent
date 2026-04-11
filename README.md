---
title: Commerce Agent Backend
emoji: 🛒
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# 🛒 ShopBot — AI Commerce Assistant

ShopBot is a production-grade, multimodal AI shopping assistant inspired by Amazon Rufus. It provides a unified agent experience across **text**, **voice**, and **image** modalities to help users discover products, get recommendations, and navigate a curated catalog.

---

## ✨ Features

- **Natural Language Chat** — Context-aware product search and recommendations using the Gemini API.
- **Voice Interaction** — Speak your queries directly. The system uses browser's STT for high-accuracy transcription and Gemini's TTS for audio generation.
- **Visual Search** — Upload a photo or drag-and-drop to find visually similar items powered by local CLIP embeddings and Gemini Vision.
- **Stateful Memory** — Intelligent conversation tracking using LangGraph ensures the agent remembers your preferences and previous questions within a session.

---

## Quick Start

### Prerequisites
- **Docker** and **Docker Compose**
- **Google AI Studio API Key**

### Setup & Launch
1. **Clone the repository**:
   ```bash
   git clone https://github.com/rohan-shettyy/commerce-agent.git
   cd commerce-agent
   ```

2. **Configure environment**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

### Service Access
| Service | URL |
|---|---|
| **Frontend UI** | [http://localhost:5173](http://localhost:5173) |
| **Backend API** | [http://localhost:8000](http://localhost:8000) |
| **Interactive Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) |

---

## Agent API Reference

ShopBot exposes a clean, typed API for programmatic interaction.

### `POST /api/chat`
The main entry point for the AI agent. Supports both text and image inputs.

**Request Body:**
```json
{
  "session_id": "user-session-123",
  "message": "I'm looking for high-performance running shoes under $120.",
  "image_base64": null
}
```

**Response Example:**
```json
{
  "reply": "I found several options for you! The 'SpeedRunner Pro' and 'TrailMaster X' both fit your budget...",
  "products": [
    {
      "id": "prod_001",
      "name": "SpeedRunner Pro",
      "price": 89.99,
      "brand": "Swift",
      "image_url": "/images/speedrunner.jpg"
    }
  ],
  "tool_calls_made": ["search_products", "filter_by_price"]
}
```

### `POST /api/voice/transcribe`
Transcribes audio bytes using WebKit speech recgonition and Gemini's native multimodal audio understanding.
- **Accepts**: `multipart/form-data` with an `audio` file.
- **Returns**: `{"transcript": "...", "language": "en"}`

### `POST /api/voice/tts`
Converts text into natural-sounding speech audio.
- **Accepts**: `{"text": "Hello, how can I help you today?"}`
- **Returns**: `audio/wav` binary stream.

---

## 🏗 Technical Decisions & Architecture

### Gemini
I chose **Gemini 3.1 Flash** as the core engine because it offers a unique "all-in-one" multimodal capability. Unlike traditional stacks that require separate services for STT, TTS, and Vision, Gemini handles all three natively. This significantly reduces latency, simplifies the codebase, and keeps the project low-cost.

### Local vs. Cloud Hybrid
To optimize for cost and speed, I used a hybrid approach:
- **Cloud (Gemini)**: Handles complex reasoning, audio transcription, and natural language synthesis.
- **Local (CLIP + FAISS)**: Visual product similarity is processed locally using the `clip-ViT-B-32` model. This avoids sending large image batches to the cloud for every search.

### Agent Orchestration with LangGraph
Instead of a simple linear chain, ShopBot uses **LangGraph**. This allows the agent to loop back and call multiple tools in succession, maintaining a robust internal state. It enables prompts like "Refine my previous search" or "Compare that to the first one you showed me."

---

## Non-Functional Requirements & Resilience

- **Rate Limits**: The system handles Gemini's 15 RPM (Requests Per Minute) free tier by implementing backend retry logic.
- **Audio Hardening**: ShopBot includes specialized prompts, garbage detection, and fallback mechanisms to ignore background noise or silence, preventing the agent from hallucinating when no speech is present.

---

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4
- **Backend**: FastAPI, Pydantic v2
- **Agent**: LangChain, LangGraph, Google Generative AI
- **Search**: FAISS (Local Vector DB), CLIP (Image Embeddings)
- **Deployment**: Docker, Docker Compose