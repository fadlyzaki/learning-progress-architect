import crypto from 'crypto';
import { google, type calendar_v3 } from 'googleapis';
import { env, requireGoogleCalendarConfig } from '../config/env.ts';
import { nowIso } from '../utils/date.ts';
import type { AppRepositories } from '../repositories/types.ts';
import type {
  GoogleCalendarConnectionRow,
  GoogleCalendarSyncEvent,
  GoogleCalendarSyncSummary,
  UserRow,
} from '../types.ts';

const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events.owned'];
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_CALENDAR_ID = 'primary';

export type GoogleCalendarStatus = {
  configured: boolean;
  connected: boolean;
  status: 'disabled' | 'disconnected' | GoogleCalendarConnectionRow['status'];
  calendarId: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  summary: GoogleCalendarSyncSummary;
};

export type GoogleCalendarSyncResult = GoogleCalendarSyncSummary & {
  syncedAt: string | null;
};

export interface CalendarApiClient {
  insertEvent(input: {
    calendarId: string;
    eventId: string;
    event: calendar_v3.Schema$Event;
  }): Promise<{ id: string | null }>;
  updateEvent(input: {
    calendarId: string;
    eventId: string;
    event: calendar_v3.Schema$Event;
  }): Promise<{ id: string | null }>;
  revoke?(): Promise<void>;
}

export class GoogleCalendarIntegrationError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'GoogleCalendarIntegrationError';
    this.status = status;
    this.code = code;
  }
}

class GoogleCalendarApiClient implements CalendarApiClient {
  private calendar: calendar_v3.Calendar;

  constructor(private refreshToken: string) {
    const config = requireGoogleCalendarConfig();
    const oauthClient = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
    oauthClient.setCredentials({ refresh_token: refreshToken });
    this.calendar = google.calendar({ version: 'v3', auth: oauthClient });
  }

  async insertEvent(input: {
    calendarId: string;
    eventId: string;
    event: calendar_v3.Schema$Event;
  }) {
    const response = await this.calendar.events.insert({
      calendarId: input.calendarId,
      requestBody: {
        ...input.event,
        id: input.eventId,
      },
    });
    return { id: response.data.id ?? null };
  }

  async updateEvent(input: {
    calendarId: string;
    eventId: string;
    event: calendar_v3.Schema$Event;
  }) {
    const response = await this.calendar.events.patch({
      calendarId: input.calendarId,
      eventId: input.eventId,
      requestBody: input.event,
    });
    return { id: response.data.id ?? null };
  }

  async revoke() {
    const config = requireGoogleCalendarConfig();
    const oauthClient = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
    oauthClient.setCredentials({ refresh_token: this.refreshToken });
    await oauthClient.revokeCredentials();
  }
}

export function isGoogleCalendarConfigured() {
  return Boolean(
    env.googleCalendarSyncEnabled &&
    env.googleClientId &&
    env.googleClientSecret &&
    env.googleTokenEncryptionKey,
  );
}

export async function getGoogleCalendarStatus(
  repositories: AppRepositories,
  userId: string,
): Promise<GoogleCalendarStatus> {
  const summary = await repositories.googleCalendar.getSyncSummary(userId);

  if (!isGoogleCalendarConfigured()) {
    return {
      configured: false,
      connected: false,
      status: 'disabled',
      calendarId: null,
      lastSyncedAt: null,
      lastError: null,
      summary,
    };
  }

  const connection = await repositories.googleCalendar.getConnection(userId);
  if (!connection) {
    return {
      configured: true,
      connected: false,
      status: 'disconnected',
      calendarId: null,
      lastSyncedAt: null,
      lastError: null,
      summary,
    };
  }

  return {
    configured: true,
    connected: connection.status === 'connected',
    status: connection.status,
    calendarId: connection.calendar_id,
    lastSyncedAt: connection.last_synced_at,
    lastError: connection.last_error,
    summary,
  };
}

