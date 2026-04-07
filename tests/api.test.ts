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
  assert.equal(data.resources.length, 0);
  assert.equal(data.task_resources.length, 0);
  assert.deepEqual(data.quick_actions, []);
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
    error: 'Gemini is not configured for quick action generation.',
    code: 'QUICK_ACTION_UNAVAILABLE',
  });
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

async function startServer(): Promise<TestServer> {
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
