import { Pool } from 'pg';
import { env, requireDatabaseUrl } from './config/env.ts';
import { db, migrateDatabase } from './db.ts';
import { createPostgresRepositories } from './repositories/postgres/index.ts';
import { createSQLiteRepositories } from './repositories/sqlite/index.ts';
import { createAgentRuntime } from './services/agentRuntime.ts';
import type { AppRepositories } from './repositories/types.ts';

type AppContext = {
  repositories: AppRepositories;
  agents: ReturnType<typeof createAgentRuntime>;
  postgresPool: Pool | null;
};

let appContext: AppContext | null = null;

export async function initializeAppContext() {
  if (appContext) {
    return appContext;
  }

  if (env.databaseProvider === 'alloydb') {
    const pool = new Pool({
      connectionString: requireDatabaseUrl(),
      max: 10,
    });
    await pool.query('SELECT 1');
    const repositories = createPostgresRepositories(pool);
    appContext = {
      repositories,
      agents: createAgentRuntime(repositories),
      postgresPool: pool,
    };
    return appContext;
  }

  migrateDatabase();
  const repositories = createSQLiteRepositories(db);
  appContext = {
    repositories,
    agents: createAgentRuntime(repositories),
    postgresPool: null,
  };
  return appContext;
}

export function getAppContext() {
  if (!appContext) {
    throw new Error('App context has not been initialized yet.');
  }

  return appContext;
}
