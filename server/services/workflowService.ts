import { db } from '../db.ts';
import { nowIso } from '../utils/date.ts';
import {
  generateSyllabus,
  buildEventSchedule,
  buildPlanSummary,
  buildResourceNote,
} from './syllabusService.ts';
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

  const goalInsert = db
    .prepare(
      `
        INSERT INTO goals (user_id, title, level, hours, target_date, preferred_style, status, created_at, resource_mode)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `,
    )
    .run(user.id, goal, level, hours, targetDate, preferredStyle, createdAt, resourceMode);

  const goalId = Number(goalInsert.lastInsertRowid);

  const syllabus = await generateSyllabus(
    goal,
    level,
    preferredStyle ?? undefined,
    resources,
    resourceMode,
  );

  const scheduledEvents = buildEventSchedule(syllabus.length, hours);

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
  const insertTaskResource = db.prepare(
    `
      INSERT INTO task_resources (user_id, task_id, resource_id, relevance_note)
      VALUES (?, ?, ?, ?)
    `,
  );

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

  syllabus.forEach((item, index) => {
    const taskInsert = insertTask.run(user.id, goalId, item.title, item.description, createdAt);
    const taskId = Number(taskInsert.lastInsertRowid);
    insertEvent.run(
      user.id,
      taskId,
      scheduledEvents[index].date,
      scheduledEvents[index].duration,
    );

    if (storedResourceIds.length > 0) {
      const resourceId = storedResourceIds[index % storedResourceIds.length];
      insertTaskResource.run(user.id, taskId, resourceId, 'Primary study anchor for this task');
    }
  });

  db.prepare(
    `
      INSERT INTO notes (user_id, topic, content, kind, created_at)
      VALUES (?, ?, ?, 'plan', ?)
    `,
  ).run(user.id, goal, buildPlanSummary(goal, level, hours, syllabus, resourceMode, resources), createdAt);

  db.prepare(
    `
      INSERT INTO notes (user_id, topic, content, kind, created_at)
      VALUES (?, ?, ?, 'note', ?)
    `,
  ).run(user.id, `${goal} resources`, buildResourceNote(goal, resourceMode, resources), createdAt);

  return { goalId };
}
