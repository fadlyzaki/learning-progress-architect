## Calendar Enhancement Plan

## Goal

Add Google Calendar event creation to workflow setup by calling the Google Calendar MCP server over streamable HTTP at `http://localhost:3000/mcp`.

The backend should:

- calculate a schedule from learner inputs
- split planned study into task-session calendar events of at most 2 hours each
- create matching Google Calendar events through the MCP server
- persist enough local metadata to show what was scheduled and whether calendar sync succeeded

## Current Implementation Baseline

The current code already creates local placeholder schedule rows during workflow creation, but it does not talk to any external calendar service.

Current behavior:

- `POST /api/agent/workflow` calls `runWorkflow()`
- `runWorkflow()` generates the task plan, then calls `buildEventSchedule(taskCount, hours)`
- `buildEventSchedule()` always creates exactly one local event per task
- event duration is split evenly across tasks and clamped to 30..120 minutes
- scheduling always starts tomorrow at 19:00 server-local time
- the learner-chosen `targetDate` is persisted on the goal, but it is not used by the scheduler
- `calendar_events` stores only `id`, `user_id`, `task_id`, `date`, and `duration`

This means the current implementation is not yet able to:

- create more than one event for a task
- create Google Calendar events
- track external calendar event IDs or sync failures
- distinguish local placeholder events from externally synced events

## Recommended Implementation Shape

Implement this as a server-side integration inside the existing workflow creation path.

Reasoning:

- the app already centralizes workflow creation on the server
- MCP and Google credentials should stay off the browser
- local DB writes and external calendar writes need one orchestration point
- the frontend already reloads state through `GET /api/data`, so server persistence fits the current read model

## Proposed Architecture

### 1. Add a dedicated MCP calendar client service

Create a new service such as `server/services/calendarMcpService.ts` that is responsible for:

- opening an MCP streamable HTTP session to `http://localhost:3000/mcp`
- performing standard MCP initialization over JSON-RPC 2.0
- invoking the Google Calendar tools exposed by that MCP server
- mapping internal schedule objects into MCP tool arguments
- normalizing success and failure responses into app-owned types

This service should be the only place that knows:

- the MCP transport details
- the exact tool names and payload shapes
- how Google Calendar event IDs and links are returned

Known MCP details from the current server:

- single-event creation uses the `create-event` tool
- bulk creation is available through `create-events`
- the MCP server already owns Google authentication and token storage
- the app does not need to implement Google OAuth or user Google account linking for this integration
- created study events should target the `primary` calendar
- the MCP `account` value for study event creation should be `app`
- the first MCP interaction should be `initialize` before `tools/call`

### 2. Replace the current placeholder scheduler with a real planning step

Refactor `buildEventSchedule()` into a scheduler that accepts the actual scheduling inputs instead of only `(taskCount, weeklyHours)`.

The new scheduler should accept, at minimum:

- `weeklyHours`
- the user-selected scheduling date, which is now confirmed to mean the first scheduled study date
- the task plan
- a maximum event length of 120 minutes
- the fixed timezone `Asia/Jakarta`
- a default generated start time of 19:00 in `Asia/Jakarta`

The scheduler output should be an array of local event plans, not just one event per task.

Each event plan should include at least:

- `taskIndex` or `taskId` mapping
- `startAt`
- `durationMinutes`
- enough display text to build a calendar title and description

### 3. Extend the workflow plan with effort estimates

One calendar event should represent one task session. The system therefore needs an estimate of how much time each task session requires. The current task plan has only:

- `title`
- `description`
- `searchQuery`

It does not include estimated minutes or session count. Based on the confirmed behavior, the plan stage should be extended to include an effort signal such as:

- `estimatedMinutes`, or
- `sessionCount` plus `sessionMinutes`

That should be produced by:

- Gemini planning output when available
- deterministic fallback logic when Gemini is unavailable, with one task session mapped to one 120-minute calendar event by default

Recommended first-pass rule:

- ask Gemini to estimate how much time is needed to complete each task session
- if Gemini is unavailable or estimation fails, default one task session to one 120-minute calendar event
- if Gemini estimates more than 120 minutes for the same task, split that task into multiple session events for that same task

This keeps the feature operable without AI while still allowing richer time estimates when AI is available.

### 4. Persist richer calendar sync metadata locally

