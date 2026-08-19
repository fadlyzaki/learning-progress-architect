# Learning Progress Architect: Python ADK Service

This service provides the intelligent agent orchestration layer for **Learning Progress Architect**, executing curriculum planning and in-session study coaching via Google's Agent Development Kit (ADK) conventions and the Google GenAI SDK.

## Architecture & Responsibilities

- **FastAPI Core**: Lightweight, high-throughput asynchronous HTTP service.
- **Workflow Planning (`POST /workflow/plan`)**:
  - Compiles learner inputs (goal, level, pace, style, materials) into a 3-step structured milestone roadmap using `gemini-2.5-flash`.
  - Automatically queries the internal MCP tool server (`search_learning_resources`) to ground each generated task in verified official documentation and study materials.
  - Injects target language instructions when `locale: "id"` is specified.
  - Provides deterministic, domain-tailored fallback generation if external LLM quota is constrained.
- **In-Session Study Coach (`POST /study-coach/quick-action`)**:
  - Orchestrates four discrete quick actions: `explain`, `example`, `analogy`, `confused` (ELI5 first principles).
  - Queries MCP tool `get_cached_quick_action` first to avoid redundant LLM calls.
  - Calls MCP tool `get_task_context` to pull real-time task objectives and linked reference materials.
  - Generates rich, contextual study guidance with automated quality verification (`is_low_quality_quick_action` checking length, terminal punctuation, fragment detection, and template phrases) and triggers automatic repair prompts when necessary.
  - Persists completed quick action output via MCP tool `save_quick_action`.
- **Security**:
  - Protected via `x-internal-service-token` header validation matching the configured `INTERNAL_SERVICE_TOKEN`.
  - Health check endpoint at `/healthz`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/workflow/plan` | Generate grounded 3-step starter syllabus with search references |
| `POST` | `/study-coach/quick-action` | Generate/retrieve contextual study coaching guidance |
| `GET` | `/healthz` | Liveness health check |

## Local Development & Execution

```bash
cd adk_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Provision environment variables
export GEMINI_API_KEY="your-gemini-api-key"
export INTERNAL_SERVICE_TOKEN="your-shared-internal-token"
export MCP_BASE_URL="http://127.0.0.1:3101"

# Start the service
uvicorn app.main:app --host 0.0.0.0 --port 8081 --reload
```

## Docker Build & Deployment

Defined in `Dockerfile` and `cloudbuild.adk.yaml`:

```bash
# Build local container
docker build -t learning-architect-adk:v1 -f Dockerfile .

# Or deploy via Makefile helper
make deploy-demo-adk TAG=v1 INTERNAL_SERVICE_TOKEN="$INTERNAL_SERVICE_TOKEN" MCP_BASE_URL="$MCP_BASE_URL"
```
