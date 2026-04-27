import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decryptToken,
  encryptToken,
  syncGoogleCalendarEvents,
  type CalendarApiClient,
} from '../server/services/googleCalendarService.ts';
import type { AppRepositories } from '../server/repositories/types.ts';
import type {
  GoogleCalendarConnectionRow,
  GoogleCalendarSyncEvent,
  GoogleCalendarSyncSummary,
} from '../server/types.ts';

test('Google Calendar token encryption round-trips without storing plaintext', () => {
  const key = 'calendar-test-key';
  const token = 'refresh-token-value';
  const encrypted = encryptToken(token, key);

  assert.notEqual(encrypted, token);
  assert.equal(decryptToken(encrypted, key), token);
});

test('Google Calendar sync inserts local study blocks and marks the connection synced', async () => {
  const repositories = createCalendarRepositories([
    buildSyncEvent({ id: 10, task_id: 20, google_event_id: null }),
  ]);
  const calendar = new FakeCalendarClient();

  const result = await syncGoogleCalendarEvents(repositories, 'user-1', calendar);

  assert.equal(result.synced, 1);
  assert.equal(result.failed, 0);
  assert.equal(calendar.inserts.length, 1);
  assert.equal(calendar.inserts[0].event.summary, 'Study: Task 20');
  assert.equal(repositories.state.eventUpdates[0].googleSyncStatus, 'synced');
  assert.equal(repositories.state.syncedAt !== null, true);
});

test('Google Calendar sync patches existing remote events', async () => {
  const repositories = createCalendarRepositories([
    buildSyncEvent({ id: 10, task_id: 20, google_event_id: 'existing-event' }),
  ]);
  const calendar = new FakeCalendarClient();

  await syncGoogleCalendarEvents(repositories, 'user-1', calendar);

  assert.equal(calendar.inserts.length, 0);
  assert.equal(calendar.patches.length, 1);
  assert.equal(calendar.patches[0].eventId, 'existing-event');
});

test('Google Calendar sync patches after idempotent insert conflict', async () => {
  const repositories = createCalendarRepositories([
    buildSyncEvent({ id: 10, task_id: 20, google_event_id: null }),
  ]);
  const calendar = new FakeCalendarClient();
  calendar.insertError = Object.assign(new Error('Event already exists.'), { code: 409 });

  const result = await syncGoogleCalendarEvents(repositories, 'user-1', calendar);

  assert.equal(result.synced, 1);
  assert.equal(result.failed, 0);
  assert.equal(calendar.inserts.length, 1);
  assert.equal(calendar.patches.length, 1);
});

test('Google Calendar sync keeps local events and records failures when Google rejects writes', async () => {
  const repositories = createCalendarRepositories([
    buildSyncEvent({ id: 10, task_id: 20, google_event_id: null }),
  ]);
  const calendar = new FakeCalendarClient();
  calendar.insertError = new Error('invalid_grant');

  const result = await syncGoogleCalendarEvents(repositories, 'user-1', calendar);

  assert.equal(result.synced, 0);
  assert.equal(result.failed, 1);
  assert.equal(repositories.state.eventUpdates[0].googleSyncStatus, 'failed');
  assert.equal(repositories.state.connectionError, '1 study block could not be synced.');
});

test('Google Calendar sync rejects with a clear error when no connection exists', async () => {
  const repositories = createCalendarRepositories([]);
  // Override getConnection to return null (no connection)
  repositories.googleCalendar.getConnection = async () => null;

  await assert.rejects(
    () => syncGoogleCalendarEvents(repositories, 'user-1', new FakeCalendarClient()),
    (error: Error) => {
      assert.match(error.message, /Connect Google Calendar/);
      return true;
    },
  );
});

class FakeCalendarClient implements CalendarApiClient {
  inserts: Array<{ calendarId: string; eventId: string; event: { summary?: string | null } }> = [];
  patches: Array<{ calendarId: string; eventId: string; event: { summary?: string | null } }> = [];
  insertError: unknown = null;
  patchError: unknown = null;

  async insertEvent(input: Parameters<CalendarApiClient['insertEvent']>[0]) {
    this.inserts.push(input);
    if (this.insertError) {
      throw this.insertError;
    }

    return { id: input.eventId };
  }

  async updateEvent(input: Parameters<CalendarApiClient['updateEvent']>[0]) {
    this.patches.push(input);
    if (this.patchError) {
      throw this.patchError;
    }

    return { id: input.eventId };
  }
}

function createCalendarRepositories(events: GoogleCalendarSyncEvent[]) {
  const state = {
    syncedAt: null as string | null,
    connectionError: null as string | null,
    eventUpdates: [] as Array<{
      eventId: number;
      googleEventId: string | null;
      googleSyncStatus: 'synced' | 'failed';
    }>,
  };
  const connection: GoogleCalendarConnectionRow = {
    user_id: 'user-1',
    encrypted_refresh_token: 'encrypted',
    calendar_id: 'primary',
    granted_scopes: null,
    status: 'connected',
    connected_at: new Date().toISOString(),
    last_synced_at: null,
    last_error: null,
  };
  const summary: GoogleCalendarSyncSummary = {
    total: events.length,
    synced: 0,
    failed: 0,
    pending: events.length,
  };

  return {
    state,
    googleCalendar: {
      async getConnection() {
        return connection;
      },
      async saveConnection() {
        return connection;
      },
      async markConnectionSynced(_userId: string, syncedAt: string) {
        state.syncedAt = syncedAt;
      },
      async markConnectionError(_userId: string, error: string) {
        state.connectionError = error;
      },
      async disconnect() {},
      async createOAuthState() {},
      async consumeOAuthState() {
        return null;
      },
      async listSyncEvents() {
        return events;
      },
      async getSyncSummary() {
        return summary;
      },
      async updateEventSync(input: {
        eventId: number;
        googleEventId: string | null;
        googleSyncStatus: 'synced' | 'failed';
      }) {
        state.eventUpdates.push({
          eventId: input.eventId,
          googleEventId: input.googleEventId,
          googleSyncStatus: input.googleSyncStatus,
        });
      },
    },
  } as unknown as AppRepositories & { state: typeof state };
}

function buildSyncEvent(input: { id: number; task_id: number; google_event_id: string | null }): GoogleCalendarSyncEvent {
  return {
    id: input.id,
    user_id: 'user-1',
    task_id: input.task_id,
    date: '2026-04-28T12:00:00.000Z',
    duration: 45,
    google_calendar_id: input.google_event_id ? 'primary' : null,
    google_event_id: input.google_event_id,
    google_sync_status: input.google_event_id ? 'synced' : 'not_synced',
    google_synced_at: null,
    google_sync_error: null,
    task_title: `Task ${input.task_id}`,
    task_description: 'Practice the next learning objective.',
    goal_title: 'Calendar integration',
  };
}
