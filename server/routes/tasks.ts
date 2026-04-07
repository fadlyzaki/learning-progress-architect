import { Router } from 'express';
import { db } from '../db.ts';
import { requireUser } from '../middleware/auth.ts';
import { jsonError } from '../utils/http.ts';
import { nowIso, addDays } from '../utils/date.ts';
import { getReviewSchedule } from '../services/reviewService.ts';
import {
  QuickActionGenerationError,
  generateQuickActionContent,
  isQuickActionKind,
} from '../services/quickActionService.ts';
import type {
  QuickActionRow,
  QuickActionResource,
  StudySessionRow,
  TaskRow,
} from '../types.ts';

export const tasksRouter = Router();

function loadTaskForUser(taskId: number, userId: string) {
  return db
    .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .get(taskId, userId) as TaskRow | undefined;
}

function loadTaskResources(taskId: number, userId: string): QuickActionResource[] {
  return db
    .prepare(
      `
        SELECT resources.title, resources.type, resources.reference, resources.notes, resources.source_kind
        FROM task_resources
        INNER JOIN resources ON resources.id = task_resources.resource_id
        WHERE task_resources.task_id = ? AND task_resources.user_id = ?
        ORDER BY task_resources.id ASC
      `,
    )
    .all(taskId, userId) as QuickActionResource[];
}

tasksRouter.post('/:taskId/start', (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const taskId = Number(req.params.taskId);
  const task = loadTaskForUser(taskId, user.id);

  if (!task) {
    jsonError(res, 404, 'Task not found.', 'TASK_NOT_FOUND');
    return;
  }

  let session = db
    .prepare(
      `
        SELECT * FROM study_sessions
        WHERE task_id = ? AND user_id = ? AND completed_at IS NULL
        ORDER BY started_at DESC, id DESC
        LIMIT 1
      `,
    )
    .get(taskId, user.id) as StudySessionRow | undefined;

  if (!session) {
    const startedAt = nowIso();
    const insertResult = db
      .prepare(
        `
          INSERT INTO study_sessions (user_id, task_id, started_at, completed_at, duration_seconds, reflection, confusion, confidence)
          VALUES (?, ?, ?, NULL, 0, NULL, NULL, NULL)
        `,
      )
      .run(user.id, taskId, startedAt);

    session = db
      .prepare('SELECT * FROM study_sessions WHERE id = ?')
      .get(Number(insertResult.lastInsertRowid)) as StudySessionRow;
  }

  if (task.status === 'pending') {
    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run('in_progress', taskId);
  }

  res.json({ session });
});

