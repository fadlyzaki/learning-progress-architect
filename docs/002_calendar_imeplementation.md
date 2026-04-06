# Calendar Enhancement — Implementation Steps

Complete the work in order. Each step has one focus, names the files to touch, and defines a clear completion check.

Implementation rules for this change:

- keep SQLite writes transactional
- keep Google Calendar side effects outside the SQLite transaction
- treat the onboarding date as the first scheduled study date
- schedule all generated events in `Asia/Jakarta` starting at `19:00`
- cap every scheduled event at `120` minutes
- keep onboarding successful even when calendar sync fails

---

## Step 1 — Extend database schema and shared types

**Focus:** Add the local fields required to track Google Calendar sync state without changing the read model shape.

Files:

- `server/db.ts`
- `server/types.ts`
- `src/types.ts`

Changes:

1. Extend `calendar_events` in `server/db.ts` with additive columns:
	- `provider TEXT DEFAULT 'google_calendar'`
	- `external_event_id TEXT`
	- `external_calendar_id TEXT`
	- `status TEXT DEFAULT 'pending'`
	- `sync_error TEXT`
	- `synced_at TEXT`
	- `external_url TEXT`
2. Add `ensureColumn()` calls for each new column so existing databases migrate in place.
3. Add a server-side event row type in `server/types.ts` for the expanded `calendar_events` shape.
4. Add a shared sync status type such as `pending | synced | failed | partial` where needed for internal typing.
5. Extend `EventRecord` in `src/types.ts` so the frontend can read the new fields from `GET /api/data` without any extra endpoint.

Done when:

- a fresh database includes the new columns
- an existing database is upgraded automatically on startup
- both server and client types compile against the expanded event shape

---

## Step 2 — Add effort estimates to the workflow planning model

**Focus:** Make the planner produce enough effort data to split one task into multiple study sessions.

Files:

- `server/types.ts`
- `server/services/syllabusService.ts`
- `server/services/workflowAgentService.ts`

Changes:

1. Extend `PlannedTask` and `HydratedTask` with an effort field. Prefer `estimatedMinutes` for the first pass.
2. Update the Gemini schema in `planSyllabusTasks()` so each task returns:
	- `title`
	- `description`
	- `searchQuery`
	- `estimatedMinutes`
3. Update the planner prompt so Gemini estimates the total minutes needed for that task session plan.
4. Clamp planner output to sane values before downstream scheduling. Recommended minimum rule:
	- round to whole minutes
	- treat values below `1` as `30`
5. Update `buildFallbackPlan()` so the non-AI path always returns `estimatedMinutes: 120` for each task.
6. Preserve the existing planner fallback behavior so roadmap generation still works with no Gemini key or planner failure.
7. Make `generateWorkflowPlan()` pass the effort field through unchanged while still hydrating search references.

Done when:

- every planned task has a deterministic `estimatedMinutes` value
- fallback planning still produces three tasks
- no caller has to guess session length anymore

---

## Step 3 — Build a dedicated calendar scheduling service

**Focus:** Replace the current one-event-per-task placeholder scheduler with deterministic session scheduling.

Files:

- `server/services/calendarSchedulerService.ts` (new)
- `server/services/syllabusService.ts`
- `server/types.ts`

Changes:

1. Create a dedicated scheduler service instead of keeping this logic in `syllabusService.ts`.
2. Define input types that include:
	- `weeklyHours`
	- `startDate`
	- `tasks` with `estimatedMinutes`
	- `timeZone`
	- `defaultStartHour`
	- `maxEventMinutes`
3. Define an output type such as `ScheduledCalendarEvent` with at least:
	- `taskIndex`
	- `startAt`
	- `endAt`
	- `durationMinutes`
	- `summary`
	- `description`
4. Implement task splitting with the rule:

	$$
	eventCount = \left\lceil \frac{estimatedMinutes}{120} \right\rceil
	$$

5. Ensure every generated event satisfies:

	$$
	0 < durationMinutes \le 120
	$$

	Use `120` only as the maximum task-session length, not as a minimum. A task may produce a single event shorter than `120` minutes.

6. Use the learner-selected date as the first scheduled study date. If the request omitted the date, default to tomorrow.
7. Generate event timestamps in `Asia/Jakarta` and set the default start time to `19:00`.
8. Distribute events across dates using weekly capacity:

	$$
	weeklyCapacityMinutes = weeklyHours \times 60
	$$

