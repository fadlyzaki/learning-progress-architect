import { db } from '../db.ts';
import { nowIso } from '../utils/date.ts';
import { buildPlanSummary, buildResourceNote } from './syllabusService.ts';
import { scheduleCalendarEvents } from './calendarSchedulerService.ts';
import { createCalendarEvents } from './calendarMcpService.ts';
import { generateWorkflowPlan } from './workflowAgentService.ts';
import type {
  CalendarEventSyncBatchResult,
  CalendarEventSyncResult,
  LearningResourceInput,
  ResourceMode,
  UserRow,
} from '../types.ts';

type WorkflowInput = {
  goal: string;
  level: string;
  hours: number;
  targetDate: string | null;
  preferredStyle: string | null;
  resourceMode: ResourceMode;
  resources: LearningResourceInput[];
};

type WorkflowResult = {
  goalId: number;
  insertedEvents: InsertedWorkflowEvent[];
  calendarSync: WorkflowCalendarSyncSummary;
};

type InsertedWorkflowEvent = {
  calendarEventId: number;
  taskId: number;
  taskIndex: number;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  summary: string;
  description: string;
};

type WorkflowCalendarSyncSummary = {
  status: CalendarEventSyncBatchResult['status'];
  total: number;
  succeeded: number;
  failed: number;
  message: string | null;
};

type WorkflowOptions = {
  syncCalendarEvents?: typeof createCalendarEvents;
};

function buildCalendarSyncSummary(result: CalendarEventSyncBatchResult): WorkflowCalendarSyncSummary {
  const succeeded = result.results.filter((item) => item.status === 'synced').length;
  const failed = result.results.length - succeeded;

  let message: string | null = null;
  if (result.status === 'failed') {
    message = result.error ?? 'Calendar sync failed, but the local roadmap was created successfully.';
  } else if (result.status === 'partial') {
    message = `${failed} of ${result.results.length} calendar events failed to sync.`;
  }

  return {
    status: result.status,
    total: result.results.length,
    succeeded,
    failed,
    message,
  };
}

function persistCalendarSyncResults(userId: string, results: CalendarEventSyncResult[]) {
  const syncedAt = nowIso();
  const markEventSynced = db.prepare(
    `
      UPDATE calendar_events
      SET
        external_event_id = ?,
        external_calendar_id = ?,
        external_url = ?,
        status = 'synced',
        synced_at = ?,
        sync_error = NULL
      WHERE id = ? AND user_id = ?
    `,
  );
  const markEventFailed = db.prepare(
    `
      UPDATE calendar_events
      SET
        external_event_id = NULL,
        external_calendar_id = NULL,
        external_url = NULL,
        status = 'failed',
        synced_at = NULL,
        sync_error = ?
      WHERE id = ? AND user_id = ?
    `,
  );

  const tx = db.transaction(() => {
    for (const result of results) {
      if (result.status === 'synced') {
        markEventSynced.run(
          result.externalEventId,
          result.externalCalendarId,
          result.externalUrl,
          syncedAt,
          result.localEventId,
          userId,
        );
        continue;
      }

      markEventFailed.run(
        result.error ?? 'Calendar sync failed for this event.',
        result.localEventId,
        userId,
      );
    }
  });

  tx();
}

