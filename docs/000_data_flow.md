# Data Flow for POST /api/agent/workflow

This document explains what happens when the client calls `POST /api/agent/workflow`, with emphasis on which data is:

- received from the client
- derived in memory during planning
- persisted into SQLite
- returned immediately in the HTTP response
- only visible later through `GET /api/data`

The endpoint is mounted in `server/index.ts` as `/api/agent/workflow` and handled by `server/routes/workflow.ts`.

## High-Level Summary

`POST /api/agent/workflow` does much more than create a single goal.

In one request it can create:

- 1 `goals` row
- 3 `tasks` rows
- 3 `calendar_events` rows
- 0..N `resources` rows from learner input
- 0..M `resources` rows from system-suggested search links
- 0..(3 + M)`task_resources` rows linking resources to tasks
- 2 `notes` rows

What it returns immediately is still very small:

```json
{
	"success": true,
	"goalId": 123
}
```

So if the process feels confusing, the main reason is that the endpoint writes a full roadmap transaction, but the response only exposes the new `goalId`.

## Request Input

The route reads these fields from the request body:

```json
{
	"goal": "Learn advanced React patterns",
	"level": "Intermediate",
	"hours": 6,
	"targetDate": null,
	"preferredStyle": "Mixed",
	"resourceMode": "needs_plan",
	"resources": []
}
```

### Input normalization

Before workflow generation starts, the route normalizes the payload:

- `goal`: trimmed string, required
- `level`: trimmed string, defaults to `Intermediate`
- `hours`: coerced to number, minimum `1`
- `targetDate`: string or `null`
- `preferredStyle`: string or `null`
- `resourceMode`: normalized to either `has_materials` or `needs_plan`
- `resources`: sanitized into valid `LearningResourceInput[]`

### Validation rules

- If `goal` is empty, the route returns `400 GOAL_REQUIRED`.
- If `resourceMode = has_materials` but `resources` becomes empty after sanitization, the route returns `400 RESOURCES_REQUIRED`.

## Step-by-Step Flow

## 1. Authenticate the caller

The route first resolves the bearer token into a user record.

Read from database:

- `auth_sessions`
- `users`

Resolved runtime object:

```ts
type UserRow = {
	id: string;
	name: string;
	email: string;
	created_at: string;
}
```

If authentication fails, nothing is created.

## 2. Build a workflow plan in memory

`runWorkflow()` generates a plan before any database write happens.

This stage produces transient data only. Nothing is persisted yet.

### 2.1 Generate planned tasks

`generateWorkflowPlan()` calls `planSyllabusTasks()`.

Possible planner behavior:

- If `GEMINI_API_KEY` exists and Gemini succeeds, Gemini returns exactly 3 task objects.
- If Gemini is unavailable or fails, the app uses `buildFallbackPlan()`.

In-memory output after planning:

```ts
type PlannedTask = {
	title: string;
	description: string;
	searchQuery: string;
}
```

Typical count:

- always 3 planned tasks

### 2.2 Search for suggested learning links

For each planned task, `searchLearningResources()` may call Gemini with `googleSearch` grounding.

In-memory output per task:

```ts
type SearchLink = {
	title: string;
	url: string;
	snippet?: string;
	source?: string;
}
```

Important behavior:

- If search works, each task may get up to 3 suggested links.
- If search is unavailable or fails, the task gets `[]` links.
- Homepage-only URLs and duplicate URLs are filtered out.

### 2.3 Produce hydrated tasks

Planner output and search output are merged into this transient structure:

```ts
type HydratedTask = {
	title: string;
	description: string;
	searchQuery: string;
	references: SearchLink[];
}
```

This is the main in-memory object that drives the database inserts.

### 2.4 Produce a schedule in memory

`buildEventSchedule(taskCount, hours)` creates one scheduled event per task.

In-memory schedule item:

```ts
{
	date: string,
	duration: number
}
```

