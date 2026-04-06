# Current Implementation

## Purpose

This document describes how the application is implemented today. It is intended for engineers and AI agents who need to enhance the product without rediscovering architecture, data flow, or current behavioral constraints from source code.

The document is based on the code currently in the repository, not on aspirational README language.

## Product Summary

Learning Progress Architect is a single-user learning workspace that supports:

- local email/password authentication
- onboarding into a learning goal
- roadmap generation with exactly three tasks
- AI-assisted workflow planning with task-level search queries
- optional learner-supplied study materials
- system-suggested learning references attached to tasks when AI search enrichment is available
- timed study sessions
- post-session comprehension capture
- review scheduling based on confidence
- dashboard, roadmap, progress, review, and reflection views

The current implementation is an MVP. It is cohesive and functional, but several behaviors are simplified and some product concepts are only partially implemented.

## Runtime Architecture

The app runs as a single Node process with two responsibilities:

1. Express API server
2. SPA host for the React client

### Entry Points

- `server.ts` loads `.env.local` through `dotenv` and starts the server from `server/index.ts`.
- `server/index.ts` runs database migration on startup, registers API routers, and serves either Vite middleware in development or static files from `dist` in production.

### Server Routing

The server mounts four route groups:

- `/api/auth`
- `/api/data`
- `/api/agent/workflow`
- `/api/tasks`

There is no separate BFF layer, no background worker, and no message queue. All writes happen synchronously inside the request lifecycle.

### Frontend Boot

- React uses `BrowserRouter`.
- Authentication state is inferred from a session object stored in browser local storage.
- Protected routes are client-enforced through `RequireAuth` in `src/App.tsx`.
- The app does not maintain a shared in-memory domain store. Most authenticated pages independently call `useAppData()`, which fetches the full workspace payload from `/api/data`.

## Tech Stack

### Frontend

- React 19
- React Router 7
- Vite 6
- Tailwind CSS 4
- Lucide icons

### Backend

- Express 4
- TypeScript
- `tsx` for local execution

### Persistence

- SQLite through `better-sqlite3`
- database file defaults to `app.db`
- overridable through `DATABASE_FILE`

### AI Integration

- Gemini via `@google/genai`
- model: `gemini-2.5-flash`
- workflow generation is a two-stage process:
	- task planning through Gemini JSON generation
	- optional search grounding through Gemini `googleSearch` to collect external learning links
- if `GEMINI_API_KEY` is not present, task planning falls back to a deterministic local planner and search hydration returns no suggested links
- if Gemini calls fail, the planner falls back locally and search hydration degrades to empty results without aborting workflow creation

## Codebase Structure

### Server-side

- `server/index.ts`: app startup and route registration
- `server/db.ts`: schema creation and lightweight additive migrations
- `server/middleware/auth.ts`: bearer token parsing and session lookup
- `server/routes/*.ts`: HTTP surface
- `server/services/*.ts`: auth, review scheduling, workflow planning, search hydration, syllabus utilities, workflow orchestration
- `server/utils/*.ts`: date helpers, validation, JSON error utility

### Client-side

- `src/App.tsx`: routing tree
- `src/hooks/useAppData.ts`: authenticated workspace fetch hook
- `src/lib/api.ts`: fetch wrapper, auth header injection, error normalization
- `src/lib/auth.ts`: local-storage session persistence
- `src/lib/preferences.tsx`: theme and locale context
- `src/lib/messages.ts`: i18n message catalog for English and Indonesian
- `src/pages/*.tsx`: page-level product surfaces
- `src/components/*`: layout and UI primitives

## Persistence Model

Database migration is handled in `server/db.ts`. The schema is append-oriented and migration logic is intentionally simple.

### Tables

#### `users`

- `id` TEXT primary key
- `name`
- `email` unique
- `password_hash`
- `created_at`

#### `auth_sessions`

- `token` TEXT primary key
- `user_id`
- `created_at`

Behavior notes:

- sessions are created on signup and login
- sessions are not revoked on sign-out; sign-out only clears browser storage
- there is no expiration policy or cleanup job

#### `goals`

- `id` INTEGER primary key
- `user_id`
- `title`
- `level`
- `hours`
- `target_date`
- `preferred_style`
- `resource_mode` default `needs_plan`
- `status` default `active`
- `created_at`

#### `tasks`

- `id` INTEGER primary key
- `user_id`
- `goal_id`
- `title`
- `description`
- `status`: `pending | in_progress | completed`
- `created_at`
- `completed_at`

#### `calendar_events`

- `id`
- `user_id`
- `task_id`
- `date`
- `duration`

These are generated schedule placeholders, not a real calendar integration.

#### `notes`

