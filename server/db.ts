import Database from 'better-sqlite3';

export const db = new Database(process.env.DATABASE_FILE || 'app.db');

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

export function migrateDatabase() {
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
      duration INTEGER,
      provider TEXT DEFAULT 'google_calendar',
      external_event_id TEXT,
      external_calendar_id TEXT,
      status TEXT DEFAULT 'pending',
      sync_error TEXT,
      synced_at TEXT,
      external_url TEXT
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
  ensureColumn('calendar_events', "provider TEXT DEFAULT 'google_calendar'");
  ensureColumn('calendar_events', 'external_event_id TEXT');
  ensureColumn('calendar_events', 'external_calendar_id TEXT');
  ensureColumn('calendar_events', "status TEXT DEFAULT 'pending'");
  ensureColumn('calendar_events', 'sync_error TEXT');
  ensureColumn('calendar_events', 'synced_at TEXT');
  ensureColumn('calendar_events', 'external_url TEXT');

  ensureColumn('notes', 'user_id TEXT');
  ensureColumn('notes', "kind TEXT DEFAULT 'plan'");
  ensureColumn('notes', 'created_at TEXT');

  db.exec(`
    UPDATE goals SET created_at = COALESCE(created_at, datetime('now')) WHERE created_at IS NULL;
    UPDATE goals SET status = COALESCE(status, 'active') WHERE status IS NULL;
    UPDATE goals SET resource_mode = COALESCE(resource_mode, 'needs_plan') WHERE resource_mode IS NULL;
    UPDATE tasks SET created_at = COALESCE(created_at, datetime('now')) WHERE created_at IS NULL;
    UPDATE calendar_events SET provider = COALESCE(provider, 'google_calendar') WHERE provider IS NULL;
    UPDATE calendar_events SET status = COALESCE(status, 'pending') WHERE status IS NULL;
    UPDATE notes SET created_at = COALESCE(created_at, datetime('now')) WHERE created_at IS NULL;
    UPDATE notes SET kind = COALESCE(kind, 'plan') WHERE kind IS NULL;
  `);
}
