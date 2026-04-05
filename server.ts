import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: '.env.local' });
}

const { startServer } = await import('./server/index.ts');

startServer();
