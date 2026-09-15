import { z } from 'zod';
import { requireSyncUser } from '@/server/http';
import { challenges } from '@/server/schema';
import { challengeText } from '@/server/challenges';

const input = z.object({
  mode: z.enum(['speed-test', 'alphabet-sprint', 'word-rain', 'ghost-racer']),
  configuration: z.object({ testType: z.enum(['time', 'words']).optional(), duration: z.number().int().min(15).max(120).optional(), wordCount: z.number().int().min(10).max(100).optional(), ghostWpm: z.number().int().min(40).max(120).optional() }).passthrough()
});

export async function POST(request: Request) {
  const context = await requireSyncUser();
  if ('error' in context) return context.error;
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: 'Invalid challenge configuration.' }, { status: 422 });
  const seed = crypto.randomUUID();
  const count = parsed.data.mode === 'speed-test'
    ? parsed.data.configuration.testType === 'words' ? parsed.data.configuration.wordCount ?? 25 : Math.max(100, (parsed.data.configuration.duration ?? 30) * 6)
    : parsed.data.mode === 'ghost-racer' ? 18 : 26;
  const targetText = parsed.data.mode === 'alphabet-sprint' ? 'abcdefghijklmnopqrstuvwxyz' : challengeText(seed, count);
  const expiresAt = new Date(Date.now() + 15 * 60_000);
  const [challenge] = await context.db.insert(challenges).values({ userId: context.userId, mode: parsed.data.mode, configuration: { ...parsed.data.configuration, targetText }, seed, expiresAt }).returning();
  return Response.json({ challengeId: challenge.id, targetText, seed, expiresAt: expiresAt.toISOString() });
}