The current `calendar_events` table is too small for external sync tracking. Extend it with additive migration columns such as:

- `provider` TEXT default `google_calendar`
- `external_event_id` TEXT nullable
- `external_calendar_id` TEXT nullable
- `status` TEXT default `pending`
- `sync_error` TEXT nullable
- `synced_at` TEXT nullable

If the MCP server returns a join URL or calendar link, also consider:

- `external_url` TEXT nullable

This keeps `GET /api/data` compatible with the existing frontend model while allowing the UI to show whether an event actually exists in Google Calendar.

### 5. Keep database writes transactional, but move external side effects outside the SQLite transaction

Do not call the MCP server inside the SQLite transaction that creates goals, tasks, notes, resources, and local `calendar_events` rows.

Recommended sequence:

1. Generate the task plan and schedule in memory.
2. Insert the goal, tasks, notes, resources, and local calendar rows inside one DB transaction.
3. Commit the transaction.
4. Call the MCP server through `create-events` so the initial roadmap creation syncs the full schedule in one bulk request.
5. Update each local calendar row with `external_event_id`, `status`, `synced_at`, and any error details.

Reasoning:

- a remote Google Calendar write cannot participate in the SQLite transaction
- rolling back a DB transaction does not delete already-created Google events
- local-first persistence gives the app a recovery path if MCP calls fail partway through

### 6. Surface sync results through the existing read model

Because the frontend already consumes `GET /api/data`, the minimal integration path is:

- keep returning `events` from `/api/data`
- extend each event row with sync metadata through the existing `SELECT *`
- optionally add a lightweight summary to `POST /api/agent/workflow` if onboarding should show immediate success or warning feedback

The first UI pass can stay small:

- show that schedule creation succeeded locally
- show whether Google Calendar sync succeeded, partially failed, or failed completely
- allow onboarding to succeed even if calendar sync fails, with a visible warning state

## Scheduling Logic To Implement

The scheduler needs to answer two separate questions:

1. how much total study time should be scheduled
2. how that time should be split into concrete calendar events

### Event splitting rule

If `totalRequiredMinutes` is known for a task session plan, event count is:

$$
eventCount = \left\lceil \frac{totalRequiredMinutes}{120} \right\rceil
$$

Each event duration must satisfy:

$$
0 < durationMinutes \le 120
$$

### Weekly capacity rule

Learner weekly capacity is:

$$
weeklyCapacityMinutes = weeklyHours \times 60
$$

This should be used to distribute events across calendar dates starting from the learner-selected start date instead of using the current hard-coded tomorrow-at-19:00 behavior.

### Date handling

The server should stop ignoring the learner-chosen date.

Recommended minimum behavior:

- if the request omits the date, default to tomorrow on both client and server
- use the chosen date as the first scheduled study date
- create Google events in `Asia/Jakarta`
- generate explicit `start` and `end` timestamps for MCP tool calls

### MCP event payload rule

The current MCP server expects at least:

- `calendarId`
- `summary`
- `start`
- `end`

Optional fields that are immediately useful for this app:

- `account`
- `timeZone`
- `description`
- `sendUpdates`
- `location`
- `attendees`

Recommended mapping:

- `summary`: task title or `Study Session: <task title>`
- `description`: task description plus goal context, or a fixed app-authored message if the product wants a consistent calendar description
- `calendarId`: `primary`
- `account`: `app`
- `timeZone`: `Asia/Jakarta`
- `sendUpdates`: `all`
- `location`: `Online`
- `attendees`: include the logged-in app user's email and full name as `displayName`
- `start` and `end`: explicit timed ISO values for each scheduled session

Before calling `tools/call` with `create-events`, the app should send MCP `initialize` as the first interaction for that MCP session.

## Workflow Changes By Area

### Backend types

Likely changes:

- extend workflow planning types in `server/types.ts`
- extend `calendar_events` row typing in both server and client types
- add an internal type for `ScheduledCalendarEvent`
- add an internal type for normalized MCP create-event responses
- add internal typing for MCP request arguments using the confirmed `create-event` or `create-events` contract
- add types for MCP bulk create payloads and parsed bulk create responses

### Workflow orchestration

Likely changes in `server/services/workflowService.ts`:

