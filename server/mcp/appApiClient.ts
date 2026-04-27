import { env, requireAppBaseUrl, requireInternalServiceToken } from '../config/env.ts';

type FetchOptions = {
  path: string;
  body: unknown;
};

const INTERNAL_TIMEOUT_MS = 15_000;

async function callInternalRoute<T>({ path, body }: FetchOptions): Promise<T> {
  const response = await fetch(`${requireAppBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-service-token': requireInternalServiceToken(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(INTERNAL_TIMEOUT_MS),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string; code?: string } | null;
    const message = payload?.error ?? `Internal app route ${path} returned ${response.status}.`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchWorkspaceSnapshot(input: {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}) {
  return callInternalRoute({
    path: '/internal/mcp/workspace',
    body: input,
  });
}

export async function fetchTaskContext(input: {
  userId: string;
  taskId: number;
}) {
  return callInternalRoute({
    path: '/internal/mcp/task-context',
    body: input,
  });
}

export async function persistWorkflowRecords(input: {
  userId: string;
  goal: string;
  level: string;
  hours: number;
  targetDate?: string | null;
  preferredStyle?: string | null;
  resourceMode: 'has_materials' | 'needs_plan';
  resources: Array<{
    title: string;
    type: 'link' | 'course' | 'book' | 'article' | 'documentation' | 'notes' | 'video' | 'other';
    reference: string | null;
    notes: string | null;
  }>;
  tasks: Array<{
    title: string;
    description: string;
    references: Array<{
      title: string;
      url: string;
      snippet?: string;
      source?: string;
    }>;
  }>;
}) {
  return callInternalRoute({
    path: '/internal/mcp/workflow-records',
    body: input,
  });
}

export async function fetchCachedQuickAction(input: {
  userId: string;
  taskId: number;
  action: 'explain' | 'example' | 'analogy' | 'confused';
}) {
  return callInternalRoute({
    path: '/internal/mcp/quick-action/cache',
    body: input,
  });
}

export async function persistQuickAction(input: {
  userId: string;
  taskId: number;
  action: 'explain' | 'example' | 'analogy' | 'confused';
  content: string;
}) {
  return callInternalRoute({
    path: '/internal/mcp/quick-action/save',
    body: input,
  });
}

export async function scheduleReview(input: {
  userId: string;
  taskId: number;
  priority: 'high' | 'medium' | 'low';
  daysUntilReview: number;
}) {
  return callInternalRoute({
    path: '/internal/mcp/review/schedule',
    body: input,
  });
}

export function isInternalServiceRequestAuthorized(tokenHeader: string) {
  return Boolean(env.internalServiceToken) && tokenHeader === env.internalServiceToken;
}
