import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarMcpConfig,
  createCalendarEvents,
} from '../server/services/calendarMcpService.ts';

test('calendar MCP client initializes first, uses the bulk create-events contract, and normalizes partial results', async () => {
  const calls: Array<{
    endpoint: string;
    sessionId: string | null;
    request: { method: string; params?: Record<string, any> };
  }> = [];

  const result = await createCalendarEvents(
    [
      {
        localEventId: 11,
        summary: 'Study Session: Types',
        description: 'Review mapped types',
        startAt: '2026-04-10T12:00:00.000Z',
        endAt: '2026-04-10T14:00:00.000Z',
        attendees: [{ email: 'user@example.com', displayName: 'User One' }],
      },
      {
        localEventId: 12,
        summary: 'Study Session: Generics',
        description: 'Practice generic constraints',
        startAt: '2026-04-11T12:00:00.000Z',
        endAt: '2026-04-11T13:00:00.000Z',
        attendees: [{ email: 'user@example.com', displayName: 'User One' }],
      },
    ],
    {
      transport: async ({ endpoint, sessionId, request }) => {
        calls.push({ endpoint, sessionId, request: { method: request.method, params: request.params } });

        if (request.method === 'initialize') {
          return {
            status: 200,
            headers: new Headers({
              'content-type': 'application/json',
              'mcp-session-id': 'session-1',
            }),
            body: {
              jsonrpc: '2.0',
              id: 1,
              result: { protocolVersion: '2024-11-05' },
            },
          };
        }

        return {
          status: 200,
          headers: new Headers({
            'content-type': 'application/json',
          }),
          body: {
            jsonrpc: '2.0',
            id: 2,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    results: [
                      {
                        success: true,
                        eventId: 'evt-1',
                        calendarId: 'primary',
                        htmlLink: 'https://calendar.google.com/event?eid=1',
                      },
                      {
                        success: false,
                        error: 'quota exceeded',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        };
      },
    },
  );

  assert.equal(calls[0].endpoint, calendarMcpConfig.endpoint);
  assert.equal(calls[0].request.method, 'initialize');
  assert.equal(calls[1].sessionId, 'session-1');
  assert.equal(calls[1].request.method, 'tools/call');
  assert.equal(calls[1].request.params?.name, 'create-events');
  assert.deepEqual(calls[1].request.params?.arguments, {
    events: [
      {
        calendarId: 'primary',
        account: 'app',
        timeZone: 'Asia/Jakarta',
        sendUpdates: 'all',
        location: 'Online',
        summary: 'Study Session: Types',
        description: 'Review mapped types',
        start: '2026-04-10T12:00:00.000Z',
        end: '2026-04-10T14:00:00.000Z',
        attendees: [{ email: 'user@example.com', displayName: 'User One' }],
      },
      {
        calendarId: 'primary',
        account: 'app',
        timeZone: 'Asia/Jakarta',
        sendUpdates: 'all',
        location: 'Online',
        summary: 'Study Session: Generics',
        description: 'Practice generic constraints',
        start: '2026-04-11T12:00:00.000Z',
        end: '2026-04-11T13:00:00.000Z',
        attendees: [{ email: 'user@example.com', displayName: 'User One' }],
      },
    ],
  });
  assert.equal(result.status, 'partial');
  assert.deepEqual(result.results, [
    {
      localEventId: 11,
      status: 'synced',
      externalEventId: 'evt-1',
      externalCalendarId: 'primary',
      externalUrl: 'https://calendar.google.com/event?eid=1',
      error: null,
    },
    {
      localEventId: 12,
      status: 'failed',
      externalEventId: null,
      externalCalendarId: null,
      externalUrl: null,
      error: 'quota exceeded',
    },
  ]);
});