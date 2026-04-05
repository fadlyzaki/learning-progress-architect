import crypto from 'crypto';
import { Router } from 'express';
import { db } from '../db.ts';
import { jsonError } from '../utils/http.ts';
import { nowIso } from '../utils/date.ts';
import { normalizeEmail, hashPassword, verifyPassword, createSessionToken } from '../services/authService.ts';
import type { UserRow } from '../types.ts';

export const authRouter = Router();

authRouter.post('/signup', (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = normalizeEmail(String(req.body?.email ?? ''));
  const password = String(req.body?.password ?? '');

  if (!name || !email || password.length < 8) {
    jsonError(
      res,
      400,
      'Name, email, and a password of at least 8 characters are required.',
      'INVALID_AUTH_PAYLOAD',
    );
    return;
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
  if (existingUser) {
    jsonError(res, 409, 'An account with that email already exists.', 'EMAIL_IN_USE');
    return;
  }

  const userId = crypto.randomUUID();
  const createdAt = nowIso();
  const passwordHash = hashPassword(password);

  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(userId, name, email, passwordHash, createdAt);

  const token = createSessionToken(userId);
  res.status(201).json({
    token,
    user: {
      id: userId,
      name,
      email,
      created_at: createdAt,
    },
  });
});

authRouter.post('/login', (req, res) => {
  const email = normalizeEmail(String(req.body?.email ?? ''));
  const password = String(req.body?.password ?? '');

  const user = db
    .prepare('SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?')
    .get(email) as (UserRow & { password_hash: string }) | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    jsonError(res, 401, 'Incorrect email or password.', 'INVALID_CREDENTIALS');
    return;
  }

  const token = createSessionToken(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
  });
});
