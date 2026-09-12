import { auth } from '@/auth';
import { cloudDb } from './db';

export async function requireCloudUser() {
  if (!cloudDb) return { error: Response.json({ error: 'Cloud sync is not configured.' }, { status: 503 }) } as const;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: Response.json({ error: 'Authentication required.' }, { status: 401 }) } as const;
  return { db: cloudDb, userId } as const;
}
