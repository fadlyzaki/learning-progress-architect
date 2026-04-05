import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { startServer } from './server/index.ts';

startServer();