- `id`
- `user_id`
- `topic`
- `content`
- `kind`: `plan | note`
- `created_at`

Current usage:

- workflow generation creates two notes per goal
- one plan summary note
- one resource posture note

#### `study_sessions`

- `id`
- `user_id`
- `task_id`
- `started_at`
- `completed_at`
- `duration_seconds`
- `reflection`
- `confusion`
- `confidence`

#### `reviews`

- `id`
- `user_id`
- `task_id`
- `due_date`
- `priority`: `high | medium | low`
- `status`: `pending | completed`

Important current behavior:

- review rows are created or updated when a task is completed
- there is no route that marks a review as completed
- review UI effectively sends the learner back into the original task session

#### `resources`

- `id`
- `user_id`
- `goal_id`
- `title`
- `type`
- `reference`
- `notes`
- `source_kind` default `user_supplied`
- `created_at`

#### `task_resources`

- `id`
- `user_id`
- `task_id`
- `resource_id`
- `relevance_note`

Current linking behavior:

- user-provided resources are stored during workflow creation
- generated tasks are linked to learner-provided resources round-robin if at least one resource exists
- workflow generation may also persist system-suggested link resources with `source_kind = system_suggested`
- system-suggested resources are created per task from grounded search results and linked directly to that task

## Authentication Model

Authentication is local and session-token based.

### Signup

- `POST /api/auth/signup`
- validates name, normalized email, and password length >= 8
- hashes password with `crypto.scryptSync`
- inserts user
- inserts auth session token
- returns `{ token, user }`

### Login

- `POST /api/auth/login`
- verifies password using stored salt/hash format
- inserts a new auth session token
- returns `{ token, user }`

### Client Auth Behavior

- session object is stored under local storage key `learning-progress-architect.auth`
- `apiFetch()` automatically attaches `Authorization: Bearer <token>`
- any `401` response clears stored session on the client
- route protection is client-side only; the server still validates every protected request through `requireUser()`

### Current Limitations

- no logout endpoint
- no token rotation
- no session expiry
- no password reset flow
- no CSRF concern because auth is header-based, but there is also no hardened session management

## API Surface

### `GET /api/data`

Returns the full authenticated workspace payload:

- `user`
- `goals`
- `tasks`
- `events`
- `notes`
- `sessions`
- `reviews`
- `resources`
- `task_resources`

This is the primary read model for the entire frontend.

### `POST /api/agent/workflow`

Creates a new goal and initial learning structure.

Request fields:

- `goal`
- `level`
- `hours`
- `targetDate`
- `preferredStyle`
- `resourceMode`: `has_materials | needs_plan`
- `resources`: array of sanitized learner resources

Validation behavior:

- `goal` is required
- `hours` is clamped to at least 1
- if `resourceMode === has_materials`, at least one valid resource is required

Response:

- `201 { success: true, goalId }`

Implementation notes:

- the response is still minimal; the client reloads the resulting state through `GET /api/data`
- the workflow is fully planned before writes begin
- all persistence runs inside a single SQLite transaction
- if search grounding is available, task-specific system-suggested references are persisted alongside learner resources

### `POST /api/tasks/:taskId/start`

Behavior:

- verifies task ownership
- reuses an open study session if one exists
- otherwise creates a new session with `duration_seconds = 0`
- if task status is `pending`, updates it to `in_progress`

Response:

- `{ session }`

### `POST /api/tasks/:taskId/complete`

Behavior:

- verifies task ownership
- completes the open session if present, otherwise inserts a synthetic completed session
- persists `reflection`, `confusion`, `confidence`, and `durationSeconds`
- marks the task as `completed`
- creates or updates one review row for that task using confidence-based spacing

Review schedule logic:

- confidence `null`, `1`, or `2` -> 2 days, high priority
- confidence `3` -> 4 days, medium priority
- confidence `4` or `5` -> 7 days, low priority

Response:

- `{ success: true }`

## Workflow Generation Logic

The onboarding flow terminates in `runWorkflow()`, which now orchestrates planning, search hydration, and transactional persistence.

### Input Path

1. User completes four-step onboarding
2. Client posts workflow payload to `/api/agent/workflow`
3. Server sanitizes resource mode and resource list
4. `runWorkflow()` calls `generateWorkflowPlan()` to produce hydrated tasks
5. the server persists the goal, tasks, events, resources, links, and notes inside one transaction

### Planning Stage

`planSyllabusTasks()` always returns exactly three planned study items.

Two modes exist:

- Gemini-backed planning when `GEMINI_API_KEY` is available and the API succeeds
- deterministic fallback planning otherwise through `buildFallbackPlan()`

Each planned task includes:

- `title`
- `description`
- `searchQuery`

