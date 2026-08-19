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

function readBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: readNumber(process.env.PORT, 3000),
  databaseProvider: normalizeDatabaseProvider(process.env.DB_PROVIDER),
  databaseFile:
    process.env.DATABASE_FILE ||
    (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp/app.db' : 'app.db'),
  databaseUrl: process.env.DATABASE_URL ?? '',
  agentProvider: normalizeAgentProvider(process.env.AGENT_PROVIDER),
  adkServiceUrl: process.env.ADK_SERVICE_URL ?? '',
  appBaseUrl:
    process.env.APP_BASE_URL ||
    process.env.APP_URL ||
    `http://localhost:${readNumber(process.env.PORT, 3000)}`,
  internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN ?? '',
  mcpBaseUrl:
    process.env.MCP_BASE_URL ||
    `http://127.0.0.1:${readNumber(process.env.MCP_PORT, 3101)}`,
  mcpPort: readNumber(process.env.MCP_PORT, 3101),
  vertexProjectId: process.env.VERTEX_PROJECT_ID ?? '',
  alloydbInstance: process.env.ALLOYDB_INSTANCE ?? '',
  alloydbDatabase: process.env.ALLOYDB_DATABASE ?? '',
  alloydbUser: process.env.ALLOYDB_USER ?? '',
  googleCalendarSyncEnabled: readBoolean(process.env.GOOGLE_CALENDAR_SYNC_ENABLED),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleOAuthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? '',
  googleTokenEncryptionKey: process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? '',
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

export function requireAppBaseUrl() {
  if (!env.appBaseUrl) {
    throw new Error('APP_BASE_URL is required for internal service communication.');
  }

  return env.appBaseUrl;
}

export function requireInternalServiceToken() {
  if (!env.internalServiceToken) {
    throw new Error('INTERNAL_SERVICE_TOKEN is required for internal service communication.');
  }

  return env.internalServiceToken;
}

export function getInternalServiceHeaders() {
  return {
    'x-internal-service-token': requireInternalServiceToken(),
  };
}

export function getGoogleOAuthRedirectUri() {
  return env.googleOAuthRedirectUri || `${env.appBaseUrl}/api/integrations/google-calendar/callback`;
}

export function requireGoogleCalendarConfig() {
  if (!env.googleCalendarSyncEnabled) {
    throw new Error('Google Calendar sync is disabled.');
  }

  if (!env.googleClientId || !env.googleClientSecret || !env.googleTokenEncryptionKey) {
    throw new Error('Google Calendar integration is not configured.');
  }

  return {
    clientId: env.googleClientId,
    clientSecret: env.googleClientSecret,
    redirectUri: getGoogleOAuthRedirectUri(),
    tokenEncryptionKey: env.googleTokenEncryptionKey,
  };
}
