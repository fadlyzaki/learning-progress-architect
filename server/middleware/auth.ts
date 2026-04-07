import type { Request, Response } from 'express';
import { getAppContext } from '../appContext.ts';
import { jsonError } from '../utils/http.ts';
import type { UserRow } from '../types.ts';

export function getBearerToken(req: Request) {
  const authHeader = req.header('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
}

export async function getAuthenticatedUser(req: Request): Promise<UserRow | null> {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  return getAppContext().repositories.authSessions.getUserByToken(token);
}

export async function requireUser(req: Request, res: Response) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    jsonError(res, 401, 'Your session has expired. Please sign in again.', 'AUTH_REQUIRED');
    return null;
  }

  return user;
}