export async function createGoogleCalendarAuthUrl(repositories: AppRepositories, user: UserRow) {
  const config = requireGoogleCalendarConfig();
  const oauthClient = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  const state = crypto.randomBytes(32).toString('base64url');
  const timestamp = new Date();

  await repositories.googleCalendar.createOAuthState({
    userId: user.id,
    stateHash: hashState(state),
    expiresAt: new Date(timestamp.getTime() + OAUTH_STATE_TTL_MS).toISOString(),
    createdAt: timestamp.toISOString(),
  });

  return oauthClient.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    prompt: 'consent',
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });
}

export async function handleGoogleCalendarOAuthCallback(
  repositories: AppRepositories,
  input: {
    code: string;
    state: string;
  },
) {
  const config = requireGoogleCalendarConfig();
  const consumedAt = nowIso();
  const state = await repositories.googleCalendar.consumeOAuthState(hashState(input.state), consumedAt);
  if (!state) {
    throw new GoogleCalendarIntegrationError(
      'Google Calendar authorization expired. Please reconnect from the dashboard.',
      400,
      'GOOGLE_CALENDAR_STATE_INVALID',
    );
  }

  const oauthClient = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  const tokenResult = await oauthClient.getToken(input.code);
  const refreshToken = tokenResult.tokens.refresh_token;

  if (!refreshToken) {
    throw new GoogleCalendarIntegrationError(
      'Google did not return offline access. Please reconnect and approve Calendar access again.',
      400,
      'GOOGLE_CALENDAR_REFRESH_TOKEN_MISSING',
    );
  }

  await repositories.googleCalendar.saveConnection({
    userId: state.userId,
    encryptedRefreshToken: encryptToken(refreshToken, config.tokenEncryptionKey),
    calendarId: DEFAULT_CALENDAR_ID,
    grantedScopes: tokenResult.tokens.scope ?? GOOGLE_CALENDAR_SCOPES.join(' '),
    status: 'connected',
    connectedAt: nowIso(),
  });
}

export async function disconnectGoogleCalendar(repositories: AppRepositories, userId: string) {
  const connection = await repositories.googleCalendar.getConnection(userId);

  if (connection && isGoogleCalendarConfigured()) {
    const config = requireGoogleCalendarConfig();
    const refreshToken = decryptToken(connection.encrypted_refresh_token, config.tokenEncryptionKey);
    const client = new GoogleCalendarApiClient(refreshToken);
    await client.revoke?.().catch(() => undefined);
  }

  await repositories.googleCalendar.disconnect(userId);
}

export async function syncGoogleCalendarEvents(
  repositories: AppRepositories,
  userId: string,
  calendarClient?: CalendarApiClient,
): Promise<GoogleCalendarSyncResult> {
  const connection = await repositories.googleCalendar.getConnection(userId);
  if (!connection) {
    throw new GoogleCalendarIntegrationError(
      'Connect Google Calendar before syncing your study schedule.',
      409,
      'GOOGLE_CALENDAR_NOT_CONNECTED',
    );
  }

  const client =
    calendarClient ??
    new GoogleCalendarApiClient(
      decryptToken(connection.encrypted_refresh_token, requireGoogleCalendarConfig().tokenEncryptionKey),
    );
  const events = await repositories.googleCalendar.listSyncEvents(userId);
  const calendarId = connection.calendar_id || DEFAULT_CALENDAR_ID;
  const syncedAt = nowIso();
  let synced = 0;
  let failed = 0;

  for (const event of events) {
    const googleEventId = event.google_event_id || buildGoogleEventId(userId, event.id);

    try {
      const payload = buildGoogleEventPayload(event);
      if (event.google_event_id) {
        await patchOrInsertEvent(client, calendarId, googleEventId, payload);
      } else {
        await insertOrPatchEvent(client, calendarId, googleEventId, payload);
      }

      await repositories.googleCalendar.updateEventSync({
        userId,
        eventId: event.id,
        googleCalendarId: calendarId,
        googleEventId,
        googleSyncStatus: 'synced',
        googleSyncedAt: syncedAt,
        googleSyncError: null,
      });
      synced += 1;
    } catch (error) {
      failed += 1;
      await repositories.googleCalendar.updateEventSync({
        userId,
        eventId: event.id,
        googleCalendarId: calendarId,
        googleEventId,
        googleSyncStatus: 'failed',
        googleSyncedAt: null,
        googleSyncError: normalizeErrorMessage(error),
      });
    }
  }

  if (failed > 0) {
    await repositories.googleCalendar.markConnectionError(
      userId,
      `${failed} study block${failed === 1 ? '' : 's'} could not be synced.`,
    );
  } else {
    await repositories.googleCalendar.markConnectionSynced(userId, syncedAt);
  }

  return {
    total: events.length,
    synced,
    failed,
    pending: 0,
    syncedAt: failed > 0 ? null : syncedAt,
  };
}

