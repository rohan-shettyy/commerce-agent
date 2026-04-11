---
trigger: always_on
---

Repository Structure (Final State)

commerce-ai-agent/
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Settings via pydantic-settings
│   ├── catalog/
│   │   ├── products.json        # Predefined product catalog (30+ items)
│   │   └── loader.py            # Catalog parsing + FAISS index builder
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── agent.py             # LangChain agent definition (Gemini)
│   │   ├── tools.py             # All agent tools
│   │   └── memory.py            # Per-session conversation memory
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── chat.py          # POST /api/chat
│   │   │   ├── search.py        # POST /api/search/image
│   │   │   └── voice.py         # POST /api/voice/transcribe
│   │   └── models.py            # Pydantic request/response schemas
│   └── utils/
│       ├── embeddings.py        # CLIP image embedding helpers
│       └── logger.py            # Structured logging
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── types/
        │   └── index.ts
        ├── api/
        │   └── client.ts         # Axios API client with typed methods
        ├── hooks/
        │   ├── useChat.ts
        │   ├── useVoice.ts
        │   └── useImageSearch.ts
        ├── components/
        │   ├── layout/
        │   │   ├── AppShell.tsx
        │   │   └── Sidebar.tsx
        │   ├── chat/
        │   │   ├── ChatWindow.tsx
        │   │   ├── MessageBubble.tsx
        │   │   ├── InputBar.tsx
        │   │   └── TypingIndicator.tsx
        │   ├── products/
        │   │   ├── ProductCard.tsx
        │   │   ├── ProductGrid.tsx
        │   │   └── ProductModal.tsx
        │   ├── voice/
        │   │   └── VoiceButton.tsx
        │   └── image/
        │       └── ImageUpload.tsx
        └── styles/
            └── globals.css