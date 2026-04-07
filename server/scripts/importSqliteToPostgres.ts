import Database from 'better-sqlite3';
import { Pool } from 'pg';

const sqliteFile = process.env.SQLITE_IMPORT_FILE || process.env.DATABASE_FILE || 'app.db';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for SQLite-to-Postgres import.');
}

const sqlite = new Database(sqliteFile, { readonly: true });
const pool = new Pool({ connectionString: databaseUrl });

const tableOrder = [
  'users',
  'auth_sessions',
  'goals',
  'tasks',
  'calendar_events',
  'notes',
  'study_sessions',
  'reviews',
  'resources',
  'task_resources',
  'quick_actions',
  'agent_runs',
  'agent_run_events',
  'retrieval_sources',
  'document_embeddings',
] as const;

function getColumnNames(tableName: string) {
  return (sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>).map((column) => column.name);
}

function getRows(tableName: string) {
  return sqlite.prepare(`SELECT * FROM ${tableName}`).all() as Array<Record<string, unknown>>;
}

async function importTable(tableName: string) {
  const columns = getColumnNames(tableName);
  if (columns.length === 0) {
    return;
  }

  const rows = getRows(tableName);
  if (rows.length === 0) {
    console.log(`Skipping ${tableName}: no rows`);
    return;
  }

  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const columnList = columns.join(', ');
  const query = `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  for (const row of rows) {
    await pool.query(query, columns.map((column) => row[column] ?? null));
  }

  console.log(`Imported ${rows.length} row(s) into ${tableName}`);
}

async function syncSequence(tableName: string) {
  const idColumn = getColumnNames(tableName).find((column) => column === 'id');
  if (!idColumn) {
    return;
  }

  const sequenceName = `${tableName}_id_seq`;
  await pool.query(
    `
      SELECT setval($1, COALESCE((SELECT MAX(id) FROM ${tableName}), 1), true)
    `,
    [sequenceName],
  ).catch(() => {
    // Not every table uses a sequence-backed integer id. Ignore when absent.
  });
}

async function main() {
  for (const tableName of tableOrder) {
    await importTable(tableName);
  }

  for (const tableName of tableOrder) {
    await syncSequence(tableName);
  }

  for (const tableName of tableOrder) {
    const sqliteCount = getRows(tableName).length;
    const pgCountResult = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${tableName}`);
    const postgresCount = Number(pgCountResult.rows[0]?.count ?? '0');
    console.log(`${tableName}: sqlite=${sqliteCount} postgres=${postgresCount}`);
  }
}

main()
  .catch((error) => {
    console.error('Import failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await pool.end();
  });