tasksRouter.post('/:taskId/complete', (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const taskId = Number(req.params.taskId);
  const task = loadTaskForUser(taskId, user.id);

  if (!task) {
    jsonError(res, 404, 'Task not found.', 'TASK_NOT_FOUND');
    return;
  }

  const reflection = String(req.body?.reflection ?? '').trim();
  const confusion = String(req.body?.confusion ?? '').trim();
  const confidence =
    req.body?.confidence === null || req.body?.confidence === undefined
      ? null
      : Math.max(1, Math.min(5, Number(req.body.confidence)));
  const durationSeconds = Math.max(0, Number(req.body?.durationSeconds ?? 0));
  const completedAt = nowIso();

  const existingOpenSession = db
    .prepare(
      `
        SELECT * FROM study_sessions
        WHERE task_id = ? AND user_id = ? AND completed_at IS NULL
        ORDER BY started_at DESC, id DESC
        LIMIT 1
      `,
    )
    .get(taskId, user.id) as StudySessionRow | undefined;

  if (existingOpenSession) {
    db.prepare(
      `
        UPDATE study_sessions
        SET completed_at = ?, duration_seconds = ?, reflection = ?, confusion = ?, confidence = ?
        WHERE id = ?
      `,
    ).run(completedAt, durationSeconds, reflection || null, confusion || null, confidence, existingOpenSession.id);
  } else {
    db.prepare(
      `
        INSERT INTO study_sessions (user_id, task_id, started_at, completed_at, duration_seconds, reflection, confusion, confidence)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(user.id, taskId, completedAt, completedAt, durationSeconds, reflection || null, confusion || null, confidence);
  }

  db.prepare(
    'UPDATE tasks SET status = ?, completed_at = ? WHERE id = ? AND user_id = ?',
  ).run('completed', completedAt, taskId, user.id);

  const { daysUntilReview, priority } = getReviewSchedule(confidence);
  const dueDate = addDays(new Date(), daysUntilReview).toISOString();
  const existingReview = db
    .prepare(
      `
        SELECT id FROM reviews
        WHERE task_id = ? AND user_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
    )
    .get(taskId, user.id) as { id: number } | undefined;

  if (existingReview) {
    db.prepare(
      'UPDATE reviews SET due_date = ?, priority = ?, status = ? WHERE id = ?',
    ).run(dueDate, priority, 'pending', existingReview.id);
  } else {
    db.prepare(
      `
        INSERT INTO reviews (user_id, task_id, due_date, priority, status)
        VALUES (?, ?, ?, ?, 'pending')
      `,
    ).run(user.id, taskId, dueDate, priority);
  }

  res.json({ success: true });
});

tasksRouter.post('/:taskId/quick-action', (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const taskId = Number(req.params.taskId);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    jsonError(res, 400, 'Task id must be a positive integer.', 'INVALID_TASK_ID');
    return;
  }

  const action = String(req.body?.action ?? '').trim();
  if (!isQuickActionKind(action)) {
    jsonError(res, 400, 'Quick action type is invalid.', 'INVALID_QUICK_ACTION');
    return;
  }

  void (async () => {
    const task = loadTaskForUser(taskId, user.id);
    if (!task) {
      jsonError(res, 404, 'Task not found.', 'TASK_NOT_FOUND');
      return;
    }

    const cachedRow = db
      .prepare(
        `
          SELECT * FROM quick_actions
          WHERE task_id = ? AND user_id = ? AND action = ?
          ORDER BY updated_at DESC, id DESC
          LIMIT 1
        `,
      )
      .get(taskId, user.id, action) as QuickActionRow | undefined;

    if (cachedRow) {
      res.json({
        action: cachedRow.action,
        content: cachedRow.content,
        source: 'cache',
        updatedAt: cachedRow.updated_at,
      });
      return;
    }

    const goal = db
      .prepare('SELECT title FROM goals WHERE id = ? AND user_id = ?')
      .get(task.goal_id, user.id) as { title: string | null } | undefined;
    const resources = loadTaskResources(taskId, user.id);
    const content = await generateQuickActionContent({
      action,
      context: {
        taskTitle: task.title,
        taskDescription: task.description,
        goalTitle: goal?.title ?? null,
        resources,
      },
    });

    const timestamp = nowIso();
    const insertResult = db
      .prepare(
        `
          INSERT OR IGNORE INTO quick_actions (user_id, task_id, action, content, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(user.id, taskId, action, content, timestamp, timestamp);

    if (insertResult.changes === 0) {
      const existingRow = db
        .prepare(
          `
            SELECT * FROM quick_actions
            WHERE task_id = ? AND user_id = ? AND action = ?
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
          `,
        )
        .get(taskId, user.id, action) as QuickActionRow | undefined;

      if (existingRow) {
        res.json({
          action: existingRow.action,
          content: existingRow.content,
          source: 'cache',
          updatedAt: existingRow.updated_at,
        });
        return;
      }
    }

    res.json({
      action,
      content,
      source: 'generated',
      updatedAt: timestamp,
    });
  })().catch((error) => {
    if (error instanceof QuickActionGenerationError) {
      jsonError(res, 503, error.message, 'QUICK_ACTION_UNAVAILABLE');
      return;
    }

    console.error('Quick action request failed.', error);
    jsonError(res, 500, 'Something went wrong while preparing your quick action.', 'QUICK_ACTION_FAILED');
  });
});
