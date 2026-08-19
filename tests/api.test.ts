import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

type TestServer = {
  baseUrl: string;
  stop: () => Promise<void>;
};

type BackgroundProcess = {
  baseUrl: string;
  stop: () => Promise<void>;
};

const cleanupTasks: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanupTasks.length > 0) {
    const task = cleanupTasks.pop();
    if (task) {
      await task();
    }
  }
});

test('auth flow protects private data and returns structured auth errors', async () => {
  const server = await startServer();
  cleanupTasks.push(server.stop);

  const unauthenticated = await fetch(`${server.baseUrl}/api/data`);
  assert.equal(unauthenticated.status, 401);
  assert.deepEqual(await unauthenticated.json(), {
    error: 'Your session has expired. Please sign in again.',
    code: 'AUTH_REQUIRED',
  });

  const signup = await request(server.baseUrl, '/api/auth/signup', {
    name: 'Fadly',
    email: 'fadly@example.com',
    password: 'password123',
  });
  assert.equal(signup.status, 201);
  const session = await signup.json() as { token: string };
  assert.ok(session.token);

  const failedLogin = await request(server.baseUrl, '/api/auth/login', {
    email: 'fadly@example.com',
    password: 'wrong-pass',
  });
  assert.equal(failedLogin.status, 401);
  assert.deepEqual(await failedLogin.json(), {
    error: 'Incorrect email or password.',
    code: 'INVALID_CREDENTIALS',
  });
});

test('demo and guest endpoints enable instant workspace access without registration', async () => {
  const server = await startServer();
  cleanupTasks.push(server.stop);

  const demoRes = await request(server.baseUrl, '/api/auth/demo', {});
  assert.equal(demoRes.status, 200);
  const demoSession = (await demoRes.json()) as { token: string; user: { email: string; name: string } };
  assert.ok(demoSession.token);
  assert.equal(demoSession.user.name, 'Demo Learner');
  assert.equal(demoSession.user.email, 'demo@learningprogress.app');

  const demoData = await getData(server.baseUrl, demoSession.token);
  assert.equal(demoData.goals.length, 1);
  assert.equal(demoData.goals[0].title, 'IELTS Academic: Band 7.5+ Preparation');
  assert.ok(demoData.tasks.length >= 4);
  assert.ok(demoData.sessions.length >= 1);
  assert.ok(demoData.reviews.length >= 1);
  assert.ok(demoData.quick_actions.length >= 1);

  const guestRes = await request(server.baseUrl, '/api/auth/guest', {});
  assert.equal(guestRes.status, 200);
  const guestSession = (await guestRes.json()) as { token: string; user: { email: string; name: string } };
  assert.ok(guestSession.token);
  assert.equal(guestSession.user.name, 'Guest Learner');
  assert.ok(guestSession.user.email.startsWith('guest_'));

  const guestData = await getData(server.baseUrl, guestSession.token);
  assert.equal(guestData.goals.length, 1);
  assert.ok(guestData.tasks.length >= 4);
});

test('workflow supports no-resource planning mode and persists starter materials when search output is unavailable', async () => {
  const server = await startServer();
  cleanupTasks.push(server.stop);
  const token = await signupAndGetToken(server.baseUrl, 'starter@example.com');

  const workflow = await request(
    server.baseUrl,
    '/api/agent/workflow',
    {
      goal: 'Learn advanced React patterns',
      level: 'Intermediate',
      hours: 6,
      preferredStyle: 'Mixed',
      resourceMode: 'needs_plan',
      resources: [],
    },
    token,
  );

  assert.equal(workflow.status, 201);

  const data = await getData(server.baseUrl, token);
  assert.equal(data.goals.length, 1);
  assert.equal(data.tasks.length, 3);
  assert.equal(data.resources.length, 9);
  assert.equal(data.task_resources.length, 9);
  assert.deepEqual(data.quick_actions, []);
  assert.ok(
    data.resources.every((resource: { source_kind: string; reference: string | null }) =>
      resource.source_kind === 'system_suggested'
      && typeof resource.reference === 'string'
      && resource.reference.includes('google.com/search?q='),
    ),
  );
  assert.ok(
    data.resources.some((resource: { notes: string | null }) =>
      typeof resource.notes === 'string' && resource.notes.includes('Focus on this task goal:'),
    ),
  );
  assert.ok(
    data.resources.some((resource: { notes: string | null }) =>
      typeof resource.notes === 'string' && resource.notes.includes('Source: google search'),
    ),
  );
  assert.ok(
    data.notes.some((note: { content: string }) =>
      note.content.includes('Planning mode: generated starting plan'),
    ),
  );
  assert.ok(
    data.notes.some((note: { content: string }) =>
      note.content.includes('Recommended resource types to gather next:'),
    ),
  );
});

