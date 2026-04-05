import { db } from '../db.ts';
import { nowIso } from '../utils/date.ts';
import {
  buildEventSchedule,
  buildPlanSummary,
  buildResourceNote,
} from './syllabusService.ts';
import { generateWorkflowPlan } from './workflowAgentService.ts';
import type { UserRow, ResourceMode, LearningResourceInput } from '../types.ts';

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
};

export async function runWorkflow(user: UserRow, input: WorkflowInput): Promise<WorkflowResult> {
  const { goal, level, hours, targetDate, preferredStyle, resourceMode, resources } = input;
  const createdAt = nowIso();

  // Generate the hydrated plan (planner + search) before any DB writes.
  const hydratedTasks = await generateWorkflowPlan({
    goal,
    level,
    preferredStyle,
    resourceMode,
    resources,
  });

  const scheduledEvents = buildEventSchedule(hydratedTasks.length, hours);

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
    'INSERT INTO calendar_events (user_id, task_id, date, duration) VALUES (?, ?, ?, ?)',
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

    // Insert tasks, calendar events, learner resource links, and system-suggested resources.
    hydratedTasks.forEach((task, index) => {
      const taskInsert = insertTask.run(user.id, goalId, task.title, task.description, createdAt);
      const taskId = Number(taskInsert.lastInsertRowid);

      insertEvent.run(
        user.id,
        taskId,
        scheduledEvents[index].date,
        scheduledEvents[index].duration,
      );

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

    return goalId;
  });

  const goalId = tx();
  return { goalId };
}
