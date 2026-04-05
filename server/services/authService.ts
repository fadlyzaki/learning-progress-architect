import crypto from 'crypto';
import { db } from '../db.ts';
import { nowIso } from '../utils/date.ts';

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto.scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  return (
    expectedBuffer.length === actualHash.length &&
    crypto.timingSafeEqual(expectedBuffer, actualHash)
  );
}

export function createSessionToken(userId: string) {
  const token = crypto.randomUUID();
  db.prepare('INSERT INTO auth_sessions (token, user_id, created_at) VALUES (?, ?, ?)')
    .run(token, userId, nowIso());
  return token;
}