test('workflow persists learner materials, links them to tasks, and completes the session loop', async () => {
  const server = await startServer();
  cleanupTasks.push(server.stop);
  const token = await signupAndGetToken(server.baseUrl, 'materials@example.com');

  const workflow = await request(
    server.baseUrl,
    '/api/agent/workflow',
    {
      goal: 'Master product design systems',
      level: 'Advanced',
      hours: 5,
      preferredStyle: 'Visual',
      resourceMode: 'has_materials',
      resources: [
        {
          title: 'Design Systems Handbook',
          type: 'book',
          reference: 'Chapter 2',
          notes: 'Use this for system foundations',
        },
        {
          title: 'Component library audit',
          type: 'notes',
          reference: null,
          notes: 'Map issues against current UI primitives',
        },
      ],
    },
    token,
  );

  assert.equal(workflow.status, 201);

  let data = await getData(server.baseUrl, token);
  assert.equal(data.resources.length, 2);
  assert.equal(data.task_resources.length, 3);
  assert.deepEqual(data.quick_actions, []);
  assert.ok(
    data.notes.some((note: { content: string }) =>
      note.content.includes('Planning mode: learner-provided materials'),
    ),
  );

  const firstTask = data.tasks[0];
  const start = await fetch(`${server.baseUrl}/api/tasks/${firstTask.id}/start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  assert.equal(start.status, 200);

  const complete = await request(
    server.baseUrl,
    `/api/tasks/${firstTask.id}/complete`,
    {
      reflection: 'I can now explain the core system layers.',
      confusion: 'Need more examples for edge-case governance.',
      confidence: 2,
      durationSeconds: 1800,
      notes: 'Deep-work session notes about design tokens and primitives.',
    },
    token,
  );
  assert.equal(complete.status, 200);

  data = await getData(server.baseUrl, token);
  assert.equal(data.tasks[0].status, 'completed');
  assert.equal(data.sessions.length, 1);
  assert.equal(data.sessions[0].reflection, 'I can now explain the core system layers.');
  assert.equal(data.reviews.length, 1);
  assert.equal(data.reviews[0].priority, 'high');
  assert.ok(
    data.notes.some(
      (n: { content: string; kind: string }) =>
        n.content === 'Deep-work session notes about design tokens and primitives.' && n.kind === 'note',
    ),
  );
});

test('quick action endpoint validates action type and returns a service-unavailable error without Gemini', async () => {
  const server = await startServer();
  cleanupTasks.push(server.stop);
  const token = await signupAndGetToken(server.baseUrl, 'quick-actions@example.com');

  const workflow = await request(
    server.baseUrl,
    '/api/agent/workflow',
    {
      goal: 'Learn React state management',
      level: 'Beginner',
      hours: 4,
      preferredStyle: 'Mixed',
      resourceMode: 'needs_plan',
      resources: [],
    },
    token,
  );
  assert.equal(workflow.status, 201);

  const data = await getData(server.baseUrl, token);
  const firstTask = data.tasks[0];
  assert.deepEqual(data.quick_actions, []);

  const invalidAction = await request(
    server.baseUrl,
    `/api/tasks/${firstTask.id}/quick-action`,
    { action: 'unknown' },
    token,
  );
  assert.equal(invalidAction.status, 400);
  assert.deepEqual(await invalidAction.json(), {
    error: 'Quick action type is invalid.',
    code: 'INVALID_QUICK_ACTION',
  });

  const unavailable = await request(
    server.baseUrl,
    `/api/tasks/${firstTask.id}/quick-action`,
    { action: 'explain' },
    token,
  );
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), {
    error: 'The AI assistant is not fully configured for this feature yet. Please check your setup or try again later.',
    code: 'QUICK_ACTION_UNAVAILABLE',
  });
});

test('stale quick action cache entries are hidden from app data and not returned as cached answers', async () => {
  const sharedToken = 'shared-secret';
  const server = await startServer({
    INTERNAL_SERVICE_TOKEN: sharedToken,
  });
  cleanupTasks.push(server.stop);
  const token = await signupAndGetToken(server.baseUrl, 'stale-quick-actions@example.com');

  const workflow = await request(
    server.baseUrl,
    '/api/agent/workflow',
    {
      goal: 'Learn React state management',
      level: 'Beginner',
      hours: 4,
      preferredStyle: 'Mixed',
      resourceMode: 'needs_plan',
      resources: [],
    },
    token,
  );
  assert.equal(workflow.status, 201);

  let data = await getData(server.baseUrl, token);
  const firstTask = data.tasks[0];
  const staleSave = await fetch(`${server.baseUrl}/internal/mcp/quick-action/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-service-token': sharedToken,
    },
    body: JSON.stringify({
      userId: data.user.id,
      taskId: firstTask.id,
      action: 'explain',
      content: 'This answer starts clearly, but it stops before finishing the actual explanation because',
    }),
  });
  assert.equal(staleSave.status, 200);

  data = await getData(server.baseUrl, token);
  assert.deepEqual(data.quick_actions, []);

  const quickAction = await request(
    server.baseUrl,
    `/api/tasks/${firstTask.id}/quick-action`,
    { action: 'explain' },
    token,
  );
  assert.equal(quickAction.status, 503);
  assert.deepEqual(await quickAction.json(), {
    error: 'The AI assistant is not fully configured for this feature yet. Please check your setup or try again later.',
    code: 'QUICK_ACTION_UNAVAILABLE',
  });
});

