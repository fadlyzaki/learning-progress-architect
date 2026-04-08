import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: '.env.local' });
}

const [{ startServer }, { logger }] = await Promise.all([
  import('./server/index.ts'),
  import('./server/utils/logger.ts'),
]);

try {
  await startServer();
} catch (error) {
  logger.fatal({ err: error }, 'Failed to start backend server');
  process.exit(1);
}
