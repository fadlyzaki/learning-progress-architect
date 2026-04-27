import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { env } from './config/env.ts';
import { initializeAppContext } from './appContext.ts';
import { authRouter } from './routes/auth.ts';
import { dataRouter } from './routes/data.ts';
import { workflowRouter } from './routes/workflow.ts';
import { tasksRouter } from './routes/tasks.ts';
import { internalMcpRouter } from './routes/internalMcp.ts';
import { googleCalendarRouter } from './routes/googleCalendar.ts';

export async function startServer() {
  await initializeAppContext();

  const app = express();
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/data', dataRouter);
  app.use('/api/agent/workflow', workflowRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/integrations/google-calendar', googleCalendarRouter);
  app.use('/internal/mcp', internalMcpRouter);

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Server running on port ${env.port}`);
  });
}