9. Make the algorithm deterministic so tests can assert exact dates and durations.
10. Remove or stop using `buildEventSchedule(taskCount, weeklyHours)` once the new scheduler is wired in.

Done when:

- tasks longer than two hours produce multiple scheduled sessions
- scheduled dates start from the learner-selected date
- no event exceeds `120` minutes
- repeated runs with the same inputs produce the same schedule

---

## Step 4 — Refactor workflow persistence to store one row per scheduled session

**Focus:** Persist the richer local schedule first, inside one transaction, before any MCP call happens.

Files:

- `server/services/workflowService.ts`

Changes:

1. Replace the current `buildEventSchedule(hydratedTasks.length, hours)` call with the new scheduler service.
2. Generate the full task plan and full calendar schedule in memory before opening the transaction.
3. Keep the existing transaction boundary for:
	- goal insert
	- task inserts
	- learner resource inserts
	- system-suggested resource inserts
	- notes
	- calendar event inserts
4. Insert one `calendar_events` row per scheduled session, not one row per task.
5. Insert new event rows with initial sync metadata:
	- `provider = 'google_calendar'`
	- `status = 'pending'`
	- all external fields null
6. Capture enough local mapping during insertion to connect each scheduled row back to:
	- local `calendar_events.id`
	- local `tasks.id`
	- scheduled `startAt` and `endAt`
7. Return the inserted event mapping from the transaction so the post-commit sync step can update the correct local rows.
8. Do not call the MCP server from inside this transaction.

Done when:

- a successful workflow creation stores all local schedule rows even if no remote sync happens
- one task can own multiple `calendar_events` rows
- rolling back the transaction leaves no partial workflow data behind

---

## Step 5 — Implement the MCP calendar client over streamable HTTP

**Focus:** Isolate all MCP transport details in one service.

Files:

- `server/services/calendarMcpService.ts` (new)
- `server/types.ts`

Changes:

1. Create a dedicated service for all MCP communication.
2. Hardcode the first-pass endpoint to `http://localhost:3000/mcp`.
3. Implement the MCP session flow in this order:
	- open session
	- send `initialize`
	- send `tools/call` for `create-events`
4. Do not use a process-wide singleton for MCP initialization in the first implementation. Keep initialization scoped to one MCP session per sync call unless the transport is later proven to support safe session reuse across requests.
5. Keep tool names and payload mapping inside this service only.
6. Create internal request and response types for:
	- bulk event create payload
	- normalized event sync result
	- normalized batch result
7. Map internal scheduled events to the MCP payload using the confirmed contract:
	- `calendarId = primary`
	- `account = app`
	- `timeZone = Asia/Jakarta`
	- `sendUpdates = all`
	- `location = Online`
	- `summary`
	- `description`
	- `start`
	- `end`
	- `attendees`
8. Parse the JSON string returned in `result.content[0].text` and normalize it into app-owned result objects.
9. Normalize both full failure and per-event failure responses so callers do not need to understand raw MCP response shapes.
10. Make transport and parsing failures return structured sync failures instead of throwing untyped errors into workflow orchestration.

Done when:

- the rest of the app can call one function such as `createCalendarEvents()` without knowing anything about MCP JSON-RPC
- the service guarantees `initialize` happens before `create-events`
- successful results expose external event ids, calendar ids, and URLs in a stable internal format

---

## Step 6 — Sync calendar events after commit and persist per-row outcomes

**Focus:** Run the remote side effect after local persistence, then update local rows with the result.

Files:

- `server/services/workflowService.ts`
- `server/services/calendarMcpService.ts`

Changes:

1. After the workflow transaction commits, build the bulk MCP payload from the inserted local event mapping.
2. Populate attendee data from the authenticated user:
	- `email`
	- `name` as `displayName`
3. Call the MCP client with the full schedule in one `create-events` request.
4. Match each normalized sync result back to the correct local `calendar_events` row.
5. Update each local row with the outcome:
	- success: set `external_event_id`, `external_calendar_id`, `external_url`, `status = 'synced'`, `synced_at`, clear `sync_error`
	- failure: set `status = 'failed'`, store `sync_error`, leave external ids null
