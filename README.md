# Learning Progress Architect

Learning Progress Architect is a guided learning workspace that turns a vague goal into a structured roadmap, scheduled study tasks, comprehension checks, and adaptive review loops.

The current product is optimized for a single learner working through a private study plan. It combines a React front end, an Express API, SQLite persistence, and Gemini-backed syllabus generation with a local fallback path when AI is unavailable.

The product voice and interface are shaped by a simple design belief: software logic should meet human intuition, not fight it. The goal is not to add cleverness. The goal is to tame complexity and free up mental bandwidth when it matters most.

## What It Does

- Authenticates a learner with email and password
- Guides new users through onboarding to define a goal, time budget, and learning style
- Generates a three-step roadmap and schedules initial study events
- Presents a dashboard with the next recommended task
- Runs task-based study sessions with a timer
- Captures comprehension, blockers, and confidence after each session
- Schedules future reviews based on learner confidence
- Tracks progress, reflections, and review workload across the learning journey

## Design Philosophy

- Human by design
- Resilience over optimization
- Built for humans at their limit, not just their peak
- Interfaces should scaffold intent, not consume attention

## Current Product Flow

1. Sign up or sign in
2. Complete onboarding with a learning goal, level, weekly hours, and preferred study style
3. Generate a roadmap and view the active goal on the dashboard
4. Start the next task from the dashboard or roadmap
5. Finish the session with a comprehension check
6. Review progress, reflections, and scheduled follow-ups

## Tech Stack

- Frontend: React 19, React Router 7, Vite, Tailwind CSS 4
- Backend: Express running from the same Node service as the SPA host
- Database: SQLite via `better-sqlite3`
- AI integration: `@google/genai` with Gemini prompt generation and a deterministic fallback syllabus generator
- Language/tooling: TypeScript, `tsx`

## Architecture Overview

The app currently runs as a single Node service:

- `server.ts` starts the Express server, handles auth, persists learning data, generates the syllabus, and serves the SPA
- `src/App.tsx` defines the authenticated and unauthenticated routes
- `src/pages/*` contains the product surfaces for onboarding, dashboard, roadmap, sessions, reviews, progress, and reflections
- `src/hooks/useAppData.ts` loads the authenticated workspace payload from `/api/data`
- Browser local storage stores the auth session token used for authenticated `/api/*` requests

Persisted entities currently include:

- users
- auth sessions
- goals
- tasks
- calendar events
- notes
- study sessions
- reviews

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Update `GEMINI_API_KEY` in `.env.local`

4. Start the app:

   ```bash
   npm run dev
   ```

The development server runs the Express app, which also serves the Vite-powered frontend.

## Available Scripts

```bash
npm run dev
npm run lint
npm run build
```

- `npm run dev`: starts the Express + Vite development server
- `npm run lint`: runs `tsc --noEmit`
- `npm run build`: builds the frontend bundle with Vite

## Deploy to Google Cloud Run

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`) installed and authenticated
- A GCP project with Cloud Run and Container Registry APIs enabled

### Configuration

Set your GCP project ID before running any `make` commands:

```bash
export PROJECT_ID=your-gcp-project-id
export REGION=us-central1      # optional, defaults to us-central1
```

### Steps

1. Authenticate Docker with Google Container Registry:

   ```bash
   gcloud auth configure-docker
   ```

2. Build the Docker image and push it to GCR:

   ```bash
   make build-push PROJECT_ID=your-gcp-project-id
   ```

3. Deploy to Cloud Run:

   ```bash
   make deploy PROJECT_ID=your-gcp-project-id
   ```

4. Set required environment variables on the deployed service:

   ```bash
   gcloud run services update learning-progress-architect \
     --region us-central1 \
     --set-env-vars GEMINI_API_KEY=your-key,APP_URL=https://your-cloudrun-url
   ```

   The Cloud Run service URL is printed at the end of the `make deploy` output.

### Available Make Commands

| Command | Description |
|---|---|
| `make run` | Start the app locally (`npm run dev`) |
| `make build` | Build the Docker image |
| `make push` | Push the image to GCR |
| `make build-push` | Build and push in one step |
| `make deploy` | Deploy the image to Cloud Run |

## Environment Variables

### Required for AI generation

- `GEMINI_API_KEY`: used for Gemini syllabus generation

### Current behavior if missing

If `GEMINI_API_KEY` is not set, the server still works and falls back to a local syllabus generator so onboarding can continue without the external AI dependency.

## Repo Structure

```text
.
├── server.ts
├── src/
│   ├── App.tsx
│   ├── hooks/
│   ├── lib/
│   ├── components/
│   └── pages/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Current Limitations

- Authentication is implemented with local session token storage in the browser
- SQLite is used for local persistence and has not been replaced with a production database yet
- Error handling is functional but still lightweight in several flows
- There is no automated test suite yet
- There is no production cloud deployment implementation yet

## Development Notes

- The repo currently reflects a working local MVP rather than a production-hardened SaaS platform
- The product and interface language are intentionally framed around a personal learning system called "Architect"
- Documentation and private planning artifacts can evolve independently as the project moves toward Google Cloud deployment