The fallback is important because it means the app is operable without AI access and still produces predictable search queries for downstream hydration.

### Search Hydration

`generateWorkflowPlan()` enriches each planned task by calling `searchLearningResources()` in parallel.

Search behavior:

- uses Gemini `googleSearch` grounding when `GEMINI_API_KEY` is present
- normalizes grounded web results into `SearchLink` objects with title, URL, and hostname source
- filters duplicate URLs and homepage-root links
- limits each task to at most three suggested references
- treats search as best-effort; failures return an empty reference list for that task

### Event Generation

`buildEventSchedule(taskCount, weeklyHours)`:

- starts scheduling from tomorrow at 19:00 local time
- spaces events using an integer gap derived from `7 / taskCount`
- sets duration by splitting weekly hours across task count
- clamps duration between 30 and 120 minutes

### Side Effects of Workflow Creation

For each new goal, the server creates:

- 1 goal row
- 3 task rows
- 3 calendar event rows
- 0..n learner resource rows
- 0..3 learner task-resource links
- 0..9 system-suggested resource rows
- 0..9 task-resource links for system suggestions
- 2 notes

All of these writes are wrapped in a single SQLite transaction. If any insert fails, the entire workflow setup rolls back.

## Frontend Application Model

### Routing

Unauthenticated routes:

- `/`
- `/login`
- `/signup`

Authenticated routes:

- `/onboarding`
- `/app`
- `/app/goals`
- `/app/roadmap`
- `/app/session/:id`
- `/app/comprehension/:id`
- `/app/reviews`
- `/app/progress`
- `/app/reflections`

### Shared Data Strategy

Most authenticated pages call `useAppData()` independently. That hook:

- checks local session presence
- fetches `/api/data`
- stores page-local `loading`, `error`, and `data`
- clears client session if the backend returns `401`

Implications:

- multiple page transitions trigger repeated full-payload fetches
- there is no client-side normalization or shared cache
- pages derive their own metrics from raw arrays

### Preferences and Localization

The app includes a lightweight preferences layer for:

- theme: `dark | light`
- locale: `en | id`

These values are stored in local storage and applied to `document.documentElement`.

The translation system is an in-repo message map, not an external i18n framework.

## Page-Level Behavior

### Landing

- marketing-style entry point
- no server data
- points users into sign-up or sign-in

### Auth Page

- supports login and signup modes
- performs minimal client validation
- stores returned auth session in local storage
- redirects signup to onboarding and login to dashboard

### Onboarding Page

Four-step wizard:

1. goal and level
2. hours and optional target date
3. preferred study style
4. resource mode and optional resource capture

Resource handling behavior:

- `needs_plan`: no resources required
- `has_materials`: at least one resource with a non-empty title required

On success, the page redirects to `/app`.

### Dashboard

Derived view over the full payload.

Key logic:

- active goal is always `data.goals[0]`
- current roadmap tasks are filtered from that goal
- next recommended task is first non-completed task
- study time and average confidence are calculated from completed sessions
- recent notes show the newest generated note rows

This page assumes a single active goal, even though the database allows many goals.

### Goals

- lists all goals
- computes per-goal progress from related tasks
- exposes a shortcut back to onboarding for creating another goal

Current mismatch:

- multiple goals can exist in storage
- most of the rest of the UI only treats the newest goal as active

### Roadmap

- shows only the newest goal as the active roadmap
- displays task status, linked material count, and progress
- allows starting any non-completed task

### Session

- looks up the task and related resources from full app data
- starts or resumes a study session through `/api/tasks/:taskId/start`
- maintains an in-browser timer while active
- includes a notes textarea that is not persisted anywhere
- completing the session navigates to comprehension check and passes `durationSeconds` in router state

Important limitation:

- if the page reloads before completion, the unsaved notes field is lost
- only the duration coming from router state is persisted on completion

### Comprehension

Three-step post-session flow:

1. explanation in own words
2. blockers or confusion
3. confidence score 1-5

Submitting this flow is what actually completes the task and writes the study session outcome.

### Reviews

- splits `pending` reviews into due and upcoming groups by date
- computes weak areas from lowest-confidence completed sessions
- review action routes back to `/app/session/:taskId`

Current behavior gap:

- starting a review does not create a review-specific experience
- there is no state transition that marks a review row complete

### Progress

Derived metrics page built entirely from existing tasks and completed sessions.

Metrics include:

- total study minutes
- completed tasks
- streak from session completion dates
- average confidence
- recent completed sessions

### Reflections

- lists completed sessions that have either reflection text or confusion text
- shows saved reflection, blockers, duration, and confidence

## Important Current Behaviors and Constraints

These are the main implementation facts that matter for enhancement work.

### 1. The frontend uses one large read endpoint

