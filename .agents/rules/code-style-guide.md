---
trigger: always_on
---

Code Style Rules (Enforce in Every Step)
General
All files have a top-level docstring or module comment explaining their purpose

No file exceeds 300 lines; extract helpers/sub-modules if it does

No magic strings — use constants or enums

All TODO comments include a ticket/issue reference format: # TODO(agent): description

Python (Backend)
Follow PEP 8; use ruff as linter (include in requirements.txt)

All functions have type annotations and docstrings (Google style)

Use pydantic models for all data that crosses a boundary

Never use bare except:; always catch specific exceptions

Async all the way: all FastAPI route handlers must be async def

Log at the right level: DEBUG for trace, INFO for milestones, WARNING for recoverable issues, ERROR for failures

TypeScript (Frontend)
Strict TypeScript ("strict": true in tsconfig.json)

No any type — use unknown + type guards, or define proper interfaces

Custom hooks for all stateful logic (never inline useState/useEffect in components)

Components are pure and receive all data through props or context; no direct API calls in components

All async operations wrapped in try/catch with user-visible error state