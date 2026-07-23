import express from 'express';
import { initializeAppContext } from '../server/appContext.ts';
import { authRouter } from '../server/routes/auth.ts';
import { dataRouter } from '../server/routes/data.ts';
import { workflowRouter } from '../server/routes/workflow.ts';
import { tasksRouter } from '../server/routes/tasks.ts';
import { internalMcpRouter } from '../server/routes/internalMcp.ts';
import { googleCalendarRouter } from '../server/routes/googleCalendar.ts';

const app = express();
app.use(express.json());

// Initialize DB and App Context on cold start
app.use(async (_req, _res, next) => {
  try {
    await initializeAppContext();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/healthz', (_req, res) => {
  res.json({ ok: true, serverless: true });
});

app.use('/api/auth', authRouter);
app.use('/api/data', dataRouter);
app.use('/api/agent/workflow', workflowRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/integrations/google-calendar', googleCalendarRouter);
app.use('/internal/mcp', internalMcpRouter);

export default app;
