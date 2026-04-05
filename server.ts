import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { startServer } = await import('./server/index.ts');

startServer();