Current scheduling logic:

- start date is tomorrow at `19:00`
- number of events = number of hydrated tasks
- duration is derived from weekly hours and clamped between `30` and `120` minutes

At this point the app has enough in-memory data to write the full roadmap.

## 3. Open one database transaction

All workflow writes happen inside one SQLite transaction.

That means:

- if the transaction completes, all rows are created together
- if the transaction fails, none of those rows should remain partially written

## 4. Create the goal row

First persisted row:

### Table: `goals`

Created columns:

- `user_id`
- `title`
- `level`
- `hours`
- `target_date`
- `preferred_style`
- `status = 'active'`
- `created_at`
- `resource_mode`

New persisted identity:

- `goalId = lastInsertRowid`

This `goalId` becomes the parent foreign key for most later inserts.

## 5. Create learner-supplied resources

This step only happens when sanitized `resources[]` contains items.

### Table: `resources`

For each learner-provided resource, one row is inserted with:

- `user_id`
- `goal_id = goalId`
- `title`
- `type`
- `reference`
- `notes`
- `source_kind = 'user_supplied'`
- `created_at`

Transient data produced during this step:

- `storedResourceIds: number[]`

This array is not returned to the client directly, but it is used later to link tasks to learner resources.

## 6. Create tasks, schedule entries, and task-resource links

The service loops through each hydrated task. For each task it performs multiple writes.

Because the planner currently yields 3 tasks, this loop usually runs 3 times.

### 6.1 Create one task row

### Table: `tasks`

Inserted columns:

- `user_id`
- `goal_id = goalId`
- `title`
- `description`
- `status = 'pending'`
- `created_at`
- `completed_at = null`

New persisted identity:

- `taskId = lastInsertRowid`

### 6.2 Create one calendar event row

### Table: `calendar_events`

Inserted columns:

- `user_id`
- `task_id = taskId`
- `date`
- `duration`

There is exactly one generated calendar event per generated task.

### 6.3 Link one learner resource to the task when learner materials exist

If `storedResourceIds.length > 0`, the service creates exactly one `task_resources` row per task.

### Table: `task_resources`

Inserted columns:

- `user_id`
- `task_id = taskId`
- `resource_id = storedResourceIds[index % storedResourceIds.length]`
- `relevance_note = 'Primary study anchor for this task'`

Important current behavior:

- learner resources are linked in round-robin order
- the service does not link all learner resources to all tasks
- with 2 learner resources and 3 tasks, you get 3 learner-link rows total

### 6.4 Create system-suggested resource rows from search links

For each `task.references` item, the service persists a new resource row.

### Table: `resources`

Inserted columns for each suggested link:

- `user_id`
- `goal_id = goalId`
- `title = link.title`
- `type = 'link'`
- `reference = link.url`
- `notes = null`
- `source_kind = 'system_suggested'`
- `created_at`

New persisted identity for each suggested link:

- `sysResourceId = lastInsertRowid`

### 6.5 Link each suggested link to the task

After creating each system resource row, the service creates one `task_resources` row for it.

### Table: `task_resources`

Inserted columns:

- `user_id`
- `task_id = taskId`
- `resource_id = sysResourceId`
- `relevance_note = 'System-suggested learning resource'`

Important consequence:

- suggested links are persisted as first-class `resources` rows, not just returned inline
- the same URL found for two different tasks would currently be inserted twice if it appears twice across tasks

## 7. Create notes that summarize the roadmap

After all tasks and resource links are inserted, the workflow stores two notes.

### 7.1 Plan summary note

### Table: `notes`

Inserted columns:

- `user_id`
- `topic = goal`
- `content = buildPlanSummary(...)`
- `kind = 'plan'`
- `created_at`

This note contains:

- goal
- level
- weekly hours
- either planning mode details or starter guidance
- all generated task titles and descriptions

### 7.2 Resource posture note

### Table: `notes`

Inserted columns:

