import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { env } from './config/env.ts';
import { initializeAppContext } from './appContext.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { attachRequestContext } from './middleware/requestContext.ts';
import { httpLogger } from './middleware/httpLogger.ts';
import { authRouter } from './routes/auth.ts';
import { dataRouter } from './routes/data.ts';
import { workflowRouter } from './routes/workflow.ts';
import { tasksRouter } from './routes/tasks.ts';
import { internalMcpRouter } from './routes/internalMcp.ts';
import { logger } from './utils/logger.ts';

const serverLogger = logger.child({ scope: 'server' });

export async function startServer() {
  serverLogger.info({ port: env.port, nodeEnv: env.nodeEnv }, 'Starting backend server');
  await initializeAppContext();
  serverLogger.info('App context initialized');

  const app = express();
  app.use(attachRequestContext);
  app.use(httpLogger);
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/data', dataRouter);
  app.use('/api/agent/workflow', workflowRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/internal/mcp', internalMcpRouter);

  if (env.nodeEnv !== 'production' && env.nodeEnv !== 'test') {
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

  app.use(errorHandler);

  app.listen(env.port, '0.0.0.0', () => {
    serverLogger.info({ port: env.port }, 'Server listening');
  });
}
