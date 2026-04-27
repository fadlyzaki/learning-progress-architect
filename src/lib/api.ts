import { clearStoredSession, getAuthHeaders } from './auth';
import type { QuickActionKind } from '../types';

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
  
  if (!headers.has('Accept-Language') && typeof window !== 'undefined') {
    const locale = window.localStorage.getItem('lpa-locale') || 'en';
    headers.set('Accept-Language', locale);
  }

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

export interface QuickActionResponse {
  action: QuickActionKind;
  content: string;
  source: 'cache' | 'generated';
  updatedAt: string;
}

export function requestQuickAction(taskId: number, action: QuickActionKind) {
  return apiFetch<QuickActionResponse>(`/api/tasks/${taskId}/quick-action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action }),
  });
}

export interface GoogleCalendarStatusResponse {
  configured: boolean;
  connected: boolean;
  status: 'disabled' | 'disconnected' | 'connected' | 'error' | 'expired';
  calendarId: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  summary: {
    total: number;
    synced: number;
    failed: number;
    pending: number;
  };
}

export interface GoogleCalendarSyncResponse {
  total: number;
  synced: number;
  failed: number;
  pending: number;
  syncedAt: string | null;
}

export function getGoogleCalendarStatus() {
  return apiFetch<GoogleCalendarStatusResponse>('/api/integrations/google-calendar/status');
}

export function connectGoogleCalendar() {
  return apiFetch<{ authUrl: string }>('/api/integrations/google-calendar/connect', {
    method: 'POST',
  });
}

export function syncGoogleCalendar() {
  return apiFetch<GoogleCalendarSyncResponse>('/api/integrations/google-calendar/sync', {
    method: 'POST',
  });
}

export function disconnectGoogleCalendar() {
  return apiFetch<{ success: true }>('/api/integrations/google-calendar/disconnect', {
    method: 'POST',
  });
}
