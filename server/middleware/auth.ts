import type { Request, Response } from 'express';
import { db } from '../db.ts';
import { jsonError } from '../utils/http.ts';
import type { UserRow } from '../types.ts';

export function getBearerToken(req: Request) {
  const authHeader = req.header('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
}

export function getAuthenticatedUser(req: Request): UserRow | null {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  const user = db
    .prepare(
      `
        SELECT users.id, users.name, users.email, users.created_at
        FROM auth_sessions
        INNER JOIN users ON users.id = auth_sessions.user_id
        WHERE auth_sessions.token = ?
      `,
    )
    .get(token) as UserRow | undefined;

  return user ?? null;
}

export function requireUser(req: Request, res: Response) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    jsonError(res, 401, 'Your session has expired. Please sign in again.', 'AUTH_REQUIRED');
    return null;
  }

  return user;
}
