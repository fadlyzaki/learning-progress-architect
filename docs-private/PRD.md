# Learning Progress Architect PRD

## Product Summary

Learning Progress Architect is a private learning workspace for self-directed learners who want more structure than a notes app and less overhead than a full LMS. The product turns a broad goal into an actionable roadmap, guides the learner through focused study sessions, captures understanding at the end of each session, schedules review work based on confidence, and keeps the resulting knowledge exportable as Markdown.

The current version is a submission-oriented MVP centered on a single-user experience with guest-first access, optional authenticated access, PostgreSQL-backed persistence, AI-assisted planning, grounded AI-assisted study-material suggestions, Markdown export, and a calmer product-first interface.

The product language should stay product-first: software logic should meet human intuition, reduce friction, and free up mental bandwidth instead of consuming it.

## Positioning

Learning Progress Architect sits between informal self-study and rigid curriculum software:

- More structured than ad hoc note-taking and bookmark collections
- More personal and adaptive than static courses
- More execution-oriented than generic goal trackers

## Target User

The primary user is a self-directed learner who:

- Has a clear or semi-clear learning goal
- Wants a realistic plan instead of a motivational dashboard
- Needs help maintaining momentum and review discipline
- Values visible progress and reflection

Typical examples:

- A developer learning a new framework
- A knowledge worker building competence in a new domain
- A motivated hobbyist building a long-term study habit

## Core Jobs To Be Done

1. Define a learning goal and turn it into a realistic plan
2. Bring existing learning resources into that plan when they already exist
3. Get guided starting points when no learning resources exist yet
4. Know exactly what to study next
5. Complete a focused session without losing context
6. Assess what was actually understood
7. Revisit weak material at the right time
8. See progress and past reflections in one place

## Core User Flows

### 1. Entry

- User can start instantly as a guest
- User can optionally create an account with name, email, and password
- User can return and sign in to the same workspace later

### 2. Onboarding

- User defines a learning goal
- User selects current level
- User sets weekly time availability
- User optionally sets a target date
- User chooses a preferred learning style
- User indicates whether they already have learning resources
- If yes:
- User can provide resources such as links, notes, book titles, course names, docs, or pasted material
- System uses those resources as planning inputs and anchors the roadmap around them
- If no:
- System generates a roadmap from the goal alone
- System provides a recommended starting structure so the learner is not blocked by resource discovery
- System generates a roadmap and initial schedule

### 3. Dashboard

- User lands on an overview of the active goal
- System highlights the next recommended task
- User sees roadmap progress, notes, and key stats

### 4. Roadmap

- User sees the active goal broken into concrete tasks
- User can see which tasks are backed by provided resources versus system-generated guidance
- User can start the next recommended task from the roadmap

### 4.5. Materials

- User opens a dedicated Materials workspace
- User can add, edit, delete, and relink study materials after onboarding
- User can ask AI to suggest materials for the active goal
- User can save an AI suggestion directly or use it as a prefilled draft
- Suggested materials should be usable, not generic filler
- For common technical goals, suggestions should prefer trusted references and concrete study instructions

### 5. Session

- User starts a timed session for a specific task
- User can study against linked or referenced resources when available
- If no resources were provided, the task itself becomes the primary scaffold for what to study
- User works through the task and can use the page as an execution workspace

### 6. Comprehension

- User summarizes what they learned
- User records blockers or confusion
- User gives a confidence score
- System marks the task complete and schedules a follow-up review

### 7. Reviews

- User sees due and upcoming reviews
- User restarts task work from the review queue

### 8. Progress

- User sees aggregate study time, completion count, streak, and confidence
- User sees progress for the active goal and recent session history

### 9. Reflections

- User reviews saved reflections, blockers, and confidence from completed sessions

### 10. Export

- User exports the saved workspace as Markdown
- Export should include roadmap, materials, notes, sessions, and reviews
- Export should be easy to paste into Notion, Obsidian, or any Markdown-first tool

## Functional Requirements

### Authentication

- The system must support instant guest session creation
- The system must support user signup and login with email/password
- The system must protect application routes behind a valid session
- The system must scope persisted data to the current session user

### Goal Creation and Roadmap Generation

- The system must collect goal, level, weekly hours, target date, and preferred learning style
- The system must collect whether the learner already has study resources
- The system must support resource inputs including URLs, freeform text, book/course references, and notes
- The system must generate a three-step syllabus for a goal
- The system must bias roadmap generation toward learner-provided resources when they are present
- The system must still generate a usable roadmap when no resources are provided
- The system must support Gemini-backed generation when configured
- The system must support a fallback syllabus when Gemini is unavailable

### Resource Integration

- The system must let learners attach or reference existing resources during planning
- The system must let learners manage resources after onboarding from a dedicated workspace
- The system must preserve the relationship between a resource and the tasks it informs
- The system must distinguish between learner-supplied resources and system-suggested guidance
- The system must not require resources in order to create a roadmap
- The system must provide a no-resource path where each task includes enough context to begin studying
- The system should support later resource attachment after onboarding, so a learner can start lightweight and enrich the plan later
- The system should suggest starter materials for an active goal when the learner asks for help
- The system should prefer grounded, trusted sources when the goal matches common technical domains
- The system should personalize how to use each suggested source, not just list references

