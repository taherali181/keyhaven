import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { calculateAccuracy, calculateConsistency, calculateRawWPM, calculateWPM } from '@/lib/metrics';
import { requireSyncUser } from '@/server/http';
import { arcadeScores, challenges, profiles, typingResults } from '@/server/schema';

const eventSchema = z.object({ key: z.string().max(12), atMs: z.number().int().nonnegative() });
const inputSchema = z.object({ clientResultId: z.string().uuid(), challengeId: z.string().uuid(), elapsedMs: z.number().int().positive().max(600_000), events: z.array(eventSchema).min(1).max(5000) });

export async function POST(request: Request) {
  const context = await requireSyncUser();
  if ('error' in context) return context.error;
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: 'Invalid score evidence.' }, { status: 422 });
  const [challenge] = await context.db.select().from(challenges).where(and(eq(challenges.id, parsed.data.challengeId), eq(challenges.userId, context.userId), isNull(challenges.consumedAt))).limit(1);
  if (!challenge || challenge.expiresAt.getTime() < Date.now()) return Response.json({ error: 'Challenge expired or already submitted.' }, { status: 409 });

  const configuration = challenge.configuration as Record<string, unknown>;
  const target = typeof configuration.targetText === 'string' ? configuration.targetText : '';
  let typed = '';
  let correct = 0;
  let incorrect = 0;
  const errorKeys: Record<string, number> = {};
  let previousAt = -1;
  for (const event of parsed.data.events) {
    if (event.atMs < previousAt || event.atMs > parsed.data.elapsedMs + 250) return Response.json({ error: 'Invalid event timing.' }, { status: 422 });
    previousAt = event.atMs;
    if (event.key === 'Backspace') { typed = typed.slice(0, -1); continue; }
    if (event.key.length !== 1) continue;
    const expected = target[typed.length];
    if (event.key === expected) correct += 1;
    else { incorrect += 1; if (expected) errorKeys[expected] = (errorKeys[expected] ?? 0) + 1; }
    typed += event.key;
  }
  for (let start = 0; start < parsed.data.elapsedMs; start += 1000) {
    if (parsed.data.events.filter(event => event.atMs >= start && event.atMs < start + 1000).length > 25) return Response.json({ error: 'Implausible input rate.' }, { status: 422 });
  }
  const timedDuration = Number(configuration.duration ?? 0);
  if (configuration.testType === 'time' && Math.abs(parsed.data.elapsedMs - timedDuration * 1000) > 1500) return Response.json({ error: 'Timed result duration does not match its challenge.' }, { status: 422 });
  if (configuration.testType === 'words' && typed.length < target.length) return Response.json({ error: 'Word challenge is incomplete.' }, { status: 422 });

  const durationSeconds = parsed.data.elapsedMs / 1000;
  const total = correct + incorrect;
  const wpm = calculateWPM(correct, durationSeconds);
  const rawWpm = calculateRawWPM(total, durationSeconds);
  const accuracy = calculateAccuracy(correct, total);
  const [profile] = await context.db.select().from(profiles).where(eq(profiles.userId, context.userId)).limit(1);
  const visibility = profile?.leaderboardEnabled ? 'public' : 'private';
  await context.db.update(challenges).set({ consumedAt: new Date() }).where(eq(challenges.id, challenge.id));

  if (challenge.mode === 'speed-test') {
    await context.db.insert(typingResults).values({ id: parsed.data.clientResultId, userId: context.userId, mode: 'speed-test', subMode: configuration.testType === 'time' ? `${timedDuration}s` : `${configuration.wordCount} words`, wpm, rawWpm, accuracy, consistency: calculateConsistency([]), durationMs: parsed.data.elapsedMs, totalChars: total, correctChars: correct, incorrectChars: incorrect, errorKeys, challengeId: challenge.id, visibility, occurredAt: new Date() }).onConflictDoNothing();
  } else {
    const score = challenge.mode === 'alphabet-sprint' ? Math.round(100000 / parsed.data.elapsedMs) : Math.round(wpm * accuracy);
    await context.db.insert(arcadeScores).values({ id: parsed.data.clientResultId, userId: context.userId, game: challenge.mode, configuration, score, wpm, accuracy, durationMs: parsed.data.elapsedMs, challengeId: challenge.id, visibility, occurredAt: new Date() }).onConflictDoNothing();
  }
  return Response.json({ accepted: true, result: { wpm, rawWpm, accuracy, visibility } });
}
