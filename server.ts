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

type ResourceMode = 'has_materials' | 'needs_plan';

type ResourceType =
  | 'link'
  | 'course'
  | 'book'
  | 'article'
  | 'documentation'
  | 'notes'
  | 'video'
  | 'other';

type ResourceRow = {
  id: number;
  user_id: string;
  goal_id: number;
  title: string;
  type: ResourceType;
  reference: string | null;
  notes: string | null;
  source_kind: 'user_supplied' | 'system_suggested';
  created_at: string;
};

type TaskResourceRow = {
  id: number;
  user_id: string;
  task_id: number;
  resource_id: number;
  relevance_note: string | null;
};

type LearningResourceInput = {
  title: string;
  type: ResourceType;
  reference: string | null;
  notes: string | null;
};

const db = new Database(process.env.DATABASE_FILE || 'app.db');
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const VALID_RESOURCE_TYPES = new Set<ResourceType>([
  'link',
  'course',
  'book',
  'article',
  'documentation',
  'notes',
  'video',
  'other',
]);

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

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      goal_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      reference TEXT,
      notes TEXT,
      source_kind TEXT NOT NULL DEFAULT 'user_supplied',
      created_at TEXT NOT NULL,
      FOREIGN KEY(goal_id) REFERENCES goals(id)
    );

    CREATE TABLE IF NOT EXISTS task_resources (
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id INTEGER NOT NULL,
      resource_id INTEGER NOT NULL,
      relevance_note TEXT,
      FOREIGN KEY(task_id) REFERENCES tasks(id),
      FOREIGN KEY(resource_id) REFERENCES resources(id)
    );
  `);

  ensureColumn('goals', 'user_id TEXT');
  ensureColumn('goals', 'target_date TEXT');
  ensureColumn('goals', 'preferred_style TEXT');
  ensureColumn('goals', "status TEXT DEFAULT 'active'");
  ensureColumn('goals', 'created_at TEXT');
  ensureColumn('goals', "resource_mode TEXT DEFAULT 'needs_plan'");

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
    UPDATE goals SET resource_mode = COALESCE(resource_mode, 'needs_plan') WHERE resource_mode IS NULL;
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
    jsonError(res, 401, 'Your session has expired. Please sign in again.', 'AUTH_REQUIRED');
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

function sanitizeResourceInput(raw: unknown): LearningResourceInput[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      const candidate = item as Record<string, unknown>;
      const title = String(candidate?.title ?? '').trim();
      const type = String(candidate?.type ?? '').trim() as ResourceType;
      const reference = String(candidate?.reference ?? '').trim();
      const notes = String(candidate?.notes ?? '').trim();

      if (!title || !VALID_RESOURCE_TYPES.has(type)) {
        return null;
      }

      return {
        title,
        type,
        reference: reference || null,
        notes: notes || null,
      };
    })
    .filter((item): item is LearningResourceInput => Boolean(item));
}

function normalizeResourceMode(raw: unknown): ResourceMode {
  return raw === 'has_materials' ? 'has_materials' : 'needs_plan';
}

function jsonError(res: Response, status: number, error: string, code: string) {
  res.status(status).json({ error, code });
}

function buildFallbackSyllabus(
  goal: string,
  level: string,
  preferredStyle?: string,
  resources: LearningResourceInput[] = [],
  resourceMode: ResourceMode = 'needs_plan',
) {
  const styleLabel = preferredStyle ? ` using a ${preferredStyle.toLowerCase()} approach` : '';
  const resourceHint =
    resourceMode === 'has_materials' && resources.length > 0
      ? ` Anchor the work around materials like ${resources
          .slice(0, 2)
          .map((resource) => resource.title)
          .join(' and ')}.`
      : ' Start with a lightweight plan and gather one strong reference per task.';

  return [
    {
      title: `Foundations of ${goal}`,
      description: `Build the mental model, vocabulary, and first principles for ${goal} at a ${level.toLowerCase()} level${styleLabel}.${resourceHint}`,
    },
    {
      title: `Guided practice for ${goal}`,
      description:
        resourceMode === 'has_materials' && resources.length > 0
          ? `Work through focused exercises using your provided materials to turn the core ideas of ${goal} into repeatable habits.`
          : `Work through focused exercises that turn the core ideas of ${goal} into repeatable habits, and identify the best kind of resource to deepen each area.`,
    },
    {
      title: `Applied project for ${goal}`,
      description: `Ship one practical outcome that proves you can apply ${goal} beyond tutorials and passive study.`,
    },
  ];
}

async function generateSyllabus(
  goal: string,
  level: string,
  preferredStyle?: string,
  resources: LearningResourceInput[] = [],
  resourceMode: ResourceMode = 'needs_plan',
) {
  if (!ai) {
    return buildFallbackSyllabus(goal, level, preferredStyle, resources, resourceMode);
  }

  try {
    const resourceContext =
      resourceMode === 'has_materials' && resources.length > 0
        ? `
        Use these learner-provided materials as primary planning anchors:
        ${resources
          .map(
            (resource, index) =>
              `${index + 1}. [${resource.type}] ${resource.title}${resource.reference ? ` | ${resource.reference}` : ''}${resource.notes ? ` | Notes: ${resource.notes}` : ''}`,
          )
          .join('\n')}
      `
        : `
        The learner does not have materials yet.
        Generate a roadmap that acts like a starter curriculum and make each task self-starting.
      `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are a curriculum planner.
        Break down this learning goal into exactly 3 actionable study tasks.
        Goal: "${goal}"
        Level: "${level}"
        Preferred style: "${preferredStyle ?? 'mixed'}"
        Resource mode: "${resourceMode}"
        ${resourceContext}
        Each task description should either reference the learner materials or explain how to begin without them.
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

  return buildFallbackSyllabus(goal, level, preferredStyle, resources, resourceMode);
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

function buildPlanSummary(
  goal: string,
  level: string,
  hours: number,
  syllabus: SyllabusItem[],
  resourceMode: ResourceMode,
  resources: LearningResourceInput[],
) {
  const lines = syllabus.map((item, index) => `${index + 1}. ${item.title}: ${item.description}`);
  const resourceSection =
    resourceMode === 'has_materials' && resources.length > 0
      ? [
          'Planning mode: learner-provided materials',
          'Resources:',
          ...resources.map(
            (resource, index) =>
              `- ${index + 1}. ${resource.title} [${resource.type}]${resource.reference ? ` | ${resource.reference}` : ''}`,
          ),
        ]
      : [
          'Planning mode: generated starting plan',
          'Recommended resource types to gather next:',
          '- One primary reference (documentation, book chapter, or course module)',
          '- One practice-oriented resource (exercise, sandbox, or project prompt)',
          '- One reinforcement resource (article, recap note, or worked example)',
        ];

  return [
    `Goal: ${goal}`,
    `Level: ${level}`,
    `Weekly hours: ${hours}`,
    ...resourceSection,
    ...lines,
  ].join('\n');
}

function buildResourceNote(goal: string, resourceMode: ResourceMode, resources: LearningResourceInput[]) {
  if (resourceMode === 'has_materials' && resources.length > 0) {
    return [
      `Resource posture for ${goal}: learner-supplied materials`,
      ...resources.map(
        (resource, index) =>
          `${index + 1}. ${resource.title} [${resource.type}]${resource.reference ? ` | ${resource.reference}` : ''}`,
      ),
    ].join('\n');
  }

  return [
    `Resource posture for ${goal}: start-from-zero plan`,
    'Next best resource types:',
    '1. A trusted primary reference',
    '2. A practice environment or exercise source',
    '3. A concise recap or example-based explanation',
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
      jsonError(
        res,
        400,
        'Name, email, and a password of at least 8 characters are required.',
        'INVALID_AUTH_PAYLOAD',
      );
      return;
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
    if (existingUser) {
      jsonError(res, 409, 'An account with that email already exists.', 'EMAIL_IN_USE');
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
      jsonError(res, 401, 'Incorrect email or password.', 'INVALID_CREDENTIALS');
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
    const resources = db
      .prepare('SELECT * FROM resources WHERE user_id = ? ORDER BY created_at ASC, id ASC')
      .all(user.id);
    const task_resources = db
      .prepare('SELECT * FROM task_resources WHERE user_id = ? ORDER BY id ASC')
      .all(user.id);

    res.json({ user, goals, tasks, events, notes, sessions, reviews, resources, task_resources });
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
      const resourceMode = normalizeResourceMode(req.body?.resourceMode);
      const resources = sanitizeResourceInput(req.body?.resources);

      if (!goal) {
        jsonError(res, 400, 'A learning goal is required.', 'GOAL_REQUIRED');
        return;
      }

      if (resourceMode === 'has_materials' && resources.length === 0) {
        jsonError(
          res,
          400,
          'Add at least one resource or switch to the starting-plan mode.',
          'RESOURCES_REQUIRED',
        );
        return;
      }

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

      res.status(201).json({ success: true, goalId });
    } catch (error) {
      console.error(error);
      jsonError(res, 500, 'Failed to generate a learning roadmap.', 'WORKFLOW_GENERATION_FAILED');
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
      jsonError(res, 404, 'Task not found.', 'TASK_NOT_FOUND');
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

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
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

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();
