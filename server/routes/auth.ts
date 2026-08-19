import crypto from 'crypto';
import { Router } from 'express';
import { getAppContext } from '../appContext.ts';
import { jsonError } from '../utils/http.ts';
import { nowIso } from '../utils/date.ts';
import { normalizeEmail, hashPassword, verifyPassword, createSessionToken } from '../services/authService.ts';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
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

  const { authSessions } = getAppContext().repositories;
  const existingUserId = await authSessions.findUserIdByEmail(email);
  if (existingUserId) {
    jsonError(res, 409, 'An account with that email already exists.', 'EMAIL_IN_USE');
    return;
  }

  const userId = crypto.randomUUID();
  const createdAt = nowIso();
  const passwordHash = hashPassword(password);

  try {
    await authSessions.createUser({
      id: userId,
      name,
      email,
      passwordHash,
      createdAt,
    });
  } catch (createError) {
    const message = createError instanceof Error ? createError.message : '';
    if (message.includes('UNIQUE') || message.includes('unique') || message.includes('duplicate key')) {
      jsonError(res, 409, 'An account with that email already exists.', 'EMAIL_IN_USE');
      return;
    }
    throw createError;
  }

  const token = createSessionToken();
  await authSessions.createSession({
    token,
    userId,
    createdAt,
  });

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

authRouter.post('/login', async (req, res) => {
  const email = normalizeEmail(String(req.body?.email ?? ''));
  const password = String(req.body?.password ?? '');
  const { authSessions } = getAppContext().repositories;

  const user = await authSessions.findUserByEmail(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    jsonError(res, 401, 'Incorrect email or password.', 'INVALID_CREDENTIALS');
    return;
  }

  const token = createSessionToken();
  await authSessions.createSession({
    token,
    userId: user.id,
    createdAt: nowIso(),
  });
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

authRouter.post('/demo', async (req, res) => {
  try {
    const { repositories } = getAppContext();
    const reset = req.body?.reset === true;
    const { importDemo } = await import('../services/demoService.ts').then((m) => ({
      importDemo: m.provisionDemoSession,
    }));
    const result = await importDemo(repositories, { isGuest: false, reset });
    res.json(result);
  } catch (error) {
    console.error('Failed to provision demo session:', error);
    jsonError(res, 500, 'Failed to start demo session.', 'DEMO_SESSION_ERROR');
  }
});

authRouter.post('/guest', async (req, res) => {
  try {
    const { repositories } = getAppContext();
    const { importDemo } = await import('../services/demoService.ts').then((m) => ({
      importDemo: m.provisionDemoSession,
    }));
    const result = await importDemo(repositories, { isGuest: true });
    res.json(result);
  } catch (error) {
    console.error('Failed to provision guest session:', error);
    jsonError(res, 500, 'Failed to start guest session.', 'GUEST_SESSION_ERROR');
  }
});
