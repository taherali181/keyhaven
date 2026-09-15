import { eq } from 'drizzle-orm';
import type { syncDb as syncDbType } from '@/server/db';
import { profiles } from '@/server/schema';

type Database = NonNullable<typeof syncDbType>;

export async function createUniqueProfile(db: Database, userId: string, source: string) {
  const stem = source.toLowerCase().replace(/@.*$/, '').replace(/[^a-z0-9_]/g, '').slice(0, 18) || 'reader';
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const handle = attempt === 0 ? stem : `${stem}_${Math.floor(1000 + Math.random() * 9000)}`;
    const existing = await db.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.handleNormalized, handle)).limit(1);
    if (!existing.length) { await db.insert(profiles).values({ userId, handle, handleNormalized: handle }); return; }
  }
  const handle = `reader_${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(profiles).values({ userId, handle, handleNormalized: handle });
}
