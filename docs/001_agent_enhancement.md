# Agentic Workflow Enhancement

## Goal

Refactor `POST /api/agent/workflow` so roadmap generation is no longer a single syllabus-only LLM call. The new flow should keep the current onboarding input contract, but replace the one-shot plan generation with a three-step agentic loop:

1. Planner: Gemini produces three concrete tasks and one search query per task.
2. Tool Use: the server executes those queries against a Search API.
3. Hydrator: the server injects the retrieved links back into the task objects before persisting the workflow output and exposing it to the frontend.

## Why This Change Is Needed

Yes, the current implementation is too simple and that is the main reason it tends to return generic plans.

Today the route calls `runWorkflow()`, which calls `generateSyllabus()`. That function asks Gemini for exactly three `{ title, description }` objects and nothing else. The model does not retrieve real sources, does not justify task ordering, and does not ground the task descriptions in current documentation. When Gemini is unavailable, the app falls back to a deterministic local syllabus generator that is even more generic by design.

The result is an MVP-friendly path, but not an agentic one:

- one LLM call
- no tool invocation
- no retrieval grounding
- no source attribution
- no task-level enrichment before persistence

## Current Flow

The current request path is:

1. Client posts onboarding data to `POST /api/agent/workflow`.
2. The route validates input and calls `runWorkflow()`.
3. `runWorkflow()` inserts the goal row first.
4. `runWorkflow()` calls `generateSyllabus(goal, level, preferredStyle, resources, resourceMode)`.
5. `generateSyllabus()` returns three tasks from either:
	 - one Gemini JSON response, or
	 - `buildFallbackSyllabus()`.
6. `runWorkflow()` stores those tasks, creates events, stores learner resources, links learner resources round-robin, and writes summary notes.
7. The frontend navigates to `/app` and later reloads data through `GET /api/data`.

This means the only AI artifact that survives the request is the plain task list.

## Target Flow

The new request path should be:

1. Validate onboarding input.
2. Build a planning brief from `goal`, `level`, `preferredStyle`, `resourceMode`, and learner-supplied resources.
3. Call Gemini as a Planner.
4. Receive exactly three task plans, each with one explicit search query.
5. Execute the three queries through a Search API.
6. Normalize and rank the returned links.
7. Hydrate each task with relevant references.
8. Persist the hydrated workflow in one transaction.
9. Return `goalId` and optionally a small preview payload if the frontend later wants immediate post-create rendering.

The important design change is that the server no longer treats the model response as the final syllabus. The model becomes the planner, and the server remains the orchestrator.

## Proposed Architecture

### 1. Replace `generateSyllabus()` with an orchestration layer

`runWorkflow()` should stop calling a single syllabus generator directly. Instead it should call a higher-level workflow planning function, for example:

```ts
const plan = await generateWorkflowPlan({
	goal,
	level,
	preferredStyle,
	resourceMode,
	resources,
});
```

That orchestration function should perform all three agentic stages and return enriched tasks that are ready to persist.

Recommended shape:

```ts
type PlannedTask = {
	title: string;
	description: string;
	searchQuery: string;
};

type SearchLink = {
	title: string;
	url: string;
	snippet?: string;
	source?: string;
};

type HydratedTask = {
	title: string;
	description: string;
	searchQuery: string;
	references: SearchLink[];
};
```

The output of the planner stage should never be inserted into the database directly. Only hydrated tasks should be persisted.

### 2. Split responsibilities by service

Keep the route thin and move orchestration into services.

Recommended service boundaries:

- `server/services/workflowService.ts`
	- owns the full `POST /api/agent/workflow` orchestration
	- starts the transaction
	- persists goal, tasks, events, resources, task-resource links, and notes
- `server/services/syllabusService.ts`
	- no longer owns the whole roadmap generation flow
	- should be narrowed to planner prompt construction and planner response parsing, or renamed to reflect that it is no longer just a syllabus generator
- `server/services/searchService.ts`
	- new service
	- wraps the external Search API
	- accepts query strings and returns normalized links
