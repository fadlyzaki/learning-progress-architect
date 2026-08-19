import type { AuthSession } from '../types';

const AUTH_STORAGE_KEY = 'learning-progress-architect.auth';

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch (error) {
    console.error('Failed to parse stored auth session.', error);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function setStoredSession(session: AuthSession) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAuthHeaders() {
  const session = getStoredSession();

  return session
    ? {
        Authorization: `Bearer ${session.token}`,
      }
    : {};
}

export async function startDemoSession(isGuest = false): Promise<AuthSession> {
  const endpoint = isGuest ? '/api/auth/guest' : '/api/auth/demo';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to launch demo session');
  }

  const session = (await response.json()) as AuthSession;
  setStoredSession(session);
  return session;
}

