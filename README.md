# Learning Progress Architect: System Architecture v1.0

> **Engineering Philosophy:** *"Learning breaks down not because people lack ambition, but because the system around the ambition is unstable. We do not build a planner or a chatbot. We engineer a resilient operational layer for self-directed learning — where algorithmic structure meets human cognitive limits with zero friction and zero excuses. Learning, by design."*

Welcome to the source matrix of **Learning Progress Architect** — a production-grade AI-guided learning workspace that compiles a vague learning goal into a structured roadmap, focused study sessions, contextual AI coaching, and adaptive review loops.

This repository is not organized as a generic CRUD application. It is a **workflow-native system** engineered around one core constraint: when people are learning something difficult, they must not also have to design, maintain, and debug their own study process. The architecture shoulders that operational weight so the learner does not have to.

[![Status](https://img.shields.io/badge/SYSTEM-DEMO%20LIVE-brightgreen?style=flat-square&logo=googlecloud)](https://cloud.google.com/run)
[![Runtime](https://img.shields.io/badge/ARCHITECTURE-Web%20→%20ADK%20→%20MCP-blue?style=flat-square)](#-architectural-topography--core-runtime)
[![Stack](https://img.shields.io/badge/STACK-React%2019%20%2B%20Express%20%2B%20TypeScript-black?style=flat-square&logo=react)](#-architectural-topography--core-runtime)
[![Persistence](https://img.shields.io/badge/STORAGE-AlloyDB-orange?style=flat-square)](#-environment-topology)
[![License](https://img.shields.io/badge/LICENSE-MIT-white?style=flat-square)](./LICENSE)

---

## 🏗 Architectural Topography & Core Runtime

A resilient system is measured by its fault tolerance, layered degradation, and capacity to preserve the user contract under infrastructure pressure. The stack is a strict three-tier orchestration model: a public web contract, an intelligent agent layer, and an internal tool boundary.

- **The Interface — React 19 + React Router 7 + Vite**
  A multi-surface SPA spanning 11 learner-facing product screens. Vite powers fast HMR and aggressive tree-shaking. React Router 7 handles client-side navigation across the full learning lifecycle.

- **The Public Runtime — Express + TypeScript**
  The Node service is the sole user-facing backend. It owns authentication, workspace reads, route orchestration, review scheduling, and the trusted application contract. The public API surface is intentionally stable so the frontend does not care whether the intelligence path is legacy, ADK-backed, or retrieval-enriched.

- **The Agent Layer — Python ADK Service**
  Handles workflow planning and study-coach orchestration via Google's Agent Development Kit (ADK). Isolated from the public runtime so intelligence upgrades do not touch the public API.

- **The Tool Layer — Internal MCP Service**
  Exposes trusted workspace operations via Model Context Protocol (MCP): task-context lookup, cached quick-action reads, quick-action persistence, workflow record creation, and resource search. Acts as the hardened boundary between AI reasoning and system-owned data mutations.

- **The Persistence Layer — AlloyDB via pg**
  Provides durable, highly-available cloud storage for workspaces and agent state. The public API contract remains stable on top of this layer.

- **The Deployment Substrate — Cloud Run + Cloud Build**
  Three-service production topology: `web → ADK → MCP`. CI pipelines defined in `cloudbuild.adk.yaml` and `cloudbuild.mcp.yaml`.

---

## ⚡ The Learning Loop

Learning Progress Architect is designed around one continuous operational loop rather than isolated productivity features:

1. A learner defines a goal, current level, weekly pace, target date, and preferred study style.
2. The system generates a structured roadmap and schedules initial work.
3. Each task is paired with learner-provided or system-suggested resources.
4. The learner enters a focused study session with a timer and a single task objective.
5. During the session, contextual AI coaching is available through four discrete **quick actions**: `explain`, `example`, `analogy`, `confused`.
6. After the session, the learner records reflections, blockers, and a confidence rating.
7. The system schedules the next review based on declared learning strength.

The system does not merely answer questions. It holds the **operational shape** of the study process itself.

---

## 🧬 Sub-Systems & Architectural Highlights

### 1. Guided Onboarding Engine (`OnboardingPage.tsx`)
Captures the learner's goal, experience level, time budget, target date, preferred study style, and resource mode. Every input becomes the planning substrate for the first roadmap generation. The onboarding flow is the system's primary data intake mechanism — designed to collect exactly the context the agent layer needs, nothing more.

### 2. Workflow Planning Runtime (`workflowService.ts`, `workflowAgentService.ts`)
The public app calls an internal planner abstraction. In ADK mode, requests route to the Python ADK service. In constrained environments (quota pressure, ADK unavailability), the system falls back to deterministic, context-aware planning via the `planners/` layer so the learner is never blocked. Provider switching is controlled by the `AGENT_PROVIDER` environment variable.

### 3. Session-Scoped Study Coach (`SessionPage.tsx`)
The session page is not a generic note area. It is a constrained environment built around one task, one objective, and one active study state. Timer, task objective, quick-action interface, and reflection capture are all co-located in a single focused surface.

### 4. Quick Action Intelligence (`quickActionService.ts`)
In-session AI support is exposed as four discrete actions rather than an open-ended chat interface:
- `explain` — plain-language breakdown of the current concept
- `example` — concrete real-world illustration
- `analogy` — cross-domain mental model transfer
- `confused` — step back and reframe from first principles

This keeps support tightly aligned to the current learning context and prevents unbounded conversational drift. Cached outputs are reused when appropriate to reduce repeated model calls and preserve response continuity.

### 5. MCP Workspace Boundary (`server/mcp/`)
The MCP service acts as the trusted boundary for tool-based access to the learner workspace. It separates AI reasoning from system-owned reads and writes. Operations exposed to the agent layer are enumerated and bounded — the agent cannot perform arbitrary data mutations.

### 6. Agent Runtime & Planner Abstraction (`agentRuntime.ts`, `agents/`, `planners/`)
A provider-agnostic agent runtime that routes to the correct backend based on configuration. The `agents/` layer contains ADK-backed orchestration logic. The `planners/` layer contains deterministic fallback implementations. Both satisfy the same internal contract.

### 7. Syllabus Intelligence (`syllabusService.ts`)
Generates and manages the structured learning roadmap from onboarding inputs. Responsible for roadmap initialization, task sequencing, and the mapping of learner context to a three-step learning arc.

### 8. Adaptive Review Scheduler (`reviewService.ts`)
Converts session confidence scores into review timing. Low-confidence topics return sooner. High-confidence topics are spaced further out. Review scheduling is the system's primary retention mechanism.

### 9. Semantic Resource Search (`searchService.ts`, `retrieval/`)
Supports resource discovery aligned to the learner's current task context. The `retrieval/` layer is architected for future enrichment with AlloyDB AI vector search, without breaking the current service interface.

### 10. Reflection & Confidence Capture (`ReflectionsPage.tsx`, `ComprehensionPage.tsx`)
Every finished session records what the learner understood, where they got stuck, and how confident they feel. Reflection is not journaling fluff — it is operational input for review scheduling and longitudinal progress visibility.

### 11. Progress & Workspace Visibility (`ProgressPage.tsx`, `DashboardPage.tsx`)
A single workspace payload exposes task completion, cumulative study time, confidence trends, pending reviews, and past reflections. The dashboard is the learner's operational control surface — not a vanity metrics screen.

### 12. Resilient Agent Routing (`agentRuntime.ts`)
The runtime is explicitly designed to degrade in layers. If ADK is unavailable, the public app falls back to the `legacy` provider path. If Gemini quota is constrained, the system returns deterministic, context-aware fallback content rather than failing immediately. Cached quick-action outputs are reused when available. All external service calls enforce strict fetch timeouts (30s for ADK, 15s for MCP internal routes) to prevent indefinite hangs when downstream services are unresponsive. The signup flow includes a DB-level UNIQUE constraint guard to prevent race-condition duplicate accounts.

### 13. Layered Authentication (`authService.ts`, `server/middleware/`)
Standard auth layer protecting the learner workspace. Internal service-to-service communication is secured via a shared `INTERNAL_SERVICE_TOKEN` propagated across the `web → ADK → MCP` call chain. Token-based auth is the current model; the evolution path moves toward IAM-based identity.

### 14. Goals Management (`GoalsPage.tsx`)
Allows learners to inspect, update, and reflect on their declared learning goals. Goals are the root node of the entire system — they anchor roadmap generation, session context, and review prioritization.

### 15. Client-Side Explicit Google Calendar Integration (`calendar.ts`)
Zero-friction, user-controlled calendar scheduling. Rather than requesting invasive OAuth scopes and maintaining automated sync loops, the system generates stateless Google Calendar templates. Learners click "Add to Calendar" on any generated study task, and the system pre-fills the task title, duration, and embeds direct deep-links (`/app/session/:taskId`) back into their workspace.

### 16. Instant 1-Click Live Demo Sandbox (`DemoLaunchPage.tsx`, `demoService.ts`)
Zero-friction evaluation sandbox. Evaluators, recruiters, and prospective learners can click "Live Demo" to instantly launch a pre-seeded, high-fidelity workspace (*Distributed Systems & Cloud Architecture*) containing completed tasks, active in-progress study sessions, cached AI quick actions, and scheduled reviews without registration.

### 17. Local-First In-Session Scratchpad & Note Ledger Sync (`SessionPage.tsx`, `ComprehensionPage.tsx`)
Zero-data-loss study environment. In-session notes are continuously auto-saved to browser storage on every keystroke with visual state indicators, seamlessly passed into post-session comprehension checks, and permanently written to the workspace `notes` ledger upon session completion.

### 18. Multi-Goal Operational Focus Switcher (`activeGoal.ts`, `Layout.tsx`, `GoalsPage.tsx`)
Enables autodidacts to pursue multiple independent learning goals simultaneously. The `useActiveGoal` hook provides a reactive, persistent active-focus layer allowing learners to switch roadmaps, dashboards, and upcoming milestones with a single click across the sidebar, dashboard, and goal cards.

---

## 📂 System Topography

The architecture follows a strict decoupled multi-layer pattern:

```text
.
├── server.ts                    # Application entrypoint (Container / Local)
├── api/
│   └── index.js                 # Compiled Vercel Serverless Function entrypoint
├── server/
│   ├── serverless.ts            # Express serverless handler wrapper
│   ├── routes/                  # Public and internal HTTP boundaries
│   ├── services/                # Orchestration, planning, quick-action, review, demo
│   │   ├── agents/              # ADK-backed agent orchestration
│   │   ├── planners/            # Deterministic fallback planners
│   │   └── retrieval/           # Resource search and future vector enrichment
│   ├── repositories/            # Multi-provider data access layer (SQLite / Postgres)
│   ├── middleware/              # Auth, internal token validation
│   ├── mcp/                     # MCP server and app-backed tool bridge
│   ├── config/                  # Runtime configuration
│   ├── utils/                   # Shared utilities
│   └── scripts/                 # Migration and import tooling
├── adk_service/
│   └── app/                     # Python ADK FastAPI runtime (main.py)
├── src/
│   ├── components/              # Layout, UI system, shared surfaces, Team modal
│   ├── hooks/                   # useAppData
│   ├── lib/                     # Shared client utilities (calendar, export, auth, i18n)
│   ├── data/                    # Client-side data definitions
│   └── pages/                   # 12 learner-facing product surfaces
├── docs-private/                # Architecture and deployment documentation
├── tests/                       # Node test suite
├── migrations/                  # Database migration scripts (001, 002, 003)
├── Makefile                     # Deployment and build helpers
├── vercel.json                  # Vercel serverless routing configuration
├── package.json
├── vite.config.ts
└── tsconfig.json
```

**Layer model:**

- **View Layer** — 12 product screens across the full learning lifecycle, from onboarding to deep-work sessions and live demo sandbox.
- **State Layer** — App data managed via `useAppData` hook and server-owned workspace payload.
- **Orchestration Layer** — Provider-agnostic agent runtime with ADK and legacy fallback paths.
- **Tool Boundary** — MCP service as the hardened interface between AI reasoning and workspace data.
- **Persistence Layer** — AlloyDB for durable, multi-instance cloud deployment.

---

## 🚀 Local Ignition Protocol

### Prerequisites

- Node.js 18+
- npm
- Python 3.11+ (for ADK service, optional in local mode)

### Setup

1. Provision dependencies.

   ```bash
   npm install
   ```

2. Create a local environment file.

   ```bash
   cp .env.example .env.local
   ```

3. Provision the required environment values. At minimum:
   - `GEMINI_API_KEY`
   - `INTERNAL_SERVICE_TOKEN`

4. Ignite the development runtime.

   ```bash
   npm run dev
   ```

The development server runs the Express app, which also serves the Vite-powered frontend. The system operates in `legacy` agent mode by default unless `AGENT_PROVIDER=adk` is set and a running ADK service is reachable.

---

## ⚙️ Runtime Commands

```bash
npm run dev              # Boot local Express + Vite frontend runtime
npm run build            # Compile frontend production bundle
npm run start            # Run production Node server locally
npm run lint             # TypeScript integrity check (tsc --noEmit)
npm run test             # Execute Node test suite
npm run mcp:start        # Run MCP server in production mode
npm run mcp:dev          # Run MCP server in development mode
npm run db:migrate:alloydb   # Run Postgres migrations via node-pg-migrate
npm run db:import:sqlite     # Import SQLite dataset into Postgres
```

---

## 🌐 Deployment Protocol & Cloud Run Demo Stack

The repo supports a three-service Cloud Run demo rollout:

- `web` — public Express + React application
- `mcp` — internal MCP tool server
- `adk` — internal Python ADK agent service

### Deployment helpers via Makefile

```bash
make build               # Build web Docker image
make build-mcp           # Build MCP Docker image
make build-adk           # Build ADK Docker image
make deploy              # Deploy web service to Cloud Run
make deploy-mcp          # Deploy MCP service to Cloud Run
make deploy-adk          # Deploy ADK service to Cloud Run
make deploy-demo-web     # Deploy web (demo configuration)
make deploy-demo-mcp     # Deploy MCP (demo configuration)
make deploy-demo-adk     # Deploy ADK (demo configuration)
make deploy-demo-web-adk # Deploy web wired to ADK (demo configuration)
```

**Key Makefile variables:**

| Variable | Purpose |
|---|---|
| `PROJECT_ID` | GCP project identifier |
| `REGION` | Cloud Run deployment region |
| `TAG` | Docker image tag |
| `INTERNAL_SERVICE_TOKEN` | Shared auth token across service chain |
| `APP_BASE_URL` | Public web service URL |
| `ADK_SERVICE_URL` | Internal ADK service URL |
| `MCP_BASE_URL` | Internal MCP service URL |
| `GEMINI_SECRET` | GCP Secret Manager reference for Gemini key |

For the full deployment runbook, see [`docs-private/cloud-run-demo-production.md`](./docs-private/cloud-run-demo-production.md).

---

## 🔑 Environment Topology

### Core Variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini-backed roadmap and quick-action generation |
| `INTERNAL_SERVICE_TOKEN` | Shared token for `web → ADK → MCP → internal app` auth chain |
| `DB_PROVIDER` | `sqlite` (default) or `alloydb` |
| `DATABASE_FILE` | SQLite file path for local or demo runtime |
| `DATABASE_URL` | Postgres connection string for AlloyDB-backed operation |
| `AGENT_PROVIDER` | `legacy` (default) or `adk` |
| `ADK_SERVICE_URL` | Internal ADK service endpoint |
| `APP_BASE_URL` | Public web service base URL |
| `MCP_BASE_URL` | Internal MCP service base URL |

### Behavioral Contract

- If `GEMINI_API_KEY` is missing or quota is constrained, the system attempts to return deterministic fallback content rather than failing immediately.
- If `INTERNAL_SERVICE_TOKEN` is absent, the MCP-backed path cannot authenticate internal requests and will reject all tool calls.
- If `DB_PROVIDER=sqlite`, the app is lightweight and locally runnable but not durable for multi-instance cloud persistence.
- If `AGENT_PROVIDER=legacy`, the Python ADK service is bypassed entirely — the system runs in-process.

---

## 🚧 Current System Boundaries

This system is live and operational as a production stack. These boundaries are stated honestly:

- **AlloyDB** is the current persistence layer—providing scalable, durable, multi-instance database access.
- **ADK and MCP** are fully implemented in the demo topology and operational under the right environment configuration.
- **AlloyDB AI** vector search is the next planned step for semantic enrichment, building on top of the current AlloyDB instance.
- **Gemini quota pressure** is handled via graceful degradation, but output quality still depends on external model availability when generation is actively requested.
- **Service-to-service identity** currently relies on a shared token — IAM-based identity is the planned evolution.

This is a meaningful distinction between a cloud-hosted proof of concept and a production-hardened platform.

---

## 🔭 Near-Term Evolution Path

The architecture is continuously evolving. No product philosophy changes are required — only infrastructure upgrades:

- Enrich retrieval and memory with **AlloyDB AI** vector search — semantically-aware resource discovery.
- Strengthen service-to-service identity from shared tokens toward **IAM-based auth**.
- Improve agent reliability and expand roadmap depth within the existing ADK orchestration layer.
- Raise review scheduling intelligence with longer-horizon confidence modeling.

The public API contract (`POST /api/agent/workflow`, `POST /api/tasks/:taskId/quick-action`, `GET /api/data`) remains stable across all of these upgrades. The frontend does not need to care about what changes behind it.

---

## 🗺 Architectural Topology

```text
User
  → React 19 + React Router 7 (Vite SPA)
    → Express + TypeScript (Public App)
      → AlloyDB (Persistence)
      → ADK Service (Python Agent Runtime)
         → MCP Service (Internal Tool Boundary)
            → App-Backed Workspace Operations
```

The public contract is intentionally stable:

- `POST /api/agent/workflow` — roadmap and workflow generation
- `POST /api/tasks/:taskId/quick-action` — in-session AI coaching
- `GET /api/data` — full workspace payload

That stability is the system's architectural commitment. Intelligence paths evolve behind it; the learner surface does not.

---

## License

This project is licensed under the MIT License. See [`LICENSE`](./LICENSE) for the full text.

---

**Engineered by:** Fadly Uzzaki and Vedo Alfarizi  
*Learning is a system problem. The architecture is the answer. © 2025–2026. All Rights Reserved.*
