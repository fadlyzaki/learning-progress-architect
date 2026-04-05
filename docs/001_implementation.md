# Agentic Workflow Enhancement — Implementation Steps

Each step below has a single focus. Complete and verify one step before starting the next.

---

## Step 1 — Add planning and hydration types to `server/types.ts`

**Focus:** Define the three new data shapes that cross service boundaries.

Add the following types to `server/types.ts`:

```ts
export type PlannedTask = {
  title: string;
  description: string;
  searchQuery: string;
};

export type SearchLink = {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
};

export type HydratedTask = {
  title: string;
  description: string;
  searchQuery: string;
  references: SearchLink[];
};
```

**Done when:** TypeScript compiles with no new errors and the types are importable from other service files.

---

## Step 2 — Refactor `syllabusService.ts`: replace `generateSyllabus` with `planSyllabusTasks`

**Focus:** Narrow the syllabus service to a single responsibility — producing a planner response that includes a `searchQuery` per task.

Changes inside `server/services/syllabusService.ts`:

1. Replace the `generateSyllabus` function signature and return type:
   - Old: `Promise<SyllabusItem[]>`
   - New: `Promise<PlannedTask[]>`
2. Update the Gemini response schema to require a `searchQuery` string field in each task object.
3. Update the Gemini prompt to instruct the model to act as a planner and produce one search query per task optimised for authoritative learning sources.
4. Update `buildFallbackSyllabus` to return `PlannedTask[]` instead of `SyllabusItem[]`, adding a deterministic `searchQuery` per task (e.g. `"${goal} ${taskTitle} tutorial documentation"`).
5. Rename both functions to reflect the new role:
   - `generateSyllabus` → `planSyllabusTasks`
   - `buildFallbackSyllabus` → `buildFallbackPlan`
6. Import `PlannedTask` from `../types.ts` and remove the now-unused `SyllabusItem` import.

**Done when:** `planSyllabusTasks` returns `PlannedTask[]` (with `searchQuery` on each item) and TypeScript compiles cleanly. `SyllabusItem` is no longer referenced in this file.

---

## Step 3 — Create `server/services/searchService.ts`

**Focus:** Build a search wrapper that uses Gemini's built-in `google_search` grounding tool, reusing the existing `GEMINI_API_KEY`. No additional API key is required.

Create the file with the following surface:

```ts
import type { SearchLink } from '../types.ts';

export type SearchRequest = {
  query: string;
  maxResults?: number;
};

export async function searchLearningResources(input: SearchRequest): Promise<SearchLink[]>;
```

Implementation requirements:

1. Reuse the existing `GoogleGenAI` client (or instantiate one) using `process.env.GEMINI_API_KEY`.
2. If the key is absent, return an empty array so callers degrade gracefully.
3. Call `ai.models.generateContent` with the `google_search` grounding tool enabled:
   ```ts
   const response = await ai.models.generateContent({
     model: 'gemini-2.5-flash',
     contents: `Find authoritative learning resources for: ${input.query}`,
     config: {
       tools: [{ googleSearch: {} }],
     },
   });
   ```
4. Extract links from `response.candidates?.[0]?.groundingMetadata?.groundingChunks`. Each chunk has the shape `{ web: { uri: string; title: string } }`.
5. Normalize each chunk to `SearchLink`:
   - `title` → `chunk.web.title`
   - `url` → `chunk.web.uri`
   - `snippet` → not available from grounding chunks; omit or leave undefined
   - `source` → hostname extracted from the URI
6. Filter out entries where the URI is a homepage root or a duplicate URL already seen in the same result set.
7. Return at most `input.maxResults ?? 3` normalized links after filtering.
8. Catch any API or network error and return an empty array — do not throw.

**Done when:** The function returns a `SearchLink[]` (populated from Gemini grounding chunks) without throwing under any condition (key missing, API error, empty grounding metadata). Behaviour is verified with a quick manual call or a unit test.

---

## Step 4 — Create `generateWorkflowPlan` orchestrator

**Focus:** Wire the planner and search stages together into a single function that returns `HydratedTask[]`, ready for persistence.

Add `generateWorkflowPlan` to a new file `server/services/workflowAgentService.ts` (or directly inside `workflowService.ts` if you prefer to keep file count low):

```ts
import type { HydratedTask } from '../types.ts';

type WorkflowPlanInput = {
  goal: string;
  level: string;
  preferredStyle: string | null;
  resourceMode: ResourceMode;
  resources: LearningResourceInput[];
};

export async function generateWorkflowPlan(input: WorkflowPlanInput): Promise<HydratedTask[]>;
```

Internal sequence:

1. Call `planSyllabusTasks(...)` from the refactored `syllabusService.ts` to get three `PlannedTask` objects.
2. For each `PlannedTask`, call `searchLearningResources({ query: task.searchQuery, maxResults: 3 })` in parallel (`Promise.all`).
3. Zip the planner output with the search results into `HydratedTask[]`:
   - copy `title`, `description`, `searchQuery` from the planned task
   - set `references` to the search result array for that task (may be empty if search failed)
4. Return the three hydrated tasks.

Fallback rules:
- If `planSyllabusTasks` throws, catch and call `buildFallbackPlan(...)` before continuing to step 2.
- If a single `searchLearningResources` call returns an empty array, keep `references: []` for that task — do not abort.

**Done when:** `generateWorkflowPlan` returns `HydratedTask[]` for both the happy path and all fallback branches. The caller does not need to know which branch executed.

---

## Step 5 — Update `runWorkflow` to use hydrated tasks and persist system-suggested resources in a transaction

**Focus:** Replace the direct `generateSyllabus` call with `generateWorkflowPlan`, persist `references` as `system_suggested` resources, and wrap all DB writes in a single transaction.

Changes inside `server/services/workflowService.ts`:

1. Replace the import of `generateSyllabus` with `generateWorkflowPlan` (and remove `buildEventSchedule`, `buildPlanSummary`, `buildResourceNote` imports if they move or are no longer needed here).
2. Call `generateWorkflowPlan(input)` before opening the database transaction — the plan must be complete before any writes begin.
3. Open a `db.transaction(...)` that contains all inserts:
   - insert the goal row
   - insert learner-supplied resources
   - for each `HydratedTask`:
     - insert the task row
     - insert the calendar event
     - link learner resources (existing round-robin logic)
     - for each link in `task.references`, insert a resource row with `source_kind = 'system_suggested'` and a corresponding `task_resources` row
4. Commit by calling the transaction function and returning `{ goalId }`.
5. On any persistence failure the transaction rolls back automatically — no partial state.
6. Preserve the existing note inserts (`buildPlanSummary`, `buildResourceNote`) inside the same transaction.

**Done when:** A full onboarding POST creates a goal, three tasks, calendar events, learner resources, system-suggested resources, task-resource links, and notes — all atomically. Rolling back is verified by temporarily throwing inside the transaction and confirming no rows are written.
