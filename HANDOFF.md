# GCP Handoff: Learning Progress Architect

## Current Repo State

- `production` and `ui-ux-improvement` both point to commit `75fe92d3ff59def55bc45cfe68346f0928403a3a`

## What Is Already Implemented

- Provider-based storage seam
  - `DB_PROVIDER=sqlite|alloydb`
  - SQLite and Postgres repository implementations are in place
- Postgres migration scaffolding
  - `migrations/001_initial_schema.ts`
  - `migrations/002_agent_runtime_and_retrieval.ts`
  - `node-pg-migrate.config.cjs`
- SQLite to Postgres import script
  - `server/scripts/importSqliteToPostgres.ts`
- Agent routing seam
  - `AGENT_PROVIDER=legacy|adk`
  - fallback from ADK to legacy is already implemented
- Internal MCP server scaffold
  - `server/mcp/index.ts`
- Python ADK service scaffold
  - `adk_service/app/main.py`
- Tracing and retrieval persistence
  - `agent_runs`
  - `agent_run_events`
  - `retrieval_sources`
  - `document_embeddings`
- Public API remains unchanged
  - `POST /api/agent/workflow`
  - `POST /api/tasks/:taskId/quick-action`
  - `GET /api/data`

## What Still Needs GCP Credentials / Infra Work

1. Create AlloyDB cluster, instance, database, and user.
2. Set up private connectivity from Cloud Run to AlloyDB.
3. Create and deploy 3 services:
   - public Node app
   - internal MCP service
   - internal Python ADK service
4. Store and wire secrets:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `VERTEX_PROJECT_ID`
   - any AlloyDB-specific values if needed
5. Run Postgres migrations:
   - `npm run db:migrate:alloydb`
6. Import SQLite data if needed:
   - `npm run db:import:sqlite`
7. Deploy the public app first with:
   - `DB_PROVIDER=alloydb`
   - `AGENT_PROVIDER=legacy`
8. Verify production works on AlloyDB before enabling ADK.
9. Deploy MCP and ADK services.
10. Switch the public app to:
   - `AGENT_PROVIDER=adk`
   - `ADK_SERVICE_URL=<internal-adk-url>`
11. On the ADK side, set:
   - `MCP_BASE_URL=<internal-mcp-url>`
12. After stable rollout, optionally enable AlloyDB AI / embedding retrieval.

## Important Environment Variables

- `DB_PROVIDER`
- `DATABASE_URL`
- `DATABASE_FILE`
- `AGENT_PROVIDER`
- `ADK_SERVICE_URL`
- `MCP_PORT`
- `MCP_BASE_URL`
- `VERTEX_PROJECT_ID`
- `ALLOYDB_INSTANCE`
- `ALLOYDB_DATABASE`
- `ALLOYDB_USER`

See `.env.example` for the current expected shape.

## Helpful Files

- `.env.example`
- `server/appContext.ts`
- `server/mcp/index.ts`
- `adk_service/app/main.py`
- `server/scripts/importSqliteToPostgres.ts`
- `migrations/001_initial_schema.ts`
- `migrations/002_agent_runtime_and_retrieval.ts`

## Local Verification Already Done

- `npm run lint`
- `npm test`
- `python3 -m py_compile adk_service/app/main.py`

## Recommended Rollout Order

1. AlloyDB plus migrations
2. Public app on AlloyDB with legacy agent mode
3. MCP service
4. ADK service
5. Switch `AGENT_PROVIDER=adk`
6. Enable retrieval / AlloyDB AI later
