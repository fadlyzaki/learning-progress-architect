import express from 'express';
import { initializeAppContext } from './appContext.ts';
import { authRouter } from './routes/auth.ts';
import { dataRouter } from './routes/data.ts';
import { workflowRouter } from './routes/workflow.ts';
import { tasksRouter } from './routes/tasks.ts';
import { internalMcpRouter } from './routes/internalMcp.ts';
import { googleCalendarRouter } from './routes/googleCalendar.ts';

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