async function insertOrPatchEvent(
  client: CalendarApiClient,
  calendarId: string,
  eventId: string,
  event: calendar_v3.Schema$Event,
) {
  try {
    return await client.insertEvent({ calendarId, eventId, event });
  } catch (error) {
    if (getGoogleErrorStatus(error) === 409) {
      return client.updateEvent({ calendarId, eventId, event });
    }

    throw error;
  }
}

async function patchOrInsertEvent(
  client: CalendarApiClient,
  calendarId: string,
  eventId: string,
  event: calendar_v3.Schema$Event,
) {
  try {
    return await client.updateEvent({ calendarId, eventId, event });
  } catch (error) {
    if (getGoogleErrorStatus(error) === 404) {
      return client.insertEvent({ calendarId, eventId, event });
    }

    throw error;
  }
}

function buildGoogleEventPayload(event: GoogleCalendarSyncEvent): calendar_v3.Schema$Event {
  const start = new Date(event.date);
  const end = new Date(start.getTime() + Math.max(1, event.duration) * 60 * 1000);

  if (Number.isNaN(start.getTime())) {
    throw new Error('Study block has an invalid start date.');
  }

  const sessionUrl = `${env.appBaseUrl}/app/session/${event.task_id}`;
  return {
    summary: `Study: ${event.task_title}`,
    description: [
      event.goal_title ? `Goal: ${event.goal_title}` : null,
      event.task_description,
      `Open the study session: ${sessionUrl}`,
      'Google Calendar mirrors this study block. Learning Progress Architect remains the source of truth.',
    ].filter(Boolean).join('\n\n'),
    start: {
      dateTime: start.toISOString(),
    },
    end: {
      dateTime: end.toISOString(),
    },
    visibility: 'private',
    transparency: 'opaque',
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 10 }],
    },
    source: {
      title: 'Learning Progress Architect',
      url: sessionUrl,
    },
    extendedProperties: {
      private: {
        app: 'learning-progress-architect',
        calendarEventId: String(event.id),
        taskId: String(event.task_id),
      },
    },
  };
}

function buildGoogleEventId(userId: string, eventId: number) {
  return `lpa${crypto.createHash('sha256').update(`${userId}:${eventId}`).digest('hex').slice(0, 48)}`;
}

function hashState(state: string) {
  return crypto.createHash('sha256').update(state).digest('hex');
}

export function encryptToken(token: string, rawKey: string) {
  const key = normalizeEncryptionKey(rawKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptToken(payload: string, rawKey: string) {
  const [version, ivText, tagText, encryptedText] = payload.split('.');
  if (version !== 'v1' || !ivText || !tagText || !encryptedText) {
    throw new Error('Stored Google Calendar token uses an unsupported format.');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    normalizeEncryptionKey(rawKey),
    Buffer.from(ivText, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function normalizeEncryptionKey(rawKey: string) {
  const base64 = Buffer.from(rawKey, 'base64');
  if (base64.length === 32) {
    return base64;
  }

  const hex = Buffer.from(rawKey, 'hex');
  if (hex.length === 32) {
    return hex;
  }

  return crypto.createHash('sha256').update(rawKey).digest();
}

function getGoogleErrorStatus(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const maybeError = error as { code?: unknown; status?: unknown; response?: { status?: unknown } };
  const value = maybeError.code ?? maybeError.status ?? maybeError.response?.status;
  return typeof value === 'number' ? value : null;
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 500);
  }

  return 'Google Calendar sync failed.';
}