- `user_id`
- `topic = "${goal} resources"`
- `content = buildResourceNote(...)`
- `kind = 'note'`
- `created_at`

This note explains whether the roadmap used:

- learner-provided materials
- or a start-from-zero planning mode

## 8. Return the HTTP response

After the transaction succeeds, the route returns:

```json
{
	"success": true,
	"goalId": 123
}
```

Important detail:

- the response does not include tasks
- the response does not include notes
- the response does not include resources
- the response does not include calendar events

So the client must fetch `GET /api/data` to see the full created dataset.

## Persisted Data Created by Scenario

## Scenario A: `resourceMode = needs_plan`

If no learner materials are provided and search returns no links:

- `goals`: 1 row
- `tasks`: 3 rows
- `calendar_events`: 3 rows
- `resources`: 0 rows
- `task_resources`: 0 rows
- `notes`: 2 rows

If search returns links, add:

- `resources`: 1 row per suggested link
- `task_resources`: 1 row per suggested link

## Scenario B: `resourceMode = has_materials`

If 2 learner materials are provided and search returns no links:

- `goals`: 1 row
- `tasks`: 3 rows
- `calendar_events`: 3 rows
- `resources`: 2 rows with `source_kind = 'user_supplied'`
- `task_resources`: 3 rows linking tasks to learner resources
- `notes`: 2 rows

If search also returns links, add on top of that:

- `resources`: 1 extra row per suggested link with `source_kind = 'system_suggested'`
- `task_resources`: 1 extra row per suggested link

## Data That Exists Only In Memory

These values are important during the workflow but are not stored as-is:

- normalized request object
- `hydratedTasks`
- `scheduledEvents`
- `storedResourceIds`
- each task's `searchQuery`
- each search result's `source` hostname metadata unless it is later embedded indirectly via persisted title or URL only

Notably:

- `searchQuery` helps produce suggested links but is not stored in any table
- the full `HydratedTask` object is never persisted as a single record

## Data Not Created by This Endpoint

This endpoint does not create:

- `study_sessions` rows
- `reviews` rows
- `auth_sessions` rows
- new `users` rows

Those appear in later flows such as signup, task start, and task completion.

## Read Model After Creation

The main way to inspect the created workflow is `GET /api/data`.

That endpoint returns:

```json
{
	"user": { "...": "..." },
	"goals": [...],
	"tasks": [...],
	"events": [...],
	"notes": [...],
	"sessions": [...],
	"reviews": [...],
	"resources": [...],
	"task_resources": [...]
}
```

For this workflow endpoint, the newly relevant collections are:

- `goals`
- `tasks`
- `events`
- `notes`
- `resources`
- `task_resources`

## Compact Sequence View

```text
Client
	-> POST /api/agent/workflow
	-> validate + normalize input
	-> authenticate user
	-> generate 3 planned tasks
	-> search links for each task
	-> build hydratedTasks[]
	-> build scheduledEvents[]
	-> BEGIN TRANSACTION
			 -> insert goals row
			 -> insert learner resources rows (optional)
			 -> for each task:
						-> insert tasks row
						-> insert calendar_events row
						-> insert learner task_resources row (optional)
						-> insert system resources rows (optional)
						-> insert system task_resources rows (optional)
			 -> insert notes row(kind=plan)
			 -> insert notes row(kind=note)
		 -> COMMIT
	-> respond { success, goalId }
	-> later client calls GET /api/data to read full result
```

## Practical Interpretation

If you want to answer the question "what data is created by POST /api/agent/workflow?", the most accurate answer is:

- one goal is always created
- three tasks are effectively always created
- three calendar events are effectively always created
- two notes are always created
- learner resources are created only if the user supplies them
- suggested resources are created only if search returns links
- resource-to-task links are created for every persisted resource attached to a task
- the immediate API response hides most of this, because the detailed data is meant to be loaded later through `GET /api/data`
