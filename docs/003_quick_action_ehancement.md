# Quick Action Enhancement

## Goal

Implement the quick actions shown in `src/pages/SessionPage.tsx` so each action calls Gemini and returns contextual study help for the current session task.

The current UI already exposes four placeholders:

- Explain Simply
- Give an Example
- Use an Analogy
- I'm Confused

The enhancement should turn those placeholders into interactive actions without inventing a second study model outside the app's existing task, resource, and session flow.

## Current State

Based on `docs/current_implementation.md` and the current codebase:

- `SessionPage` renders four `UnavailablePrompt` rows in the quick action card. They do not make any API call yet.
- The frontend session page only has access to persisted app data from `GET /api/data`, plus local page state.
- The current persisted read model gives the page access to:
	- the selected task
	- the goal tied to that task
	- linked resources through `task_resources`
	- active and completed study sessions
- The server already uses Gemini through `@google/genai` in `syllabusService.ts` and `searchService.ts`, both on model `gemini-2.5-flash`.
- There is no existing endpoint for on-demand task explanation or study help.
- There is no table for storing quick action outputs or prompt history.

## Scope Recommendation

For the first implementation, quick actions should be generated on demand and persisted.

That means:

- generate content from the current task context when a quick action is requested for the first time
- store the generated result in the database
- reuse the stored result on later requests for the same task and action type
- show existing stored quick actions in `SessionPage` as action rows with either a generate or view control
- display quick action content in a modal instead of inline inside the card
- do not add background jobs, streaming, or multi-step agent orchestration yet

This fits the current architecture because the app already writes synchronously in the request lifecycle and already serves page state from persisted read models.

## Prompt Definitions

These are the prompt templates the feature should implement.

### Explain Simply

Explain [Concept] simply. Focus strictly on two things: 1. A high-level summary of what I am actually learning here, and 2. The specific objective or problem this solves. Skip the technical 'how-to' for now-just give me the 'what' and the 'why'.

### Give an Example

Provide a real-world case study for [Concept]. Focus on: 1. A specific industry or type of company that uses it, 2. The exact workflow or implementation details, and 3. The business impact (time saved, money earned, or errors prevented). Avoid generic examples-show me how a professional actually uses this in their daily work.

### Use an Analogy

Give me a universal analogy for [Concept] that anyone-regardless of their technical background-can understand. Use a common daily activity (like grocery shopping, driving, or household chores) to illustrate how it works. Focus on making the invisible logic of the concept visible through this story.

### I'm Confused

I am lost on [Concept]. Please reset and explain this to me like I am an elementary school student. Break it down into tiny, simple steps. Use 'first, then, finally' logic, and tell me a story where I am the main character interacting with this concept. No big words allowed.

## Concept Mapping

The current note says `Concept` refers to `HydratedTask`, but the frontend does not currently receive a `HydratedTask` object directly.

What the session page actually has is a task plus related goal and linked resources reconstructed from `GET /api/data`.

For implementation, the server should build a quick action context from the current task view instead of depending on the server-side `HydratedTask` type existing on the client.

Recommended context payload assembled on the server:

- task title
- task description
- goal title
- learner-attached resources for the task
- system-suggested resources for the task, if any

This keeps the feature aligned with the current read model and avoids leaking internal planning types into the client contract.

## Proposed API

Add a dedicated endpoint for quick actions under the existing task route group.

Recommended endpoint:

- `POST /api/tasks/:taskId/quick-action`

Recommended request body:

```json
{
	"action": "explain" | "example" | "analogy" | "confused"
}
```

Recommended response body:

```json
{
	"action": "explain",
	"content": "...generated text...",
	"source": "cache" | "generated",
	"updatedAt": "2026-04-07T10:00:00.000Z"
}
```

Why this shape fits the current app:

- task ownership and auth checks already exist in `server/routes/tasks.ts`
- the action is clearly tied to one task
- the frontend can call it with the existing `apiFetch()` helper
- the response can indicate whether the result came from storage or a fresh Gemini call

## Server Design

### 1. Add a quick action service

Create a new service such as `server/services/quickActionService.ts`.

Responsibilities:

- map action ids to prompt templates
- build the contextual prompt for the selected task
- call Gemini with `gemini-2.5-flash`
- normalize the returned text
- return persisted content immediately when it already exists for the same task and action

Recommended types:

```ts
export type QuickActionKind = 'explain' | 'example' | 'analogy' | 'confused';

export type QuickActionContext = {
	taskTitle: string;
	taskDescription: string;
	goalTitle: string | null;
	resources: Array<{
		title: string;
		type: string;
		reference: string | null;
		notes: string | null;
		sourceKind: 'user_supplied' | 'system_suggested';
	}>;
};

export type QuickActionRecord = {
	id: number;
	user_id: string;
	task_id: number;
	action: QuickActionKind;
	content: string;
	created_at: string;
	updated_at: string;
};
```

### 2. Keep prompts in code, not in markdown parsing

The prompts in this document should remain the product spec.

The runtime implementation should define a code constant keyed by action id, for example:

```ts
const QUICK_ACTION_PROMPTS: Record<QuickActionKind, string> = {
	explain: '...',
	example: '...',
	analogy: '...',
	confused: '...',
};
```

The app should not parse this markdown file at runtime.

### 3. Build a context-rich prompt

Before calling Gemini, the service should expand `[Concept]` into a concise session-specific brief.

Recommended prompt structure:

1. System instruction that fixes tone and output boundaries.
2. Action-specific template from this document.
3. Session context:
	 - goal
	 - task title
	 - task description
	 - available resources
4. Output instruction to return plain study-ready text.

Recommended context format:

