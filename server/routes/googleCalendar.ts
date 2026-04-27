import { Router } from 'express';
import { getAppContext } from '../appContext.ts';
import { requireUser } from '../middleware/auth.ts';
import { jsonError } from '../utils/http.ts';
import {
  GoogleCalendarIntegrationError,
  createGoogleCalendarAuthUrl,
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  handleGoogleCalendarOAuthCallback,
  syncGoogleCalendarEvents,
} from '../services/googleCalendarService.ts';

export const googleCalendarRouter = Router();

googleCalendarRouter.get('/status', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  try {
    const status = await getGoogleCalendarStatus(getAppContext().repositories, user.id);
    res.json(status);
  } catch (error) {
    handleGoogleCalendarError(res, error);
  }
});

googleCalendarRouter.post('/connect', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  try {
    const authUrl = await createGoogleCalendarAuthUrl(getAppContext().repositories, user);
    res.json({ authUrl });
  } catch (error) {
    handleGoogleCalendarError(res, error);
  }
});

googleCalendarRouter.get('/callback', async (req, res) => {
  const errorParam = String(req.query.error ?? '').trim();
  if (errorParam) {
    console.warn(`Google Calendar OAuth denied: ${errorParam}`);
    res.redirect(`/app?googleCalendar=error&reason=${encodeURIComponent(errorParam)}`);
    return;
  }

  const code = String(req.query.code ?? '').trim();
  const state = String(req.query.state ?? '').trim();

  if (!code || !state) {
    jsonError(res, 400, 'Google Calendar authorization response is incomplete.', 'GOOGLE_CALENDAR_CALLBACK_INVALID');
    return;
  }

  try {
    await handleGoogleCalendarOAuthCallback(getAppContext().repositories, { code, state });
    res.redirect('/app?googleCalendar=connected');
  } catch (error) {
    console.error('Google Calendar OAuth callback failed.', error);
    res.redirect('/app?googleCalendar=error');
  }
});

googleCalendarRouter.post('/disconnect', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  try {
    await disconnectGoogleCalendar(getAppContext().repositories, user.id);
    res.json({ success: true });
  } catch (error) {
    handleGoogleCalendarError(res, error);
  }
});

googleCalendarRouter.post('/sync', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  try {
    const result = await syncGoogleCalendarEvents(getAppContext().repositories, user.id);
    res.json(result);
  } catch (error) {
    handleGoogleCalendarError(res, error);
  }
});

function handleGoogleCalendarError(res: Parameters<typeof jsonError>[0], error: unknown) {
  if (error instanceof GoogleCalendarIntegrationError) {
    jsonError(res, error.status, error.message, error.code);
    return;
  }

  if (error instanceof Error && error.message.includes('Google Calendar sync is disabled')) {
    jsonError(res, 503, 'Google Calendar sync is disabled.', 'GOOGLE_CALENDAR_DISABLED');
    return;
  }

  if (error instanceof Error && error.message.includes('Google Calendar integration is not configured')) {
    jsonError(res, 503, 'Google Calendar integration is not configured.', 'GOOGLE_CALENDAR_NOT_CONFIGURED');
    return;
  }

  console.error('Google Calendar integration failed.', error);
  jsonError(res, 500, 'Google Calendar integration failed.', 'GOOGLE_CALENDAR_FAILED');
}