test('workflow falls back to the legacy planner when AGENT_PROVIDER=adk is enabled but the ADK service is unavailable', async () => {
  const server = await startServer({
    AGENT_PROVIDER: 'adk',
    ADK_SERVICE_URL: 'http://127.0.0.1:65534',
  });
  cleanupTasks.push(server.stop);
  const token = await signupAndGetToken(server.baseUrl, 'adk-fallback@example.com');

  const workflow = await request(
    server.baseUrl,
    '/api/agent/workflow',
    {
      goal: 'Learn system design',
      level: 'Intermediate',
      hours: 4,
      preferredStyle: 'Mixed',
      resourceMode: 'needs_plan',
      resources: [],
    },
    token,
  );

  assert.equal(workflow.status, 201);

  const data = await getData(server.baseUrl, token);
  assert.equal(data.tasks.length, 3);
  assert.ok(
    data.notes.some((note: { content: string }) =>
      note.content.includes('Planning mode: generated starting plan'),
    ),
  );
});

test('Google Calendar integration routes require auth and report disabled configuration safely', async () => {
  const server = await startServer({
    GOOGLE_CALENDAR_SYNC_ENABLED: 'false',
  });
  cleanupTasks.push(server.stop);

  const unauthenticatedStatus = await fetch(`${server.baseUrl}/api/integrations/google-calendar/status`);
  assert.equal(unauthenticatedStatus.status, 401);

  const token = await signupAndGetToken(server.baseUrl, 'calendar-disabled@example.com');
  const status = await fetch(`${server.baseUrl}/api/integrations/google-calendar/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), {
    configured: false,
    connected: false,
    status: 'disabled',
    calendarId: null,
    lastSyncedAt: null,
    lastError: null,
    summary: {
      total: 0,
      synced: 0,
      failed: 0,
      pending: 0,
    },
  });

  const connect = await request(
    server.baseUrl,
    '/api/integrations/google-calendar/connect',
    {},
    token,
  );
  assert.equal(connect.status, 503);
  assert.deepEqual(await connect.json(), {
    error: 'Google Calendar sync is disabled.',
    code: 'GOOGLE_CALENDAR_DISABLED',
  });
});

test('Google Calendar status summary is scoped to the authenticated user', async () => {
  const server = await startServer({
    GOOGLE_CALENDAR_SYNC_ENABLED: 'false',
  });
  cleanupTasks.push(server.stop);
  const firstToken = await signupAndGetToken(server.baseUrl, 'calendar-owner@example.com');
  const secondToken = await signupAndGetToken(server.baseUrl, 'calendar-other@example.com');

  const workflow = await request(
    server.baseUrl,
    '/api/agent/workflow',
    {
      goal: 'Learn calendar-safe systems',
      level: 'Intermediate',
      hours: 3,
      preferredStyle: 'Mixed',
      resourceMode: 'needs_plan',
      resources: [],
    },
    firstToken,
  );
  assert.equal(workflow.status, 201);

  const firstStatus = await fetch(`${server.baseUrl}/api/integrations/google-calendar/status`, {
    headers: {
      Authorization: `Bearer ${firstToken}`,
    },
  });
  const secondStatus = await fetch(`${server.baseUrl}/api/integrations/google-calendar/status`, {
    headers: {
      Authorization: `Bearer ${secondToken}`,
    },
  });

  assert.equal(firstStatus.status, 200);
  assert.equal(secondStatus.status, 200);
  assert.equal((await firstStatus.json()).summary.total, 3);
  assert.equal((await secondStatus.json()).summary.total, 0);
});

test('internal MCP app routes require the shared service token', async () => {
  const server = await startServer({
    INTERNAL_SERVICE_TOKEN: 'shared-secret',
  });
  cleanupTasks.push(server.stop);

  const token = await signupAndGetToken(server.baseUrl, 'internal-auth@example.com');
  const data = await getData(server.baseUrl, token);

  const missingTokenResponse = await fetch(`${server.baseUrl}/internal/mcp/workspace`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: data.user.id,
      name: data.user.name,
      email: data.user.email,
      createdAt: data.user.created_at,
    }),
  });
  assert.equal(missingTokenResponse.status, 401);
  assert.deepEqual(await missingTokenResponse.json(), {
    error: 'Internal service authentication failed.',
    code: 'INTERNAL_SERVICE_AUTH_FAILED',
  });

  const validTokenResponse = await fetch(`${server.baseUrl}/internal/mcp/workspace`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-service-token': 'shared-secret',
    },
    body: JSON.stringify({
      userId: data.user.id,
      name: data.user.name,
      email: data.user.email,
      createdAt: data.user.created_at,
    }),
  });
  assert.equal(validTokenResponse.status, 200);
  const workspace = await validTokenResponse.json() as { user: { id: string } };
  assert.equal(workspace.user.id, data.user.id);
});

test('MCP server proxies app-owned quick action reads and writes through internal routes', async () => {
  const sharedToken = 'shared-secret';
  const server = await startServer({
    INTERNAL_SERVICE_TOKEN: sharedToken,
  });
  cleanupTasks.push(server.stop);

  const token = await signupAndGetToken(server.baseUrl, 'mcp-proxy@example.com');
  const workflow = await request(
    server.baseUrl,
    '/api/agent/workflow',
    {
      goal: 'Learn TypeScript architecture',
      level: 'Intermediate',
      hours: 4,
      preferredStyle: 'Mixed',
      resourceMode: 'needs_plan',
      resources: [],
    },
    token,
  );
  assert.equal(workflow.status, 201);

  const data = await getData(server.baseUrl, token);
  const firstTask = data.tasks[0];
  const mcp = await startMcp({
    APP_BASE_URL: server.baseUrl,
    INTERNAL_SERVICE_TOKEN: sharedToken,
  });
  cleanupTasks.push(mcp.stop);

  const unauthorized = await fetch(`${mcp.baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'unauthorized',
      method: 'tools/call',
      params: {
        name: 'get_cached_quick_action',
        arguments: {
          userId: data.user.id,
          taskId: firstTask.id,
          action: 'explain',
        },
      },
    }),
  });
  assert.equal(unauthorized.status, 401);

  const savedQuickAction = await callMcpTool(mcp.baseUrl, sharedToken, 'save_quick_action', {
    userId: data.user.id,
    taskId: firstTask.id,
    action: 'explain',
    content: 'A saved explanation from MCP.',
  }) as { content: string; action: string };
  assert.equal(savedQuickAction.action, 'explain');
  assert.equal(savedQuickAction.content, 'A saved explanation from MCP.');

  const cachedQuickActionPayload = await callMcpTool(mcp.baseUrl, sharedToken, 'get_cached_quick_action', {
    userId: data.user.id,
    taskId: firstTask.id,
    action: 'explain',
  }) as { quickAction: { content: string; action: string } | null };
  assert.equal(cachedQuickActionPayload.quickAction?.action, 'explain');
  assert.equal(cachedQuickActionPayload.quickAction?.content, 'A saved explanation from MCP.');
});