export async function runWorkflow(
  user: UserRow,
  input: WorkflowInput,
  options?: WorkflowOptions,
): Promise<WorkflowResult> {
  const { goal, level, hours, targetDate, preferredStyle, resourceMode, resources } = input;
  const createdAt = nowIso();
  const syncCalendarEvents = options?.syncCalendarEvents ?? createCalendarEvents;

  // Generate the hydrated plan (planner + search) before any DB writes.
  const hydratedTasks = await generateWorkflowPlan({
    goal,
    level,
    preferredStyle,
    resourceMode,
    resources,
  });

  const scheduledEvents = scheduleCalendarEvents({
    weeklyHours: hours,
    startDate: targetDate,
    tasks: hydratedTasks.map((task) => ({
      title: task.title,
      description: task.description,
      estimatedMinutes: task.estimatedMinutes,
    })),
    timeZone: 'Asia/Jakarta',
    defaultStartHour: 19,
    maxEventMinutes: 120,
  });

  // Prepare statements outside the transaction so they are compiled once.
  const insertGoal = db.prepare(
    `
      INSERT INTO goals (user_id, title, level, hours, target_date, preferred_style, status, created_at, resource_mode)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `,
  );
  const insertTask = db.prepare(
    `
      INSERT INTO tasks (user_id, goal_id, title, description, status, created_at, completed_at)
      VALUES (?, ?, ?, ?, 'pending', ?, NULL)
    `,
  );
  const insertEvent = db.prepare(
    `
      INSERT INTO calendar_events (
        user_id,
        task_id,
        date,
        duration,
        provider,
        external_event_id,
        external_calendar_id,
        status,
        sync_error,
        synced_at,
        external_url
      )
      VALUES (?, ?, ?, ?, 'google_calendar', NULL, NULL, 'pending', NULL, NULL, NULL)
    `,
  );
  const insertResource = db.prepare(
    `
      INSERT INTO resources (user_id, goal_id, title, type, reference, notes, source_kind, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'user_supplied', ?)
    `,
  );
  const insertSystemResource = db.prepare(
    `
      INSERT INTO resources (user_id, goal_id, title, type, reference, notes, source_kind, created_at)
      VALUES (?, ?, ?, 'link', ?, NULL, 'system_suggested', ?)
    `,
  );
  const insertTaskResource = db.prepare(
    `
      INSERT INTO task_resources (user_id, task_id, resource_id, relevance_note)
      VALUES (?, ?, ?, ?)
    `,
  );
  const insertNote = db.prepare(
    `
      INSERT INTO notes (user_id, topic, content, kind, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
  );

  const tx = db.transaction(() => {
    // Insert goal row.
    const goalInsert = insertGoal.run(
      user.id,
      goal,
      level,
      hours,
      targetDate,
      preferredStyle,
      createdAt,
      resourceMode,
    );
    const goalId = Number(goalInsert.lastInsertRowid);

    // Insert learner-supplied resources.
    const storedResourceIds = resources.map((resource) => {
      const result = insertResource.run(
        user.id,
        goalId,
        resource.title,
        resource.type,
        resource.reference,
        resource.notes,
        createdAt,
      );
      return Number(result.lastInsertRowid);
    });

    const taskIdsByIndex: number[] = [];
    const insertedEvents: InsertedWorkflowEvent[] = [];

    // Insert tasks, learner resource links, and system-suggested resources.
    hydratedTasks.forEach((task, index) => {
      const taskInsert = insertTask.run(user.id, goalId, task.title, task.description, createdAt);
      const taskId = Number(taskInsert.lastInsertRowid);
      taskIdsByIndex[index] = taskId;

      // Link learner-supplied resources (round-robin).
      if (storedResourceIds.length > 0) {
        const resourceId = storedResourceIds[index % storedResourceIds.length];
        insertTaskResource.run(user.id, taskId, resourceId, 'Primary study anchor for this task');
      }

      // Insert system-suggested resources from grounding search.
      for (const link of task.references) {
        const sysInsert = insertSystemResource.run(
          user.id,
          goalId,
          link.title,
          link.url,
          createdAt,
        );
        const sysResourceId = Number(sysInsert.lastInsertRowid);
        insertTaskResource.run(user.id, taskId, sysResourceId, 'System-suggested learning resource');
      }
    });

    // Insert one calendar row per scheduled session after all task ids are known.
    for (const event of scheduledEvents) {
      const taskId = taskIdsByIndex[event.taskIndex];
      const eventInsert = insertEvent.run(user.id, taskId, event.startAt, event.durationMinutes);

      insertedEvents.push({
        calendarEventId: Number(eventInsert.lastInsertRowid),
        taskId,
        taskIndex: event.taskIndex,
        startAt: event.startAt,
        endAt: event.endAt,
        durationMinutes: event.durationMinutes,
        summary: event.summary,
        description: event.description,
      });
    }

    // Insert plan and resource notes.
    insertNote.run(
      user.id,
      goal,
      buildPlanSummary(goal, level, hours, hydratedTasks, resourceMode, resources),
      'plan',
      createdAt,
    );
    insertNote.run(
      user.id,
      `${goal} resources`,
      buildResourceNote(goal, resourceMode, resources),
      'note',
      createdAt,
    );

    return {
      goalId,
      insertedEvents,
    };
  });

  const workflowResult = tx();
  let syncResult: CalendarEventSyncBatchResult;

  try {
    syncResult = await syncCalendarEvents(
      workflowResult.insertedEvents.map((event) => ({
        localEventId: event.calendarEventId,
        summary: event.summary,
        description: event.description,
        startAt: event.startAt,
        endAt: event.endAt,
        attendees: [
          {
            email: user.email,
            displayName: user.name,
          },
        ],
      })),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Calendar sync failed, but the local roadmap was created successfully.';
    syncResult = {
      status: 'failed',
      error: message,
      results: workflowResult.insertedEvents.map((event) => ({
        localEventId: event.calendarEventId,
        status: 'failed',
        externalEventId: null,
        externalCalendarId: null,
        externalUrl: null,
        error: message,
      })),
    };
  }

  persistCalendarSyncResults(user.id, syncResult.results);

  return {
    ...workflowResult,
    calendarSync: buildCalendarSyncSummary(syncResult),
  };
}
