import { clearStoredSession, getAuthHeaders } from './auth';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseJsonSafely(response: Response) {
  try {
    return (await response.json()) as { error?: string; code?: string };
  } catch {
    return {};
  }
}

export async function apiFetch<T>(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const authHeaders = getAuthHeaders();

  Object.entries(authHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearStoredSession();
  }

  if (!response.ok) {
    const payload = await parseJsonSafely(response);
    throw new ApiError(
      payload.error ?? 'Something went wrong while contacting the server.',
      response.status,
      payload.code,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