### Resource-Aware Product Behavior

- If the learner has resources:
- The roadmap should sequence those materials into a realistic order
- Task descriptions should reference the relevant resource or source context
- The session flow should surface the linked material as the primary study anchor
- If the learner does not have resources:
- The roadmap should act as a starter curriculum
- Task descriptions should include enough framing to reduce “what do I do now?” ambiguity
- The product should recommend what kind of resource would be useful next, even if it does not yet fetch or verify that resource automatically

### Planning and Scheduling

- The system must create tasks for the generated roadmap
- The system must create initial scheduled study events
- The system must distinguish between study events and review events
- The system must save a plan summary note

### Study Sessions

- The system must allow a user to start a task session
- The system must persist in-progress or completed study session data
- The system must support timed sessions
- The system must support quick AI help during a session
- The system must persist learner-written session notes when the session is completed

### Comprehension and Review

- The system must capture a learner reflection
- The system must capture blockers or confusion
- The system must capture a confidence score
- The system must schedule a review with priority based on confidence
- The system must provide explicit, client-side calendar template links for scheduling study blocks and review events without requiring restrictive OAuth scopes

### Reporting and History

- The system must display current roadmap progress
- The system must display accumulated study and completion metrics
- The system must display reflection history
- The system must display due and upcoming reviews

### Export and Portability

- The system must export saved learner state as Markdown
- The export must include goals, tasks, materials, notes, sessions, and reviews
- The export must work cleanly for guest and signed-in users

### Submission Architecture

- The system must expose a primary orchestrator agent coordinating specialized sub-agents
- The system must expose MCP-style task, scheduling, and notes tool coordination semantics
- The system must expose an API-readable capabilities surface for submission/demo verification
- The system must support API-based deployment on a cloud runtime
- The system must expose material CRUD and AI-suggestion endpoints through the API layer

### UX Requirements

- The interface must reduce setup friction for first-time users
- The guest path should be the fastest route into the core workflow
- The interface must keep the next recommended action visually prominent
- The interface must work cleanly on desktop and mobile
- Navigation must remain accessible on mobile without relying on hidden routes
- High-frequency surfaces should stay concise and avoid long explanatory blocks
- The product should feel general-purpose for self-directed learners rather than personally branded, while still providing clear developer attribution (e.g., global "Meet the Team" modal).
- The landing page must effectively establish trust via testimonials, visual cues (icons), and clear value propositions.
- Essential user flows (like authentication) must provide clear egress/back navigation to the main public site to prevent dead ends.
- Export and save actions should feel obvious and low-friction

## Non-Goals

The current version does not aim to support:

- Team learning or manager dashboards
- Course marketplace features
- Social, community, or sharing features
- Advanced analytics beyond basic progress and confidence summaries
- Real-time collaboration
- Multi-tenant enterprise administration
- Full content hosting or LMS-grade course delivery
- Automatic quality verification of third-party learning resources
- A marketplace of curated resources in the MVP

## MVP Success Metrics

- Goal creation completion rate
- Session completion rate
- Review return rate
- Weekly active learners

Supporting product health metrics:

- Percentage of signed-up users who complete onboarding
- Percentage of completed sessions with a saved confidence score
- Average number of completed tasks per active learner

## Current Risks and Gaps

- Session management is simple and relies on browser-local token storage
- Authentication still uses product-local auth/session mechanics rather than managed identity
- Gemini access still uses `GEMINI_API_KEY` rather than Vertex AI
- Test coverage exists for critical API flows, but not yet for browser-level UI behavior
- The deployment path is defined for Google Cloud, but a live cloud environment still needs to be provisioned
- Resource ingestion, deduplication, and trust-scoring are still lightweight beyond the current trusted-source map
- The product now supports learner-supplied and AI-suggested study materials, but broader domain coverage for grounded suggestions is still limited

## Near-Term Roadmap

### Priority 1

- ~~Harden session management~~ ✅ Fetch timeouts (30s ADK, 15s MCP internal) prevent indefinite hangs
- ~~Improve onboarding and session error states~~ ✅ Onboarding shows AI progress hints, session/roadmap surfaces inline errors
- ~~Auth race-condition guard~~ ✅ Signup handles DB-level UNIQUE constraint collisions gracefully
- ~~Google Calendar Integration~~ ✅ Implemented zero-friction explicit client-side Google Calendar templates instead of restrictive automated OAuth syncing
- Expand automated coverage beyond the current API test suite
- Improve cloud deployment verification and operational readiness
- Add a live Google Cloud deployment for submission/demo use
- Add browser-level UX verification for the core learner journey
- Improve Markdown export formatting options

### Priority 2

- Replace local auth/session mechanics with managed identity
- Replace Gemini API-key access with Vertex AI
- Add deployment environment separation
- Expand trusted-source coverage for AI material suggestions
- Improve quality and personalization of AI material suggestions

### Priority 3

- Improve roadmap richness beyond a fixed three-step structure
- Add stronger review UX and reminders
- Expand progress reporting with better goal-level insights
- Add smarter resource adaptation based on learner confidence, blockers, and completion behavior

## Licensing

- The repository should ship with an MIT License so GitHub recognizes the project as MIT-licensed
