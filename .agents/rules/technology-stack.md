---
trigger: always_on
---

Technology Stack (Mandated)
Layer	Technology	Rationale
Layer	Technology	Rationale
Frontend	React 18 + TypeScript + Vite	Fast HMR, strong typing, broad ecosystem
Styling	Tailwind CSS v4	Utility-first, consistent design tokens
Backend	FastAPI (Python 3.11+)	Async, fast, native Pydantic v2 validation
AI Orchestration	LangChain + langchain-google-genai	Native ChatGoogleGenerativeAI with tool-calling support
LLM	Google Gemini 2.0 Flash (free tier)	Best free-tier rate limits, multimodal (text + vision + audio), native function calling
STT	Gemini 2.0 Flash audio transcription (inline audio via API)	Free, no separate service, same API key — send audio bytes as inline part
TTS	Web Speech API (browser-native)	Free, zero latency, no API call needed
Image Embeddings	sentence-transformers CLIP (clip-ViT-B-32)	Free, local, Apache 2.0 license
Vector Store	FAISS (in-memory)	Free, local, no infrastructure
Image Vision	Gemini 2.0 Flash vision (inline image via API)	Free, same API key — send image bytes as inline part for similarity description
Product Catalog	Static JSON file	Keeps scope focused; predefined, controlled dataset
API Docs	FastAPI auto-generated /docs (Swagger UI)	Zero extra work
Containerization	Docker + docker-compose	Single command deployment
Do NOT deviate from this stack without a documented reason in the README. If a dependency is unavailable, note it explicitly and use the closest equivalent. Do NOT introduce OpenAI, Anthropic, Cohere, or any other paid AI provider.