```text
Goal: Learn React fundamentals
Task title: Foundations of React state
Task description: Build the mental model, vocabulary, and first principles for React state.
Resources:
1. React docs - State: A Component's Memory
2. React docs - Responding to Events
```

This is more reliable than substituting only the raw task title into `[Concept]`.

### 4. Persistence model

Quick action output should be stored in the database so repeated requests do not call Gemini again for the same task and action.

Recommended new table:

```sql
CREATE TABLE quick_actions (
	id INTEGER PRIMARY KEY,
	user_id TEXT NOT NULL,
	task_id INTEGER NOT NULL,
	action TEXT NOT NULL,
	content TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	UNIQUE(user_id, task_id, action)
);
```

Recommended behavior:

- one task can have up to four persisted quick action rows
- one row per action type: `explain`, `example`, `analogy`, `confused`
- `content` stores the raw markdown-capable response from Gemini
- repeated requests for an existing row should return the stored row instead of generating again

This design matches the requirement to reduce Gemini calls and reduce response time after the first generation.

### 5. Read model impact

Because `SessionPage` already relies on `GET /api/data`, the cleanest first-pass approach is to add `quick_actions` to that payload.

Recommended updates:

- create the table in `server/db.ts`
- read quick action rows in `server/routes/data.ts`
- extend `AppDataPayload` in `src/types.ts` with a `quick_actions` array
- let `SessionPage` derive task-specific quick action state by filtering on `task_id`

This keeps the page consistent with the rest of the app's read model instead of adding a second read path only for cached quick action content.

### 6. Route behavior

Implement the route inside `server/routes/tasks.ts`.

Recommended request flow:

1. Authenticate with `requireUser()`.
2. Validate `taskId` and `action`.
3. Load the task owned by the current user.
4. Load the related goal.
5. Load linked resources by joining `task_resources` to `resources`.
6. Check whether a `quick_actions` row already exists for this `taskId` and `action`.
7. If it exists, return the stored result without calling Gemini.
8. If it does not exist, build `QuickActionContext`.
9. Call `generateQuickActionContent({ action, context })`.
10. Persist the generated result into `quick_actions`.
11. Return `{ action, content, source, updatedAt }`.

Recommended failure behavior:

- `404` if the task is not found
- `400` if the action is invalid
- `503` if Gemini is unavailable or generation fails and there is no cached row
- `500` only for unexpected server failures

The error response should give a clear message to the user.

## Frontend Design

### 1. Replace `UnavailablePrompt` with interactive buttons

In `src/pages/SessionPage.tsx`, replace the four placeholder rows with actionable controls.

Each action should:

- show a `Generate` button when that quick action has no stored content yet
- show a `View` button when that quick action already has stored content
- call the new endpoint for the current task when the user clicks `Generate`
- open a modal after generation completes successfully
- open the same modal immediately when the user clicks `View`
- show per-action loading state while generation is in flight
- disable repeated clicks while the current request is in flight

### 2. Keep the UI simple

Recommended first-pass UI behavior:

- show four fixed quick action rows in the panel, one for each action type
- each row shows the action label and a single CTA button
- the CTA is `Generate` when no stored row exists for that action
- the CTA is `View` when stored content already exists for that action
- generating content persists the row first, then opens the modal
- viewing existing content opens the modal without a Gemini call
- the modal shows the selected quick action title and its markdown-capable content
- the modal can be closed by the user without mutating stored content
- errors render inline in the quick action card

This keeps the interaction model simple and makes the cached-versus-empty state obvious at a glance.

### 3. Update localized strings

Update `src/lib/messages.ts` to reflect the feature becoming interactive.

Likely string changes:

- replace `session.quickActionsBody`
- replace `session.actionUnavailable`
- add `Generate` button text
- add `View` button text
- add loading text
- add error text
- add modal title and close text
- add optional helper text that explains why some actions show `Generate` and others show `View`

### 4. Add a small client API helper

Add a typed helper in `src/lib/api.ts` or a nearby session-specific client module for the quick action request.

Example shape:

```ts
type QuickActionResponse = {
	action: 'explain' | 'example' | 'analogy' | 'confused';
	content: string;
	source: 'cache' | 'generated';
	updatedAt: string;
};
```

This keeps `SessionPage` smaller and makes the request contract explicit.

### 5. Support lightweight markdown rendering

Quick action output may contain lightweight markdown.

Implementation implication:

- store the raw markdown string in the database
- render it safely inside the quick action modal
- avoid assuming markdown support already exists in the frontend because the current dependency list does not include a markdown renderer

The implementation should therefore add a minimal markdown rendering path with sanitization or keep the supported markdown subset intentionally small.

## Implementation Steps

### Step 1

Add quick action domain types on the server, define the prompt map in a dedicated service, and add the `quick_actions` table migration.

### Step 2

Implement `generateQuickActionContent()` using the existing Gemini client pattern already used by `syllabusService.ts` and `searchService.ts`.

### Step 3

Add `POST /api/tasks/:taskId/quick-action` in `server/routes/tasks.ts`, including task ownership validation, task-resource lookup, cache-first read behavior, and persistence on first generation.

### Step 4

Extend `GET /api/data`, `AppDataPayload`, and related types so existing quick action rows are available to the session page.

### Step 5

Add a typed client request helper and replace the four `UnavailablePrompt` rows in `src/pages/SessionPage.tsx` with interactive buttons.

### Step 6

Add modal state and render the selected quick action content in a dismissible modal with markdown support.

### Step 7

Render per-action `Generate` versus `View` state, loading state, and inline error state in the quick action card.

### Step 8

Update message catalog entries in `src/lib/messages.ts` for both English and Indonesian.

## Open Questions

No open questions at the moment based on the current product decisions recorded in this document.