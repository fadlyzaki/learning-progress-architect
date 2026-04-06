import type {
  CalendarEventSyncBatchResult,
  CalendarEventSyncResult,
  CalendarMcpBulkCreatePayload,
  CalendarMcpEventPayload,
  CalendarSyncEventInput,
} from '../types.ts';

const MCP_ENDPOINT = process.env.CALENDAR_MCP_ENDPOINT || 'http://localhost:3000/mcp';
const MCP_PROTOCOL_VERSION = '2024-11-05';
const MCP_TOOL_NAME = 'create-events';
const DEFAULT_TIME_ZONE = 'Asia/Jakarta';
const DEFAULT_ACCOUNT = 'app';
const DEFAULT_CALENDAR_ID = 'primary';
const DEFAULT_SEND_UPDATES = 'all';
const DEFAULT_LOCATION = 'Online';

type McpRequest = {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

type McpErrorResponse = {
  jsonrpc?: '2.0';
  id?: number | string | null;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

type McpSuccessResponse = {
  jsonrpc?: '2.0';
  id?: number | string | null;
  result?: {
    content?: Array<{
      type?: string;
      text?: string;
    }>;
    [key: string]: unknown;
  };
};

type McpTransportResponse = {
  status: number;
  headers: Headers;
  body: unknown;
};

type McpTransport = (input: {
  endpoint: string;
  sessionId: string | null;
  request: McpRequest;
}) => Promise<McpTransportResponse>;

type ParsedToolResult = {
  results?: unknown;
  events?: unknown;
  items?: unknown;
  error?: unknown;
  message?: unknown;
};

type ParsedEventResult = {
  eventId?: unknown;
  externalEventId?: unknown;
  id?: unknown;
  calendarId?: unknown;
  externalCalendarId?: unknown;
  htmlLink?: unknown;
  url?: unknown;
  externalUrl?: unknown;
  error?: unknown;
  message?: unknown;
  success?: unknown;
};

function parseEventStreamBody(body: string) {
  const dataChunks = body
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== '[DONE]');

  if (dataChunks.length === 0) {
    throw new Error('Calendar sync failed because the MCP event stream did not include any data payloads.');
  }

  const lastChunk = dataChunks[dataChunks.length - 1];

  try {
    return JSON.parse(lastChunk);
  } catch {
    throw new Error('Calendar sync failed because the MCP event stream payload was not valid JSON.');
  }
}

async function defaultTransport(input: {
  endpoint: string;
  sessionId: string | null;
  request: McpRequest;
}): Promise<McpTransportResponse> {
  const headers = new Headers({
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  });

  if (input.sessionId) {
    headers.set('mcp-session-id', input.sessionId);
  }

  const response = await fetch(input.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(input.request),
  });

  const contentType = response.headers.get('content-type') || '';
  let body: unknown = null;

  if (contentType.includes('application/json')) {
    body = await response.json();
  } else if (contentType.includes('text/event-stream')) {
    body = parseEventStreamBody(await response.text());
  } else {
    body = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    body,
  };
}

function buildMcpPayload(events: CalendarSyncEventInput[]): CalendarMcpBulkCreatePayload {
  return {
    events: events.map(
      (event) =>
        ({
          calendarId: DEFAULT_CALENDAR_ID,
          account: DEFAULT_ACCOUNT,
          timeZone: DEFAULT_TIME_ZONE,
          sendUpdates: DEFAULT_SEND_UPDATES,
          location: DEFAULT_LOCATION,
          summary: event.summary,
          description: event.description,
          start: event.startAt,
          end: event.endAt,
          attendees: event.attendees,
        }) satisfies CalendarMcpEventPayload,
    ),
  };
}

function buildInitializeRequest(id: number): McpRequest {
  return {
    jsonrpc: '2.0',
    id,
    method: 'initialize',
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: 'learning-progress-architect',
        version: '0.0.0',
      },
    },
  };
}

function buildCreateEventsRequest(id: number, payload: CalendarMcpBulkCreatePayload): McpRequest {
  return {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      name: MCP_TOOL_NAME,
      arguments: payload,
    },
  };
}

function getSessionId(headers: Headers) {
  return headers.get('mcp-session-id');
}

function getErrorMessage(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error;
    }
  }

  return fallback;
}

function createFailedBatchResult(
  events: CalendarSyncEventInput[],
  error: string,
): CalendarEventSyncBatchResult {
  return {
    status: 'failed',
    error,
    results: events.map(
      (event) =>
        ({
          localEventId: event.localEventId,
          status: 'failed',
          externalEventId: null,
          externalCalendarId: null,
          externalUrl: null,
          error,
        }) satisfies CalendarEventSyncResult,
    ),
  };
}

