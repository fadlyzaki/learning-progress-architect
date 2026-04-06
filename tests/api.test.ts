import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import net from 'node:net';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

type TestServer = {
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

test('workflow supports no-resource planning mode and returns starter guidance notes', async () => {
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
      targetDate: '2026-04-10',
      preferredStyle: 'Mixed',
      resourceMode: 'needs_plan',
      resources: [],
    },
    token,
  );

  assert.equal(workflow.status, 201);
  const workflowPayload = await workflow.json() as {
    calendarSync: { status: string; failed: number; total: number };
  };
  assert.equal(workflowPayload.calendarSync.status, 'failed');
  assert.equal(workflowPayload.calendarSync.failed, workflowPayload.calendarSync.total);

  const data = await getData(server.baseUrl, token);
  assert.equal(data.goals.length, 1);
  assert.equal(data.tasks.length, 3);
  assert.equal(data.events.length, 3);
  assert.equal(data.events[0].date, '2026-04-10T12:00:00.000Z');
  assert.deepEqual(
    data.events.map((event: { duration: number }) => event.duration),
    [120, 120, 120],
  );
  assert.ok(
    data.events.every(
      (event: { status: string; sync_error: string | null }) =>
        event.status === 'failed' && typeof event.sync_error === 'string' && event.sync_error.length > 0,
    ),
  );
  assert.equal(data.resources.length, 0);
  assert.equal(data.task_resources.length, 0);
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
});

test('workflow returns 201 and only updates affected event rows on partial calendar sync', async () => {
  const mcpServer = await startMockMcpServer((requestBody) => {
    if (requestBody.method === 'initialize') {
      return {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'mcp-session-id': 'session-1',
        },
        body: {
          jsonrpc: '2.0',
          id: requestBody.id,
          result: { protocolVersion: '2024-11-05' },
        },
      };
    }

    return {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
      body: {
        jsonrpc: '2.0',
        id: requestBody.id,
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
  });
  cleanupTasks.push(mcpServer.stop);

  const server = await startServer({
    env: {
      CALENDAR_MCP_ENDPOINT: mcpServer.endpoint,
    },
  });
  cleanupTasks.push(server.stop);
  const token = await signupAndGetToken(server.baseUrl, 'partial-sync@example.com');

  const workflow = await request(
    server.baseUrl,
    '/api/agent/workflow',
    {
      goal: 'Master TypeScript',
      level: 'Intermediate',
      hours: 5,
      targetDate: '2026-04-10',
      preferredStyle: 'Mixed',
      resourceMode: 'needs_plan',
      resources: [],
    },
    token,
  );

  assert.equal(workflow.status, 201);
  const workflowPayload = await workflow.json() as {
    calendarSync: {
      status: string;
      total: number;
      succeeded: number;
      failed: number;
      message: string | null;
    };
  };
  assert.deepEqual(workflowPayload.calendarSync, {
    status: 'partial',
    total: 3,
    succeeded: 1,
    failed: 2,
    message: '2 of 3 calendar events failed to sync.',
  });

  const data = await getData(server.baseUrl, token);
  assert.equal(data.events[0].status, 'synced');
  assert.equal(data.events[0].external_event_id, 'evt-1');
  assert.equal(data.events[0].external_calendar_id, 'primary');
  assert.equal(data.events[0].external_url, 'https://calendar.google.com/event?eid=1');
  assert.ok(typeof data.events[0].synced_at === 'string');
  assert.equal(data.events[1].status, 'failed');
  assert.equal(data.events[1].sync_error, 'quota exceeded');
  assert.equal(data.events[1].external_event_id, null);
  assert.equal(data.events[2].status, 'failed');
  assert.equal(data.events[2].sync_error, 'quota exceeded');
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

async function startServer(options?: { env?: Record<string, string | undefined> }): Promise<TestServer> {
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
      CALENDAR_MCP_ENDPOINT: 'http://127.0.0.1:1/mcp',
      ...options?.env,
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

async function startMockMcpServer(
  respond: (requestBody: Record<string, any>) => {
    status?: number;
    headers?: Record<string, string>;
    body?: unknown;
  },
) {
  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];

    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const bodyText = Buffer.concat(chunks).toString('utf8');
    const requestBody = bodyText ? JSON.parse(bodyText) : {};
    const response = respond(requestBody);

    res.writeHead(response.status ?? 200, {
      'content-type': 'application/json',
      ...(response.headers ?? {}),
    });
    res.end(JSON.stringify(response.body ?? {}));
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.once('error', reject);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start mock MCP server.');
  }

  return {
    endpoint: `http://127.0.0.1:${address.port}/mcp`,
    stop: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

function waitForServer(child: ChildProcessWithoutNullStreams, port: number) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for test server on port ${port}.`));
    }, 15000);

    const handleOutput = (chunk: Buffer) => {
      const text = chunk.toString();
      if (text.includes(`Server running on port ${port}`)) {
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