Most screens depend on `/api/data` and then filter arrays locally. This keeps the app simple, but it creates duplication, unnecessary network volume, and repeated derivation logic across pages.

### 2. The product model is partially multi-goal, but the UX is mostly single-active-goal

The database supports multiple goals per user. The dashboard, roadmap, progress, and other flows generally treat `goals[0]` as the active goal. Any enhancement that introduces explicit goal switching must touch both backend semantics and client assumptions.

### 3. Workflow creation is transactional, but AI enrichment is best-effort

The planner and search stages run before persistence begins. If planning falls back or search returns no results, the workflow still succeeds, but some or all system-suggested references may be absent.

### 4. Session notes in the study screen are not saved

The large notes textarea on the session page is currently UI-only. Reflections are persisted only through the comprehension flow.

### 5. Reviews are scheduled, but not fully lifecycle-managed

The app creates review rows, displays them, and routes the learner back into a task, but it does not mark review completion or distinguish first-pass study from spaced review.

### 6. Auth sessions accumulate indefinitely

Each login creates a new session row. There is no expiry, revocation, or cleanup.

### 7. Validation is intentionally lightweight

Validation exists for auth payloads, resource shape, resource mode, and goal presence, but there is no schema validation library, no richer domain validation, and no request typing shared across client and server.

## Existing Automated Coverage

There is a small Node test suite in `tests/api.test.ts`.

Current coverage focuses on:

- auth protection and structured auth errors
- workflow generation in `needs_plan` mode
- workflow generation in `has_materials` mode
- resource persistence and task-resource linking
- task start and task completion
- review creation after session completion

What is not covered:

- client rendering behavior
- multi-goal edge cases
- Gemini-backed search hydration and system-suggested resource persistence
- repeated review lifecycle
- preferences and localization behavior

## Enhancement Guidance

### High-leverage improvement areas

#### A. Introduce a real domain boundary around goals and active context

If the product will support multiple goals meaningfully, define one of these paths explicitly:

- true single-active-goal system with enforced activation semantics
- multi-goal system with explicit goal selection everywhere

Right now the code sits between both models.

#### B. Split `/api/data` into targeted read models or add client caching

If performance or complexity becomes an issue, start by deciding whether to:

- keep one payload but move to shared client caching/state
- or create narrower server endpoints for dashboard, roadmap, reviews, and progress

Doing neither will keep derivation logic duplicated.

#### C. Decide how system-suggested references should appear in the UI

The backend now persists AI-suggested task references into the existing resources model, but the frontend still treats resources mostly as supporting metadata. A useful next step is to make suggested references visible and clearly labeled by provenance.

#### D. Separate study sessions from review sessions

If reviews matter as a product feature, introduce:

- a review completion path
- review-specific session semantics
- review status updates
- possibly distinct metrics for first-pass learning vs reinforcement

#### E. Persist in-session notes deliberately

Decide whether the session notes field should:

- autosave into `notes`
- save into `study_sessions`
- or be removed to avoid suggesting persistence that does not exist

#### F. Harden authentication and session lifecycle

Likely next steps:

- logout endpoint
- session expiry
- optional session pruning
- password reset or account management if the app moves beyond MVP

## Suggested Mental Model For Future Changes

When changing the system, treat it as three connected loops:

1. Planning loop: goal -> tasks -> events -> notes/resources
2. Execution loop: task -> session start -> comprehension -> task completion
3. Reinforcement loop: confidence -> review scheduling -> future revisit

Most product enhancements fall into one of those loops. Problems usually appear when a change modifies one loop but not the others.

## Known Mismatches Between UI And Implementation

- The session page implies note capture during study, but those notes are not persisted.
- The reviews page implies review workflow maturity, but reviews are only scheduled and displayed, not completed.
- The goals page suggests multi-goal support, but the main experience largely assumes the newest goal is the active one.
- The README describes the product correctly at a high level, but some implementation details there are outdated relative to the current code.

## Local Development Notes

### Commands

- `npm run dev`: runs the Express server through `tsx`, with Vite middleware in development
- `npm run build`: builds the frontend
- `npm run start`: starts the production server
- `npm test`: runs Node tests
- `npm run lint`: runs `tsc --noEmit`

### Environment

- `.env.local` is loaded on startup
- `GEMINI_API_KEY` enables Gemini syllabus generation
- `DATABASE_FILE` overrides the SQLite path
- `PORT` controls the server port

## Summary

The current app is a compact full-stack TypeScript MVP with a clean enough architecture for enhancement work, but several semantics are still implicit rather than formalized. The most important issues to keep in mind are the single-payload frontend data model, the partial multi-goal story, the best-effort AI enrichment path around workflow creation, and the incomplete review lifecycle.