async function signupAndGetToken(baseUrl: string, email: string) {
  const signup = await request(baseUrl, '/api/auth/signup', {
    name: 'Test User',
    email,
    password: 'password123',
  });
  assert.equal(signup.status, 201);
  const payload = await signup.json() as { token: string };
  return payload.token;
}

async function getData(baseUrl: string, token: string) {
  const response = await fetch(`${baseUrl}/api/data`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  assert.equal(response.status, 200);
  return response.json() as Promise<any>;
}

async function request(baseUrl: string, route: string, body: unknown, token?: string) {
  return fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function startServer(extraEnv: Record<string, string> = {}): Promise<TestServer> {
  const port = await getFreePort();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'lpa-test-'));
  const databaseFile = path.join(tempDir, 'app.db');
  const child = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      DATABASE_FILE: databaseFile,
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForServer(child, port);

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    stop: async () => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }

      await onceExit(child);
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}

async function startMcp(extraEnv: Record<string, string> = {}): Promise<BackgroundProcess> {
  const port = await getFreePort();
  const child = spawn('npm', ['run', 'mcp:dev'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      MCP_PORT: String(port),
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForOutput(child, `Internal MCP server listening on port ${port}`, 15000);

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    stop: async () => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }

      await onceExit(child);
    },
  };
}

