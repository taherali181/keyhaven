import { eq } from 'drizzle-orm';
import type { syncDb as syncDbType } from '@/server/db';
import { authRateLimits } from '@/server/schema';

type Database = NonNullable<typeof syncDbType>;

export async function allowAuthAttempt(db: Database, key: string, limit = 8, windowMs = 15 * 60_000) {
  const now = new Date();
  const [record] = await db.select().from(authRateLimits).where(eq(authRateLimits.key, key)).limit(1);
  if (!record || now.getTime() - record.windowStart.getTime() >= windowMs) {
    await db.insert(authRateLimits).values({ key, count: 1, windowStart: now }).onConflictDoUpdate({ target: authRateLimits.key, set: { count: 1, windowStart: now } });
    return true;
  }
  if (record.count >= limit) return false;
  await db.update(authRateLimits).set({ count: record.count + 1 }).where(eq(authRateLimits.key, key));
  return true;
}

export function requestAddress(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}
