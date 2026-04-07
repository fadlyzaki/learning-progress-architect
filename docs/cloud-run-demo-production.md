# Cloud Run Demo Production Guide

This repo can now run as a three-service demo stack on Cloud Run:

1. public web app
2. internal ADK service
3. internal MCP service

This guide assumes the current `sqlite` demo mode, not AlloyDB.

## 1. Build the three images

```bash
make build TAG=v1
make build-mcp TAG=v1
make build-adk TAG=v1
```

## 2. Choose one shared internal token

Use one strong shared secret for:

- web -> ADK
- ADK -> MCP
- MCP -> web internal routes

Example:

```bash
export INTERNAL_SERVICE_TOKEN='replace-this-with-a-long-random-secret'
```

## 3. Deploy the public web app first

Keep it on legacy mode until ADK and MCP are healthy.

```bash
make deploy-demo-web TAG=v1 INTERNAL_SERVICE_TOKEN="$INTERNAL_SERVICE_TOKEN"
```

This deploys the app with:

- `DB_PROVIDER=sqlite`
- `DATABASE_FILE=/tmp/app.db`
- `AGENT_PROVIDER=legacy`

Important:

- `/tmp/app.db` is acceptable for a demo but not durable production storage
- Cloud Run instance restarts can lose SQLite data
- this is only the staging path before AlloyDB

Optional:

- if you want Gemini-backed generation or grounded search, also set `GEMINI_API_KEY` on the web and MCP services after deploy

## 4. Get the public app URL

```bash
gcloud run services describe learning-architect-service \
  --region us-central1 \
  --format='value(status.url)'
```

Export it:

```bash
export APP_BASE_URL='https://YOUR_WEB_SERVICE_URL'
```

## 5. Deploy MCP

```bash
make deploy-demo-mcp \
  TAG=v1 \
  INTERNAL_SERVICE_TOKEN="$INTERNAL_SERVICE_TOKEN" \
  APP_BASE_URL="$APP_BASE_URL"
```

MCP is deployed with internal-only ingress and calls the app through `/internal/mcp/*`.

If you want grounded resource search results instead of the empty fallback, update MCP with:

```bash
gcloud run services update learning-architect-mcp-service \
  --region us-central1 \
  --set-env-vars GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

## 6. Get the MCP URL

```bash
gcloud run services describe learning-architect-mcp-service \
  --region us-central1 \
  --format='value(status.url)'
```

Export it:

```bash
export MCP_BASE_URL='https://YOUR_MCP_SERVICE_URL'
```

## 7. Deploy ADK

```bash
make deploy-demo-adk \
  TAG=v1 \
  INTERNAL_SERVICE_TOKEN="$INTERNAL_SERVICE_TOKEN" \
  MCP_BASE_URL="$MCP_BASE_URL"
```

ADK is deployed with internal-only ingress and authenticates to MCP using the shared token.

## 8. Get the ADK URL

```bash
gcloud run services describe learning-architect-adk-service \
  --region us-central1 \
  --format='value(status.url)'
```

Export it:

```bash
export ADK_SERVICE_URL='https://YOUR_ADK_SERVICE_URL'
```

## 9. Switch the web app to ADK mode

```bash
make deploy-demo-web-adk \
  INTERNAL_SERVICE_TOKEN="$INTERNAL_SERVICE_TOKEN" \
  ADK_SERVICE_URL="$ADK_SERVICE_URL"
```

At this point the request path becomes:

`browser -> web app -> ADK -> MCP -> web internal routes`

## 10. Smoke tests

Check:

- web: `GET /healthz`
- ADK: `GET /healthz`
- MCP: `GET /healthz`

Then test the app flows:

- sign up
- create workflow
- open a task
- request a quick action

Expected behavior:

- workflow route still works if ADK fails because the app keeps fallback logic
- quick actions should cache through MCP-backed persistence

## 11. Current limitations

- SQLite on Cloud Run is ephemeral and not durable
- MCP resource search still depends on `GEMINI_API_KEY` if you want grounded search results
- this is a demo production topology, not the final scalable storage architecture

The next storage step is still AlloyDB.