- optional `server/services/workflowAgentService.ts`
	- if the planning logic becomes large, place planner + tool-use + hydration here and keep `workflowService.ts` focused on persistence

The key requirement is not the filename. It is the separation between:

- planner LLM call
- search tool execution
- persistence

### 3. Planner stage

Gemini should receive a tighter prompt than the current one. Instead of asking for a final roadmap, ask it to produce a machine-usable plan for tool execution.

Planner input:

- goal
- learner level
- preferred learning style
- resource mode
- learner-supplied resources

Planner output schema:

```json
[
	{
		"title": "...",
		"description": "...",
		"searchQuery": "..."
	}
]
```

Planner rules:

- return exactly 3 tasks
- each task must be concrete, not thematic only
- each task must have one search query optimized for authoritative learning sources
- if learner materials exist, tasks should reuse them where relevant
- search queries should be different from each other and aligned to each task

Example prompt intent:

```text
You are a learning-plan planner.
Given a learner goal, level, and learning style, produce exactly 3 concrete tasks.
For each task, also produce 1 searchQuery that would find authoritative documentation or learning material for that task.
Return JSON only.
```

This is the point where the system becomes agentic: the LLM is planning tool use, not pretending to already know the best resources.

### 4. Tool-use stage

The server should execute the planner's three queries through a Search API.

Implementation requirements:

- one query per planned task
- collect top results for each query
- normalize each result to `{ title, url, snippet, source }`
- filter obvious low-value results such as generic homepages, login pages, or duplicate URLs
- prefer authoritative domains when possible, such as official docs, MDN, vendor guides, standards, or well-scoped course pages

Recommended interface:

```ts
type SearchRequest = {
	query: string;
	maxResults?: number;
};

async function searchLearningResources(input: SearchRequest): Promise<SearchLink[]>;
```

Search provider choice should stay behind the service boundary so the app can swap providers later without changing workflow orchestration.

### 5. Hydrator stage

The hydrator converts planner output plus search results into persistence-ready tasks.

Hydration rules:

- attach the top 2 to 3 relevant links to each task
- preserve the planner's task title and description unless post-processing is needed for clarity
- optionally append a short source-aware hint to the task description
- keep the original search query for observability and debugging, even if it is not shown in the UI

Example hydrated task:

```ts
{
	title: 'Build React state fundamentals',
	description: 'Learn component state, event handling, and one-way data flow before moving into derived UI logic.',
	searchQuery: 'React official docs state event handling beginner',
	references: [
		{ title: 'State: A Component\'s Memory', url: 'https://react.dev/learn/state-a-components-memory' },
		{ title: 'Responding to Events', url: 'https://react.dev/learn/responding-to-events' }
	]
}
```

## Persistence Design

### Core principle

Persist the hydrated references as first-class resources, not just as text embedded in task descriptions.

That fits the current frontend better because the app already reads `resources` and `task_resources` through `GET /api/data`.

### Recommended storage behavior

For each hydrated task:

1. Insert the task row.
2. Insert 0 to 3 system-generated resource rows for the task's links.
3. Insert corresponding `task_resources` rows.
4. Use `source_kind = 'system_suggested'` for search-derived resources.

This preserves the current read model and lets the existing roadmap/session pages access the new links without inventing a second delivery mechanism.

### Required type updates

Update server-side planning types so task generation can carry references before persistence. If the search query should be auditable later, add one of these approaches:

- add a new note that stores planner output and executed queries
- add a dedicated workflow trace table later
- add optional metadata columns in a future migration

Do not store the search query only in memory if you expect prompt or tool debugging later.

## Endpoint Contract

### Request

Keep the existing `POST /api/agent/workflow` request body unchanged:

- goal
- level
- hours
- targetDate
- preferredStyle
- resourceMode
- resources

This avoids frontend churn during the refactor.

### Response

The minimal response can stay:

```json
{ "success": true, "goalId": 123 }
```

