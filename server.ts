import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import crypto from 'crypto';
import express, { type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';

type UserRow = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

type TaskRow = {
  id: number;
  user_id: string;
  goal_id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  completed_at: string | null;
};

type StudySessionRow = {
  id: number;
  user_id: string;
  task_id: number;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number;
  reflection: string | null;
  confusion: string | null;
  confidence: number | null;
};

type SyllabusItem = {
  title: string;
  description: string;
};

const db = new Database('app.db');
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

function nowIso() {
  return new Date().toISOString();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function hasColumn(tableName: string, columnName: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
}

function ensureColumn(tableName: string, definition: string) {
  const columnName = definition.split(' ')[0];
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
}

function migrateDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      level TEXT,
      hours INTEGER,
      target_date TEXT,
      preferred_style TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      user_id TEXT,
      goal_id INTEGER,
      title TEXT,
      description TEXT,
      status TEXT,
      created_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY,
      user_id TEXT,
      task_id INTEGER,
      date TEXT,
      duration INTEGER
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      user_id TEXT,
      topic TEXT,
      content TEXT,
      kind TEXT DEFAULT 'plan',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      duration_seconds INTEGER DEFAULT 0,
      reflection TEXT,
      confusion TEXT,
      confidence INTEGER,
      FOREIGN KEY(task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY(task_id) REFERENCES tasks(id)
    );
  `);

  ensureColumn('goals', 'user_id TEXT');
  ensureColumn('goals', 'target_date TEXT');
  ensureColumn('goals', 'preferred_style TEXT');
  ensureColumn('goals', "status TEXT DEFAULT 'active'");
  ensureColumn('goals', 'created_at TEXT');

  ensureColumn('tasks', 'user_id TEXT');
  ensureColumn('tasks', 'created_at TEXT');
  ensureColumn('tasks', 'completed_at TEXT');

  ensureColumn('calendar_events', 'user_id TEXT');

  ensureColumn('notes', 'user_id TEXT');
  ensureColumn('notes', "kind TEXT DEFAULT 'plan'");
  ensureColumn('notes', 'created_at TEXT');

  db.exec(`
    UPDATE goals SET created_at = COALESCE(created_at, datetime('now')) WHERE created_at IS NULL;
    UPDATE goals SET status = COALESCE(status, 'active') WHERE status IS NULL;
    UPDATE tasks SET created_at = COALESCE(created_at, datetime('now')) WHERE created_at IS NULL;
    UPDATE notes SET created_at = COALESCE(created_at, datetime('now')) WHERE created_at IS NULL;
    UPDATE notes SET kind = COALESCE(kind, 'plan') WHERE kind IS NULL;
  `);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto.scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  return (
    expectedBuffer.length === actualHash.length &&
    crypto.timingSafeEqual(expectedBuffer, actualHash)
  );
}

function getBearerToken(req: Request) {
  const authHeader = req.header('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
}

function getAuthenticatedUser(req: Request): UserRow | null {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  const user = db
    .prepare(
      `
        SELECT users.id, users.name, users.email, users.created_at
        FROM auth_sessions
        INNER JOIN users ON users.id = auth_sessions.user_id
        WHERE auth_sessions.token = ?
      `,
    )
    .get(token) as UserRow | undefined;

  return user ?? null;
}

function requireUser(req: Request, res: Response) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return user;
}

function createSessionToken(userId: string) {
  const token = crypto.randomUUID();
  db.prepare('INSERT INTO auth_sessions (token, user_id, created_at) VALUES (?, ?, ?)')
    .run(token, userId, nowIso());
  return token;
}

function buildFallbackSyllabus(goal: string, level: string, preferredStyle?: string) {
  const styleLabel = preferredStyle ? ` using a ${preferredStyle.toLowerCase()} approach` : '';

  return [
    {
      title: `Foundations of ${goal}`,
      description: `Build the mental model, vocabulary, and first principles for ${goal} at a ${level.toLowerCase()} level${styleLabel}.`,
    },
    {
      title: `Guided practice for ${goal}`,
      description: `Work through focused exercises that turn the core ideas of ${goal} into repeatable habits.`,
    },
    {
      title: `Applied project for ${goal}`,
      description: `Ship one practical outcome that proves you can apply ${goal} beyond tutorials.`,
    },
  ];
}

async function generateSyllabus(goal: string, level: string, preferredStyle?: string) {
  if (!ai) {
    return buildFallbackSyllabus(goal, level, preferredStyle);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are a curriculum planner.
        Break down this learning goal into exactly 3 actionable study tasks.
        Goal: "${goal}"
        Level: "${level}"
        Preferred style: "${preferredStyle ?? 'mixed'}"
        Return only JSON.
      `,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['title', 'description'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '[]') as SyllabusItem[];
    if (parsed.length >= 3) {
      return parsed.slice(0, 3);
    }
  } catch (error) {
    console.error('Falling back to local syllabus generation.', error);
  }

  return buildFallbackSyllabus(goal, level, preferredStyle);
}

