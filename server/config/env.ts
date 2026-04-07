export type DatabaseProvider = 'sqlite' | 'alloydb';
export type AgentProvider = 'legacy' | 'adk';

function normalizeDatabaseProvider(value: string | undefined): DatabaseProvider {
  return value === 'alloydb' ? 'alloydb' : 'sqlite';
}

function normalizeAgentProvider(value: string | undefined): AgentProvider {
  return value === 'adk' ? 'adk' : 'legacy';
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: readNumber(process.env.PORT, 3000),
  databaseProvider: normalizeDatabaseProvider(process.env.DB_PROVIDER),
  databaseFile: process.env.DATABASE_FILE || 'app.db',
  databaseUrl: process.env.DATABASE_URL ?? '',
  agentProvider: normalizeAgentProvider(process.env.AGENT_PROVIDER),
  adkServiceUrl: process.env.ADK_SERVICE_URL ?? '',
  mcpBaseUrl:
    process.env.MCP_BASE_URL ||
    `http://127.0.0.1:${readNumber(process.env.MCP_PORT, 3101)}`,
  mcpPort: readNumber(process.env.MCP_PORT, 3101),
  vertexProjectId: process.env.VERTEX_PROJECT_ID ?? '',
  alloydbInstance: process.env.ALLOYDB_INSTANCE ?? '',
  alloydbDatabase: process.env.ALLOYDB_DATABASE ?? '',
  alloydbUser: process.env.ALLOYDB_USER ?? '',
} as const;

export function requireDatabaseUrl() {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required when DB_PROVIDER=alloydb.');
  }

  return env.databaseUrl;
}

export function requireAdkServiceUrl() {
  if (!env.adkServiceUrl) {
    throw new Error('ADK_SERVICE_URL is required when AGENT_PROVIDER=adk.');
  }

  return env.adkServiceUrl;
}