function normalizeEventSyncResult(
  localEventId: number,
  rawResult: unknown,
  fallbackError: string,
): CalendarEventSyncResult {
  if (rawResult == null) {
    return {
      localEventId,
      status: 'failed',
      externalEventId: null,
      externalCalendarId: null,
      externalUrl: null,
      error: fallbackError,
    };
  }

  if (typeof rawResult === 'string') {
    return {
      localEventId,
      status: 'failed',
      externalEventId: null,
      externalCalendarId: null,
      externalUrl: null,
      error: getErrorMessage(rawResult, fallbackError),
    };
  }

  const parsed = (rawResult ?? {}) as ParsedEventResult;
  const success = parsed.success === undefined ? true : Boolean(parsed.success);
  const error =
    success && !parsed.error && !parsed.message
      ? null
      : getErrorMessage(parsed.error ?? parsed.message, fallbackError);

  if (!success || error) {
    return {
      localEventId,
      status: 'failed',
      externalEventId: null,
      externalCalendarId: null,
      externalUrl: null,
      error,
    };
  }

  const externalEventId =
    typeof parsed.externalEventId === 'string'
      ? parsed.externalEventId
      : typeof parsed.eventId === 'string'
        ? parsed.eventId
        : typeof parsed.id === 'string'
          ? parsed.id
          : null;

  return {
    localEventId,
    status: 'synced',
    externalEventId,
    externalCalendarId:
      typeof parsed.externalCalendarId === 'string'
        ? parsed.externalCalendarId
        : typeof parsed.calendarId === 'string'
          ? parsed.calendarId
          : null,
    externalUrl:
      typeof parsed.externalUrl === 'string'
        ? parsed.externalUrl
        : typeof parsed.htmlLink === 'string'
          ? parsed.htmlLink
          : typeof parsed.url === 'string'
            ? parsed.url
            : null,
    error: null,
  };
}

function normalizeBatchResults(
  events: CalendarSyncEventInput[],
  parsedText: unknown,
): CalendarEventSyncBatchResult {
  const parsed = (parsedText ?? {}) as ParsedToolResult;
  const rawResults =
    Array.isArray(parsed.results) ? parsed.results : Array.isArray(parsed.events) ? parsed.events : Array.isArray(parsed.items) ? parsed.items : null;

  if (!rawResults) {
    const error = getErrorMessage(
      parsed.error ?? parsed.message,
      'Calendar sync failed because the MCP response payload was not recognized.',
    );
    return createFailedBatchResult(events, error);
  }

  const results = events.map((event, index) =>
    normalizeEventSyncResult(
      event.localEventId,
      index < rawResults.length ? rawResults[index] : null,
      'Calendar sync failed for this event because the MCP response did not include a matching result.',
    ),
  );
  const failedCount = results.filter((result) => result.status === 'failed').length;

  return {
    status: failedCount === 0 ? 'synced' : failedCount === results.length ? 'failed' : 'partial',
    error:
      failedCount === 0
        ? null
        : failedCount === results.length
          ? getErrorMessage(parsed.error ?? parsed.message, 'Calendar sync failed for all events.')
          : null,
    results,
  };
}

function parseToolCallResponseBody(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new Error('Calendar sync failed because the MCP response was not valid JSON.');
  }

  const response = body as McpSuccessResponse & McpErrorResponse;
  if (response.error) {
    throw new Error(getErrorMessage(response.error, 'Calendar sync failed during the MCP tool call.'));
  }

  const text = response.result?.content?.[0]?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Calendar sync failed because the MCP response did not include result.content[0].text.');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Calendar sync failed because result.content[0].text was not valid JSON.');
  }
}

async function initializeMcpSession(transport: McpTransport) {
  const response = await transport({
    endpoint: MCP_ENDPOINT,
    sessionId: null,
    request: buildInitializeRequest(1),
  });

  if (response.status >= 400) {
    throw new Error(`Calendar sync failed during MCP initialize with HTTP ${response.status}.`);
  }

  if (!response.body || typeof response.body !== 'object') {
    throw new Error('Calendar sync failed because MCP initialize returned an invalid response.');
  }

  const body = response.body as McpSuccessResponse & McpErrorResponse;
  if (body.error) {
    throw new Error(getErrorMessage(body.error, 'Calendar sync failed during MCP initialize.'));
  }

  return getSessionId(response.headers);
}

async function callCreateEventsTool(
  payload: CalendarMcpBulkCreatePayload,
  transport: McpTransport,
  sessionId: string | null,
) {
  const response = await transport({
    endpoint: MCP_ENDPOINT,
    sessionId,
    request: buildCreateEventsRequest(2, payload),
  });

  if (response.status >= 400) {
    throw new Error(`Calendar sync failed during MCP tool call with HTTP ${response.status}.`);
  }

  return parseToolCallResponseBody(response.body);
}

export async function createCalendarEvents(
  events: CalendarSyncEventInput[],
  options?: {
    transport?: McpTransport;
  },
): Promise<CalendarEventSyncBatchResult> {
  if (events.length === 0) {
    return {
      status: 'synced',
      error: null,
      results: [],
    };
  }

  const transport = options?.transport ?? defaultTransport;

  try {
    const sessionId = await initializeMcpSession(transport);
    const payload = buildMcpPayload(events);
    const parsedToolResponse = await callCreateEventsTool(payload, transport, sessionId);
    return normalizeBatchResults(events, parsedToolResponse);
  } catch (error) {
    return createFailedBatchResult(
      events,
      error instanceof Error ? error.message : 'Calendar sync failed due to an unknown error.',
    );
  }
}

export const calendarMcpConfig = {
  endpoint: MCP_ENDPOINT,
  toolName: MCP_TOOL_NAME,
  timeZone: DEFAULT_TIME_ZONE,
  account: DEFAULT_ACCOUNT,
  calendarId: DEFAULT_CALENDAR_ID,
  sendUpdates: DEFAULT_SEND_UPDATES,
  location: DEFAULT_LOCATION,
} as const;