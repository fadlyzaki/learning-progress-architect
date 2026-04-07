# ADK Service Scaffold

This folder contains the Python service boundary for the future ADK-based agent layer.

Current status:

- The Express app remains the public API.
- `AGENT_PROVIDER=legacy` is still the default and keeps all existing behavior in-process.
- `AGENT_PROVIDER=adk` will route workflow planning and study coaching requests to this Python service through `ADK_SERVICE_URL`.
- The service is scaffolded with FastAPI and is intended to evolve into the full ADK orchestration layer.

## Expected endpoints

- `POST /workflow/plan`
- `POST /study-coach/quick-action`
- `GET /healthz`

## Local run example

```bash
cd adk_service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8081
```

## Intended evolution

1. Replace the fallback logic in `app/main.py` with real ADK agents.
2. Consume the internal MCP server from this service for trusted reads and writes.
3. Add tracing, prompt/version management, and richer retrieval against AlloyDB AI.
