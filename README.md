# Learning Progress Architect: System Architecture

> **Product Philosophy:** *"Learning breaks down not because people lack ambition, but because the system around the ambition is unstable. This project is not just a planner or a chatbot. It is an operational layer for self-directed learning, where algorithmic structure meets human cognitive limits with as little friction as possible."*

Welcome to the source system of **Learning Progress Architect**: an AI-guided learning workspace that transforms a vague learning goal into a structured roadmap, focused study sessions, contextual assistance, and adaptive review loops.

This repository is not organized as a generic CRUD app. It is a workflow system designed around one core constraint: when people are learning something difficult, they should not also have to manually design, maintain, and debug their own study process.

[![Status](https://img.shields.io/badge/SYSTEM-DEMO%20LIVE-green?style=flat-square&logo=googlecloud)](https://cloud.google.com/run)
[![Runtime](https://img.shields.io/badge/ARCHITECTURE-WEB%20%E2%86%92%20ADK%20%E2%86%92%20MCP-blue?style=flat-square)](#architectural-topography--core-runtime)
[![Persistence](https://img.shields.io/badge/STORAGE-SQLite-orange?style=flat-square)](#current-system-boundaries)
[![Stack](https://img.shields.io/badge/STACK-React%20%2B%20Express%20%2B%20TypeScript-black?style=flat-square&logo=react)](#architectural-topography--core-runtime)

---

## Architectural Topography & Core Runtime

The current system is built as a workflow-native learning product with a public web layer, an orchestration layer, and an internal tool layer.

* **The Interface**: **React 19 + React Router 7 + Vite**  
  A multi-surface SPA covering onboarding, dashboard, roadmap, sessions, reviews, progress, and reflections.

* **The Public Runtime**: **Express + TypeScript**  
  The Node service remains the only user-facing backend. It owns auth, workspace reads, route orchestration, review scheduling, and the trusted application contract.

* **The Agent Layer**: **Python ADK Service**  
  Handles workflow planning and study-coach orchestration without changing the public app API.

* **The Tool Layer**: **Internal MCP Service**  
  Exposes trusted workspace operations such as task-context lookup, cached quick-action reads, quick-action persistence, workflow record creation, and resource search.

* **The Persistence Layer**: **SQLite via `better-sqlite3`**  
  Keeps the prototype lightweight and locally runnable, while the architecture prepares for AlloyDB-based durability later.

* **The Deployment Substrate**: **Cloud Run + Cloud Build**  
  The repo supports a deployed three-service demo topology: `web -> ADK -> MCP`.

---

## The Learning Loop

Learning Progress Architect is designed around one continuous loop rather than isolated productivity features:

1. A learner defines a goal, current level, weekly pace, and study style.
2. The system generates a three-step roadmap and schedules initial work.
3. Each task is paired with learner-provided or system-suggested resources.
4. The learner enters a focused study session with a timer and task objective.
5. During the session, the learner can request contextual help through quick actions like `explain`, `example`, `analogy`, and `confused`.
6. After the session, the learner records reflection, blockers, and confidence.
7. The system schedules the next review based on learning strength.

This means the product does not merely answer questions. It holds the operational shape of the study process itself.

---

## Sub-Systems & Product Surfaces

### 1. Guided Onboarding Engine
Captures the learner's goal, level, time budget, target date, preferred study style, and resource mode. This becomes the planning substrate for the first roadmap.

### 2. Workflow Planning Runtime
The public app calls an internal planner abstraction. In ADK mode, the request is routed to the Python service. In constrained environments, the system can still fall back to deterministic, context-aware planning so the learner is not blocked.

### 3. Session-Scoped Study Coach
The session page is not a generic note area. It is a constrained environment built around one task, one objective, and one active study state.

### 4. Quick Action Intelligence
In-session AI support is exposed as discrete actions rather than an open-ended chat box:
- `explain`
- `example`
- `analogy`
- `confused`

This keeps support tightly aligned to the current learning context instead of inviting unbounded conversational drift.

### 5. MCP Workspace Boundary
The MCP service acts as the trusted boundary for tool-based access to the learner workspace. It separates reasoning from system-owned reads and writes.

### 6. Reflection & Confidence Capture
Every finished session records what the learner understood, where they got stuck, and how confident they feel. Reflection is not treated as journaling fluff; it is operational input for retention.

### 7. Adaptive Review Scheduler
The review system converts confidence into timing. Topics with low confidence come back sooner. Stronger topics are spaced farther out.

### 8. Progress & Reflection Visibility
The learner can inspect task completion, study time, confidence trend, pending reviews, and past reflections through a single workspace payload.

---

## System Behavior Under Constraint

A resilient learning system should not collapse the moment an external model becomes constrained.

The current runtime is explicitly designed to degrade in layers:

- If ADK is unavailable, the public app can fall back to legacy in-process behavior.
- If Gemini quota is constrained, the system can still generate deterministic, context-aware fallback roadmap and quick-action content.
- Cached quick-action outputs are reused when appropriate to reduce repeated work and preserve continuity.

This matters because educational trust is not only about output quality. It is also about behavioral consistency when infrastructure is imperfect.

---

## Architectural Topology

```text
User
  -> React Frontend
    -> Express Web App
      -> SQLite
      -> ADK Service
         -> MCP Service
            -> Internal app-owned workspace operations
```

The public contract remains stable even as the internals evolve:

- `POST /api/agent/workflow`
- `POST /api/tasks/:taskId/quick-action`
- `GET /api/data`

That stability is intentional. The frontend should not need to care whether the intelligence path is legacy, ADK-backed, or eventually retrieval-enriched.

---

## Repo Topography

```text
.
├── server.ts
├── server/
│   ├── routes/
│   ├── services/
│   ├── repositories/
│   ├── middleware/
│   └── mcp/
├── adk_service/
│   └── app/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── pages/
├── docs/
├── tests/
├── package.json
├── Makefile
└── vite.config.ts
```

Important surfaces:

- [`server.ts`](/Users/fadly.zaki/Downloads/learning-progress-architect/server.ts): application entrypoint
- [`server/routes`](/Users/fadly.zaki/Downloads/learning-progress-architect/server/routes): public and internal HTTP boundaries
- [`server/services`](/Users/fadly.zaki/Downloads/learning-progress-architect/server/services): orchestration, agent runtime, planning, quick-action logic
- [`server/mcp`](/Users/fadly.zaki/Downloads/learning-progress-architect/server/mcp): MCP server and app-backed tool bridge
- [`adk_service/app/main.py`](/Users/fadly.zaki/Downloads/learning-progress-architect/adk_service/app/main.py): Python ADK runtime
- [`src/pages`](/Users/fadly.zaki/Downloads/learning-progress-architect/src/pages): learner-facing product surfaces

---

## Product Surfaces

Current user-facing screens include:

- Landing page
- Login / signup
- Onboarding
- Dashboard
- Roadmap
- Session
- Comprehension
- Reviews
- Progress
- Reflections
- Goals

The system is intentionally shaped like a guided workspace, not a feature buffet.

---

## Local Ignition Protocol

### Prerequisites

- Node.js 18+
- npm

### Setup

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create a local environment file.

   ```bash
   cp .env.example .env.local
   ```

3. Add the environment values you need. At minimum:
   - `GEMINI_API_KEY`
   - `INTERNAL_SERVICE_TOKEN`

4. Start the local app.

   ```bash
   npm run dev
   ```

The development server runs the Express app, which also serves the Vite-powered frontend.

---

## Runtime Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run mcp:start
npm run mcp:dev
npm run db:migrate:alloydb
npm run db:import:sqlite
```

Command map:

- `npm run dev`: start the local Express + frontend runtime
- `npm run build`: build the frontend bundle
- `npm run start`: run the production Node server locally
- `npm run lint`: run TypeScript checking
- `npm run test`: execute the Node test suite
- `npm run mcp:start`: run the MCP server in production mode
- `npm run mcp:dev`: run the MCP server in development mode
- `npm run db:migrate:alloydb`: run Postgres migrations
- `npm run db:import:sqlite`: import SQLite data into Postgres

---

## Deployment Protocol & Cloud Run Demo Stack

The repo supports a three-service Cloud Run demo rollout:

- public web app
- internal MCP service
- internal ADK service

### Default deployment helpers

```bash
make build
make build-mcp
make build-adk
make deploy
make deploy-mcp
make deploy-adk
make deploy-demo-web
make deploy-demo-mcp
make deploy-demo-adk
make deploy-demo-web-adk
```

Important `Makefile` variables:

- `PROJECT_ID`
- `REGION`
- `TAG`
- `INTERNAL_SERVICE_TOKEN`
- `APP_BASE_URL`
- `ADK_SERVICE_URL`
- `MCP_BASE_URL`
- `GEMINI_SECRET`

For the current demo rollout guide, see [docs/cloud-run-demo-production.md](/Users/fadly.zaki/Downloads/learning-progress-architect/docs/cloud-run-demo-production.md).

---

## Environment Topology

### Core variables

- `GEMINI_API_KEY`  
  Used for Gemini-backed roadmap and quick-action generation.

- `INTERNAL_SERVICE_TOKEN`  
  Shared token used for `web -> ADK -> MCP -> internal app routes`.

- `DB_PROVIDER`  
  Current options include `sqlite` and `alloydb`.

- `DATABASE_FILE`  
  SQLite file path for local or demo runtime.

- `DATABASE_URL`  
  Postgres connection string for AlloyDB/Postgres-backed operation.

- `AGENT_PROVIDER`  
  Current options include `legacy` and `adk`.

- `ADK_SERVICE_URL`
- `APP_BASE_URL`
- `MCP_BASE_URL`

### Behavioral notes

- If `GEMINI_API_KEY` is missing or quota is constrained, the system still attempts to return useful fallback content rather than failing immediately.
- If `INTERNAL_SERVICE_TOKEN` is missing, the MCP-backed path cannot authenticate internal requests.
- If `DB_PROVIDER=sqlite`, the app remains lightweight but not durable for multi-instance cloud persistence.

---

## Current System Boundaries

This project is live and operational as a demo stack, but it is important to describe the boundaries honestly:

- `SQLite` is still the current persistence layer
- SQLite on Cloud Run is not true durable multi-user storage
- `ADK` and `MCP` are already implemented in the demo architecture
- `AlloyDB` and `AlloyDB AI` are the next infrastructure step, not the current production data layer
- the system now degrades more gracefully under Gemini quota pressure, but quality still depends on external model availability when generation is requested

This is a meaningful difference between a cloud-hosted demo and a production-hardened platform.

---

## Near-Term Evolution Path

The architecture is already shaped for the next migration:

- move persistence from SQLite to AlloyDB
- preserve the current public API surface
- enrich retrieval and memory with AlloyDB AI
- strengthen service-to-service identity from shared tokens toward IAM-based auth
- improve agent reliability and richer roadmap depth

The important part is that these upgrades do not require changing the product philosophy. They are infrastructure upgrades to support the same workflow model at higher scale and durability.

---

## System Intent

Learning Progress Architect is built on a simple thesis:

People should spend their cognitive energy learning the subject, not maintaining the machinery around the learning.

That is the role of this system.

---

## License

This project is licensed under the MIT License. See [LICENSE](/Users/fadly.zaki/Downloads/learning-progress-architect/LICENSE) for the full text.

---

**Engineered by:** Fadly Uzzaki and Vedo Alfarizi  
*Learning is human. The system should behave accordingly.*
