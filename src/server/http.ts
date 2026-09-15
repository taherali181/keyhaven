import { auth } from '@/auth';
import { syncDb } from './db';

export async function requireSyncUser() {
  if (!syncDb) return { error: Response.json({ error: "Backup & sync isn't set up on this server." }, { status: 503 }) } as const;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: Response.json({ error: 'Sign in to use Backup & sync.' }, { status: 401 }) } as const;
  return { db: syncDb, userId } as const;
}
