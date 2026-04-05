import { Router } from 'express';
import { db } from '../db.ts';
import { requireUser } from '../middleware/auth.ts';
import { jsonError } from '../utils/http.ts';
import { nowIso, addDays } from '../utils/date.ts';
import { getReviewSchedule } from '../services/reviewService.ts';
import type { TaskRow, StudySessionRow } from '../types.ts';

export const tasksRouter = Router();

tasksRouter.post('/:taskId/start', (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const taskId = Number(req.params.taskId);
  const task = db
    .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .get(taskId, user.id) as TaskRow | undefined;

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
  const task = db
    .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .get(taskId, user.id) as TaskRow | undefined;

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