async function callMcpTool(baseUrl: string, token: string, name: string, argumentsPayload: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'x-internal-service-token': token,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${name}-call`,
      method: 'tools/call',
      params: {
        name,
        arguments: argumentsPayload,
      },
    }),
  });

  assert.equal(response.status, 200);
  const rawBody = await response.text();
  const payload = parseMcpResponse(rawBody) as {
    error?: unknown;
    result?: {
      content?: Array<{
        text?: string;
      }>;
    };
  };
  assert.equal(payload.error, undefined);
  const text = payload.result?.content?.[0]?.text;
  assert.ok(text);
  return JSON.parse(text);
}

function parseMcpResponse(rawBody: string) {
  const trimmed = rawBody.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }

  const dataLines = trimmed
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6));

  for (let index = dataLines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(dataLines[index]);
    } catch {
      continue;
    }
  }

  throw new Error(`Unable to parse MCP response: ${rawBody}`);
}

function waitForServer(child: ChildProcessWithoutNullStreams, port: number) {
  return waitForOutput(child, `Server running on port ${port}`, 15000);
}

function waitForOutput(child: ChildProcessWithoutNullStreams, expectedText: string, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for process output: ${expectedText}`));
    }, timeoutMs);

    const handleOutput = (chunk: Buffer) => {
      const text = chunk.toString();
      if (text.includes(expectedText)) {
        clearTimeout(timer);
        child.stdout.off('data', handleOutput);
        child.stderr.off('data', handleOutput);
        resolve();
      }
    };

    child.stdout.on('data', handleOutput);
    child.stderr.on('data', handleOutput);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Test server exited early with code ${code ?? 'unknown'}.`));
    });
  });
}

function onceExit(child: ChildProcessWithoutNullStreams) {
  return new Promise<void>((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }

    child.once('exit', () => resolve());
  });
}

function getFreePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to acquire a free port.'));
        return;
      }

      const { port } = address;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}
