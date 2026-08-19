# GCP & Platform Handoff: Learning Progress Architect

## Current Repo State

- Production branch: `production`
- Deployment options: **Google Cloud Run (3-service architecture)** and **Vercel (Serverless single-bundle execution)**.

## What Is Implemented & Operational

- **1-Click Live Demo & Guest Sandbox**:
  - `POST /api/auth/demo` and `POST /api/auth/guest` (`demoService.ts`)
  - Dedicated `/demo` launch page (`DemoLaunchPage.tsx`)
  - Pre-seeds realistic multi-phase workspace (*Distributed Systems & Cloud Architecture*) with completed sessions, in-progress tasks, cached quick actions, and scheduled reviews.
- **Provider-Based Storage Seam**:
  - `DB_PROVIDER=sqlite|alloydb`
  - SQLite and Postgres/AlloyDB repository implementations in place (`server/repositories/`).
  - In-memory / `/tmp` SQLite mode enabled for serverless execution.
- **Postgres / AlloyDB Migrations**:
  - `migrations/001_initial_schema.ts`
  - `migrations/002_agent_runtime_and_retrieval.ts`
  - `migrations/003_google_calendar_integration.ts`
  - Managed via `node-pg-migrate.config.cjs` (`npm run db:migrate:alloydb`).
- **Data Migration Tooling**:
  - SQLite to Postgres import script: `server/scripts/importSqliteToPostgres.ts`
- **Agent Routing Seam & Fallback**:
  - `AGENT_PROVIDER=legacy|adk`
  - Automatic fallback from ADK service to in-process Gemini or deterministic domain planners.
  - Strict 30s ADK / 15s MCP fetch timeouts.
- **Internal MCP Server**:
  - `server/mcp/index.ts` exposes 7 trusted tools over Streamable HTTP transport.
  - Hardened with shared `INTERNAL_SERVICE_TOKEN` verification.
- **Python ADK Service**:
  - `adk_service/app/main.py` FastAPI service handling `/workflow/plan` and `/study-coach/quick-action`.
  - Automated quick-action quality repair loop and locale-aware prompts.
- **Explicit Google Calendar Deep Linking**:
  - Client-side template generator (`src/lib/calendar.ts`) with direct task deep links (`/app/session/:taskId`).
- **Vercel Serverless Integration**:
  - `server/serverless.ts`, `api/index.js`, `vercel.json` for zero-configuration serverless cloud deployment.
- **Public API Contract**:
  - `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/demo`, `POST /api/auth/guest`
  - `POST /api/agent/workflow`
  - `POST /api/tasks/:taskId/start`, `POST /api/tasks/:taskId/complete`, `POST /api/tasks/:taskId/quick-action`
  - `GET /api/data`

## What Needs GCP Credentials / Production Cloud Infra Work

1. Create AlloyDB cluster, instance, database, and user.
2. Set up private connectivity (VPC connector) from Cloud Run to AlloyDB.
3. Deploy the three services via `Makefile`:
   - `web`: Public Express + React frontend container
   - `mcp`: Internal MCP tool service
   - `adk`: Internal Python ADK service
4. Configure Secret Manager / Cloud Run environment variables:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `INTERNAL_SERVICE_TOKEN`
   - `ADK_SERVICE_URL`
   - `MCP_BASE_URL`
   - `APP_BASE_URL`
5. Run Postgres migrations:
   ```bash
   npm run db:migrate:alloydb
   ```
6. (Optional) Import SQLite data:
   ```bash
   npm run db:import:sqlite
   ```
7. Deploy the public app first with:
   - `DB_PROVIDER=alloydb`
   - `AGENT_PROVIDER=legacy`
8. Verify production functionality on AlloyDB before enabling ADK.
9. Deploy MCP and ADK services and switch public app:
   - `AGENT_PROVIDER=adk`
   - `ADK_SERVICE_URL=<internal-adk-url>`
10. (Future) Enable AlloyDB AI vector search with `document_embeddings` and `retrieval_sources`.

## Important Environment Variables

| Variable | Values / Default | Purpose |
|---|---|---|
| `DB_PROVIDER` | `sqlite` \| `alloydb` | Selects database implementation |
| `DATABASE_URL` | Postgres URI | Connection string for AlloyDB |
| `DATABASE_FILE` | `app.db` | File path for SQLite persistence |
| `AGENT_PROVIDER` | `legacy` \| `adk` | Selects agent planner and study coach path |
| `ADK_SERVICE_URL` | `http://127.0.0.1:8081` | Python ADK service URL |
| `MCP_BASE_URL` | `http://127.0.0.1:3101` | MCP tool server URL |
| `MCP_PORT` | `3101` | MCP server listening port |
| `INTERNAL_SERVICE_TOKEN` | Secret String | Shared secret for `web <-> ADK <-> MCP` |
| `GEMINI_API_KEY` | Secret String | Google Gemini API key |
| `APP_BASE_URL` | Public App URL | Base URL for deep links |

## Key Files

- `server/serverless.ts` & `api/index.js`
- `server/services/demoService.ts`
- `server/mcp/index.ts`
- `adk_service/app/main.py`
- `src/lib/calendar.ts`
- `migrations/001_initial_schema.ts`
- `migrations/002_agent_runtime_and_retrieval.ts`
- `migrations/003_google_calendar_integration.ts`
- `Makefile` & `cloudbuild.*.yaml`

## Verification Commands

- TypeScript lint: `npm run lint`
- Automated test suite: `npm test`
- Python syntax check: `python3 -m py_compile adk_service/app/main.py`
- Serverless build: `npx esbuild server/serverless.ts --bundle --platform=node --target=node18 --outfile=api/index.js --external:better-sqlite3 --external:pg-native`