- replace `buildEventSchedule(hydratedTasks.length, hours)` with a richer scheduler call
- insert one local `calendar_events` row per scheduled task-session event, not per task
- keep the existing transaction for local writes
- perform MCP sync after commit
- update inserted rows with sync metadata from the bulk `create-events` response
- populate attendee info from the logged-in app user's email and full name

### Scheduling service

Likely changes in `server/services/syllabusService.ts` or a new dedicated scheduler service:

- move calendar planning into a dedicated function such as `buildCalendarSchedule()`
- accept start date semantics explicitly
- support multiple events per task
- enforce the 2-hour maximum
- start generated events at 19:00 in `Asia/Jakarta`
- split the same task into multiple session events when estimated effort exceeds 120 minutes
- make the scheduling algorithm deterministic for tests

### Frontend

Minimal frontend changes:

- default the onboarding date input to tomorrow instead of blank
- keep posting the chosen date in the existing workflow request
- show a warning if workflow creation succeeds but calendar sync fails
- optionally label synced vs failed events in roadmap or dashboard views

## Error Handling Strategy

Recommended behavior for the first implementation:

- if local workflow creation fails, return the existing workflow error response
- if local workflow creation succeeds but Google Calendar sync fails, do not delete the local workflow
- mark failed calendar rows with `status = failed`
- return enough information for the UI to tell the learner that the plan exists but calendar sync needs attention
- treat onboarding as successful with warning semantics when sync fails after the local workflow is committed

This is the safest model because it avoids losing the learning roadmap when a local MCP server or Google Calendar call is unavailable.

## Testing Plan

Add or update API tests for these cases:

- workflow creation still succeeds when the MCP server is unavailable, and local events are marked failed or pending according to the chosen design
- workflow creation sends MCP `initialize` before `tools/call create-events`
- workflow creation uses `http://localhost:3000/mcp` and the confirmed `create-events` payload shape through a mocked transport layer
- workflow creation creates multiple `calendar_events` rows when the required study time exceeds 120 minutes per event
- learner-selected date is used as the first scheduled study date instead of the current hard-coded tomorrow-at-19:00 behavior
- generated events start at 19:00 in `Asia/Jakarta`
- event durations never exceed 120 minutes
- successful MCP responses persist external event identifiers and sync status
- successful MCP responses parse the JSON string returned inside `result.content[0].text`
- partial MCP failure updates only the affected local rows
- fallback planning still creates one 120-minute event per task session when Gemini effort estimation is unavailable
- bulk creation uses `create-events` with `account = app`, `calendarId = primary`, `timeZone = Asia/Jakarta`, and attendees derived from the logged-in app user

If the MCP transport layer is isolated well, add unit tests for:

- schedule splitting
- event date distribution from weekly capacity
- MCP request-to-response mapping

## Suggested Delivery Phases

### Phase 1

- add local schema fields for external sync tracking
- implement deterministic schedule splitting
- persist one local row per planned calendar event

### Phase 2

- implement the server-side MCP client over streamable HTTP
- call `create-events` after workflow commit
- persist sync metadata

### Phase 3

- expose sync status clearly in the UI
- add retry tooling for failed syncs if needed
- decide whether later goal edits should update or cancel Google Calendar events

## Confirmed Decisions

These inputs are now explicit and should be treated as implementation requirements.

- MCP endpoint: `http://localhost:3000/mcp`
- transport: MCP streamable HTTP with normal MCP initialization
- calendar creation tools: `create-event` for single event creation, `create-events` for bulk creation
- MCP session flow: call `initialize` first, then `tools/call` for `create-events`
- initial workflow sync should use `create-events`
- Google authentication: handled by the MCP server, not this app
- no per-user Google account linking is required for this integration
- onboarding date meaning: first scheduled study date
- scheduling timezone: `Asia/Jakarta`
- default generated start time: 19:00
- default target calendar: `primary`
- MCP account: always use `app`
- session meaning: one task session
- fallback effort rule: if Gemini cannot estimate effort, create one 2-hour event for one task session
- if one task needs more than 2 hours, split it into multiple sessions for that same task
- attendees: use the logged-in app user's email and full name
- default event delivery settings: `sendUpdates = all` and `location = Online`
- failure behavior: onboarding still succeeds and calendar sync is recorded as failed with a warning
- follow-up event updates or deletions: not required in this iteration

## Remaining Open Questions

The Q&A now defines the MCP request contract and removes the earlier account-linking ambiguity. No additional open questions are required for this plan at the moment.