That is enough because the current frontend navigates to `/app` and reloads everything through `GET /api/data`.

If desired, the route can later return a preview payload:

```json
{
	"success": true,
	"goalId": 123,
	"tasksPreview": [
		{
			"title": "...",
			"description": "...",
			"references": [{ "title": "...", "url": "..." }]
		}
	]
}
```

That preview is optional. The main requirement is to persist the enriched resources before the frontend's next `/api/data` read.

## Transaction And Failure Handling

The current workflow creation path is not transactional. This refactor is a good point to fix that.

Recommended behavior:

1. Run planner and search steps before opening the database transaction.
2. Open one transaction for goal, tasks, events, resources, task-resource links, and notes.
3. Commit only after all inserts succeed.
4. Roll back on any persistence failure.

Fallback behavior should remain explicit:

- If Gemini is unavailable, generate deterministic tasks and deterministic search queries.
- If Search API fails completely, still create the goal and tasks, but record that no external references were attached.
- If only one query fails, keep the successful results for the other tasks.

The system should degrade gracefully, but it should no longer pretend every roadmap is equally grounded.

## Recommended Refactor By File

### `server/services/workflowService.ts`

Replace the current direct `generateSyllabus()` call with a higher-level planning result, then persist hydrated tasks and system-suggested resources inside a transaction.

### `server/services/syllabusService.ts`

Break this file apart or narrow it.

Suggested outcome:

- keep Gemini client initialization here if desired
- replace `generateSyllabus()` with `planSyllabusTasks()` or similar
- keep fallback planner logic here
- remove responsibility for acting as the entire workflow pipeline

### `server/services/searchService.ts`

Add a provider-agnostic search wrapper.

Suggested responsibilities:

- execute query
- normalize results
- rank or filter results
- surface provider failures cleanly

### `server/types.ts`

Add planning-stage and hydration-stage types, for example:

- `PlannedTask`
- `SearchLink`
- `HydratedTask`

If needed, also add a `WorkflowPlan` type that groups the three stages' outputs.

### `server/db.ts`

No schema change is strictly required to persist hydrated links because `resources.source_kind = 'system_suggested'` already exists. If traceability matters, add a future migration for planner metadata instead of overloading task descriptions.

### Frontend

No frontend change is required for the first iteration if the enriched links are persisted as resources and linked through `task_resources`.

If you want the roadmap cards to explicitly surface system-suggested references, then update the roadmap or session UI later to render linked resources more prominently.

## Pseudocode

```ts
export async function runWorkflow(user: UserRow, input: WorkflowInput): Promise<WorkflowResult> {
	const plan = await generateWorkflowPlan(input);
	const scheduledEvents = buildEventSchedule(plan.tasks.length, input.hours);

	return db.transaction(() => {
		const goalId = insertGoal(user, input);

		const learnerResourceIds = insertLearnerResources(user, goalId, input.resources);

		plan.tasks.forEach((task, index) => {
			const taskId = insertTask(user, goalId, task);
			insertEvent(user, taskId, scheduledEvents[index]);
			linkLearnerResourcesIfNeeded(user, taskId, learnerResourceIds, index);
			insertSuggestedReferences(user, goalId, taskId, task.references);
		});

		insertPlanNotes(user, input, plan);

		return { goalId };
	})();
}
```

## Expected Outcome

After the refactor, roadmap generation should improve in four ways:

- tasks become more concrete because the planner must think in task-plus-query pairs
- results become less generic because the system retrieves real documentation links
- the frontend receives grounded resources through the existing data model
- the architecture becomes extensible for future tool steps such as ranking, summarization, or task revision

## Non-Goals For This Iteration

To keep the change focused, do not add these yet unless the scope expands:

- background jobs
- async workflow execution
- streaming planner output to the client
- multi-round self-critique loops
- frontend redesign for a chat-like planning experience

The first win is simple: keep the existing app shape, but convert roadmap generation from one-shot text synthesis into planner -> search -> hydration.