6. Support partial success. One failed remote event must not mark the entire workflow as failed.
7. If the whole MCP call fails, mark every pending row as failed and keep the local roadmap intact.
8. Return a summary object from `runWorkflow()` so the route layer can expose warning semantics without re-querying the database.

Done when:

- onboarding still succeeds if Google Calendar sync fails
- every local event row ends in a concrete sync state after the first sync attempt
- partial sync updates only the affected rows

---

## Step 7 — Expose sync status through the existing API surfaces

**Focus:** Keep the current read model, but include enough workflow response detail for immediate onboarding feedback.

Files:

- `server/routes/workflow.ts`
- `server/routes/data.ts`
- `src/types.ts`

Changes:

1. Keep `GET /api/data` returning `events` from `SELECT *`, which will now include the new sync fields automatically.
2. Extend the workflow POST response beyond `{ success, goalId }` with a compact calendar sync summary, for example:
	- `calendarSync.status`
	- `calendarSync.total`
	- `calendarSync.succeeded`
	- `calendarSync.failed`
	- `calendarSync.message`
3. Add matching client types for the workflow create response.
4. Preserve existing error handling for true workflow creation failures.
5. Keep warning semantics separate from failure semantics:
	- local workflow creation failure: `500`
	- local success with sync failure: `201` with warning summary in the response body

Done when:

- existing pages can continue loading event sync state from `GET /api/data`
- onboarding can show immediate sync feedback without waiting for a follow-up fetch

---

## Step 8 — Update onboarding and event presentation in the frontend

**Focus:** Make the UI respect the new date meaning and show calendar sync results clearly.

Files:

- `src/pages/OnboardingPage.tsx`
- `src/types.ts`
- `src/pages/DashboardPage.tsx`
- other event-reading pages if needed

Changes:

1. Default the onboarding date field to tomorrow instead of an empty string.
2. Keep posting `targetDate` in the workflow request. This date now means the first scheduled study date.
3. Read the new workflow POST response and surface warning feedback when calendar sync is partial or failed.
4. Do not block navigation to the app when the workflow was created locally.
5. Update dashboard or roadmap event UI to show sync state using the returned event metadata, for example:
	- synced
	- pending
	- failed
6. Keep the first UI pass lightweight. The goal is visibility, not a full retry workflow.

Done when:

- the onboarding form always submits a meaningful first study date unless the user changes it
- users can tell whether events were synced to Google Calendar
- local roadmap creation still feels successful even when sync warnings are present

---

## Step 9 — Add coverage for scheduler, MCP mapping, and workflow fallbacks

**Focus:** Lock the new behavior down with deterministic tests.

Files:

- `tests/api.test.ts`
- scheduler unit test file if created
- MCP client unit test file if created

Changes:

1. Add API coverage for local-success remote-failure behavior.
2. Verify workflow creation still returns `201` when the MCP server is unavailable.
3. Verify failed sync rows are persisted with `status = 'failed'`.
4. Verify `initialize` is sent before `tools/call create-events` through a mocked transport.
5. Verify the MCP client targets `http://localhost:3000/mcp` and uses the `create-events` payload contract.
6. Verify long tasks create multiple `calendar_events` rows.
7. Verify the learner-selected date is used as the first scheduled study date.
8. Verify generated events start at `19:00` in `Asia/Jakarta`.
9. Verify event durations never exceed `120` minutes.
10. Verify successful sync persists `external_event_id`, `external_calendar_id`, `external_url`, `status`, and `synced_at`.
11. Verify the client correctly parses the JSON string from `result.content[0].text`.
12. Verify partial success only updates the affected rows.
13. Verify fallback planning still creates one `120` minute session per task when effort estimation is unavailable.
14. Verify attendees are built from the authenticated user and that bulk payload defaults include `account = app`, `calendarId = primary`, `timeZone = Asia/Jakarta`, `sendUpdates = all`, and `location = Online`.

Done when:

- the scheduler is deterministic under test
- MCP mapping is testable without a real Google Calendar dependency
- the main workflow regression paths are covered end to end

---

## Suggested PR breakdown

If the team wants smaller review units, split the delivery like this:

1. PR 1: schema, shared types, planner effort field, scheduler service
2. PR 2: workflow persistence refactor and post-commit sync orchestration
3. PR 3: MCP client, route response updates, frontend warning state, tests
