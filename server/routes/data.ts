import { Router } from 'express';
import { db } from '../db.ts';
import { requireUser } from '../middleware/auth.ts';

export const dataRouter = Router();

dataRouter.get('/', (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const goals = db
    .prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .all(user.id);
  const tasks = db
    .prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY id ASC')
    .all(user.id);
  const events = db
    .prepare('SELECT * FROM calendar_events WHERE user_id = ? ORDER BY date ASC, id ASC')
    .all(user.id);
  const notes = db
    .prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .all(user.id);
  const sessions = db
    .prepare('SELECT * FROM study_sessions WHERE user_id = ? ORDER BY started_at DESC, id DESC')
    .all(user.id);
  const reviews = db
    .prepare('SELECT * FROM reviews WHERE user_id = ? ORDER BY due_date ASC, id ASC')
    .all(user.id);
  const resources = db
    .prepare('SELECT * FROM resources WHERE user_id = ? ORDER BY created_at ASC, id ASC')
    .all(user.id);
  const task_resources = db
    .prepare('SELECT * FROM task_resources WHERE user_id = ? ORDER BY id ASC')
    .all(user.id);
  const quick_actions = db
    .prepare('SELECT * FROM quick_actions WHERE user_id = ? ORDER BY updated_at DESC, id DESC')
    .all(user.id);

  res.json({ user, goals, tasks, events, notes, sessions, reviews, resources, task_resources, quick_actions });
});
