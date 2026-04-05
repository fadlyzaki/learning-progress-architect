import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { migrateDatabase } from './db.ts';
import { authRouter } from './routes/auth.ts';
import { dataRouter } from './routes/data.ts';
import { workflowRouter } from './routes/workflow.ts';
import { tasksRouter } from './routes/tasks.ts';

migrateDatabase();

export async function startServer() {
  const app = express();
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/data', dataRouter);
  app.use('/api/agent/workflow', workflowRouter);
  app.use('/api/tasks', tasksRouter);

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

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}