function buildEventSchedule(taskCount: number, weeklyHours: number) {
  const start = addDays(new Date(), 1);
  start.setHours(19, 0, 0, 0);

  const gap = Math.max(1, Math.floor(7 / Math.max(taskCount, 1)));
  const duration = Math.max(30, Math.min(120, Math.round((weeklyHours * 60) / Math.max(taskCount, 1))));

  return Array.from({ length: taskCount }, (_, index) => ({
    date: addDays(start, index * gap).toISOString(),
    duration,
  }));
}

function buildPlanSummary(goal: string, level: string, hours: number, syllabus: SyllabusItem[]) {
  const lines = syllabus.map((item, index) => `${index + 1}. ${item.title}: ${item.description}`);

  return [
    `Goal: ${goal}`,
    `Level: ${level}`,
    `Weekly hours: ${hours}`,
    ...lines,
  ].join('\n');
}

function getReviewSchedule(confidence: number | null) {
  if (confidence === null || confidence <= 2) {
    return { daysUntilReview: 2, priority: 'high' as const };
  }

  if (confidence === 3) {
    return { daysUntilReview: 4, priority: 'medium' as const };
  }

  return { daysUntilReview: 7, priority: 'low' as const };
}

migrateDatabase();

async function startServer() {
  const app = express();
  app.use(express.json());

  app.post('/api/auth/signup', (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    const email = normalizeEmail(String(req.body?.email ?? ''));
    const password = String(req.body?.password ?? '');

    if (!name || !email || password.length < 8) {
      res.status(400).json({ error: 'Name, email, and a password of at least 8 characters are required.' });
      return;
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
    if (existingUser) {
      res.status(409).json({ error: 'An account with that email already exists.' });
      return;
    }

    const userId = crypto.randomUUID();
    const createdAt = nowIso();
    const passwordHash = hashPassword(password);

    db.prepare(
      'INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(userId, name, email, passwordHash, createdAt);

    const token = createSessionToken(userId);
    res.status(201).json({
      token,
      user: {
        id: userId,
        name,
        email,
        created_at: createdAt,
      },
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = normalizeEmail(String(req.body?.email ?? ''));
    const password = String(req.body?.password ?? '');

    const user = db
      .prepare('SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?')
      .get(email) as (UserRow & { password_hash: string }) | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Incorrect email or password.' });
      return;
    }

    const token = createSessionToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
    });
  });

  app.get('/api/data', (req, res) => {
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

    res.json({ user, goals, tasks, events, notes, sessions, reviews });
  });

  app.post('/api/agent/workflow', async (req, res) => {
    const user = requireUser(req, res);
    if (!user) {
      return;
    }

    try {
      const goal = String(req.body?.goal ?? '').trim();
      const level = String(req.body?.level ?? 'Intermediate').trim();
      const hours = Math.max(1, Number(req.body?.hours ?? 1));
      const targetDate = req.body?.targetDate ? String(req.body.targetDate) : null;
      const preferredStyle = req.body?.preferredStyle ? String(req.body.preferredStyle) : null;

      if (!goal) {
        res.status(400).json({ error: 'A learning goal is required.' });
        return;
      }

      const createdAt = nowIso();
      const goalInsert = db
        .prepare(
          `
            INSERT INTO goals (user_id, title, level, hours, target_date, preferred_style, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
          `,
        )
        .run(user.id, goal, level, hours, targetDate, preferredStyle, createdAt);

      const goalId = Number(goalInsert.lastInsertRowid);
      const syllabus = await generateSyllabus(goal, level, preferredStyle ?? undefined);
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

      syllabus.forEach((item, index) => {
        const taskInsert = insertTask.run(user.id, goalId, item.title, item.description, createdAt);
        insertEvent.run(
          user.id,
          Number(taskInsert.lastInsertRowid),
          scheduledEvents[index].date,
          scheduledEvents[index].duration,
        );
      });

      db.prepare(
        `
          INSERT INTO notes (user_id, topic, content, kind, created_at)
          VALUES (?, ?, ?, 'plan', ?)
        `,
      ).run(user.id, goal, buildPlanSummary(goal, level, hours, syllabus), createdAt);

      res.status(201).json({ success: true, goalId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate a learning roadmap.' });
    }
  });

  app.post('/api/tasks/:taskId/start', (req, res) => {
    const user = requireUser(req, res);
    if (!user) {
      return;
    }

    const taskId = Number(req.params.taskId);
    const task = db
      .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .get(taskId, user.id) as TaskRow | undefined;

    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
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

  app.post('/api/tasks/:taskId/complete', (req, res) => {
    const user = requireUser(req, res);
    if (!user) {
      return;
    }

    const taskId = Number(req.params.taskId);
    const task = db
      .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .get(taskId, user.id) as TaskRow | undefined;

    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const reflection = String(req.body?.reflection ?? '').trim();
    const confusion = String(req.body?.confusion ?? '').trim();
    const confidence = req.body?.confidence === null || req.body?.confidence === undefined
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

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');
  });
}

startServer();
