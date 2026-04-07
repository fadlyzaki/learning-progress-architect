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

    CREATE TABLE IF NOT EXISTS quick_actions (
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, task_id, action),
      FOREIGN KEY(task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      kind TEXT NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      request_id TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_run_events (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id)
    );

    CREATE TABLE IF NOT EXISTS retrieval_sources (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_embeddings (
      id TEXT PRIMARY KEY,
      retrieval_source_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      embedding_model TEXT NOT NULL,
      embedding TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(retrieval_source_id) REFERENCES retrieval_sources(id)
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
