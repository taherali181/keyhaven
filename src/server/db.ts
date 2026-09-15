import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/** The Backup & sync database (Neon Postgres). Null without DATABASE_URL: the app then works on this device only. */
export const syncDb = process.env.DATABASE_URL
  ? drizzle(neon(process.env.DATABASE_URL), { schema })
  : null;
