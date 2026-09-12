import { and, desc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { cloudDb } from '@/server/db';
import { arcadeScores, profiles, typingResults } from '@/server/schema';

const querySchema = z.object({ mode: z.enum(['speed-test', 'alphabet-sprint', 'word-rain', 'ghost-racer']).default('speed-test'), period: z.enum(['day', 'week', 'all']).default('all') });

export async function GET(request: Request) {
  if (!cloudDb) return Response.json({ entries: [], cloudConfigured: false });
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return Response.json({ error: 'Invalid leaderboard query.' }, { status: 422 });
  const after = parsed.data.period === 'day' ? new Date(Date.now() - 86_400_000) : parsed.data.period === 'week' ? new Date(Date.now() - 604_800_000) : null;
  if (parsed.data.mode === 'speed-test') {
    const entries = await cloudDb.select({ handle: profiles.handle, score: typingResults.wpm, accuracy: typingResults.accuracy, occurredAt: typingResults.occurredAt }).from(typingResults).innerJoin(profiles, eq(profiles.userId, typingResults.userId)).where(and(eq(typingResults.mode, 'speed-test'), eq(typingResults.visibility, 'public'), eq(profiles.leaderboardEnabled, true), after ? gte(typingResults.occurredAt, after) : undefined)).orderBy(desc(typingResults.wpm), desc(typingResults.accuracy)).limit(50);
    return Response.json({ entries, cloudConfigured: true });
  }
  const entries = await cloudDb.select({ handle: profiles.handle, score: arcadeScores.score, accuracy: arcadeScores.accuracy, occurredAt: arcadeScores.occurredAt }).from(arcadeScores).innerJoin(profiles, eq(profiles.userId, arcadeScores.userId)).where(and(eq(arcadeScores.game, parsed.data.mode), eq(arcadeScores.visibility, 'public'), eq(profiles.leaderboardEnabled, true), after ? gte(arcadeScores.occurredAt, after) : undefined)).orderBy(desc(arcadeScores.score), desc(arcadeScores.accuracy)).limit(50);
  return Response.json({ entries, cloudConfigured: true });
}
