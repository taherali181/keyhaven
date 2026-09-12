import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireCloudUser } from '@/server/http';
import { academyStates, arcadeScores, bookProgress, importedDocuments, typingResults, userSettings } from '@/server/schema';

const result = z.object({ clientId: z.string().uuid(), mode: z.string(), subMode: z.string(), title: z.string().optional(), wpm: z.number(), rawWpm: z.number(), accuracy: z.number(), consistency: z.number(), duration: z.number(), timestamp: z.number(), errorKeys: z.record(z.string(), z.number()), totalChars: z.number().optional(), correctChars: z.number().optional(), incorrectChars: z.number().optional() });
const progress = z.object({ bookId: z.string(), chapterId: z.string().optional(), chapterIndex: z.number().int().nonnegative(), charOffset: z.number().int().nonnegative(), lastRead: z.number() });
const score = z.object({ clientId: z.string().uuid(), game: z.string(), score: z.number(), wpm: z.number(), accuracy: z.number(), timeMs: z.number(), timestamp: z.number(), configuration: z.record(z.string(), z.unknown()).optional() });
const document = z.object({ id: z.string().uuid(), title: z.string().max(300), author: z.string().max(200), format: z.enum(['epub', 'pdf']), sections: z.array(z.object({ id: z.string(), title: z.string().max(300), text: z.string().max(750_000) })).max(500), createdAt: z.number(), updatedAt: z.number() });
const academy = z.object({ value: z.record(z.string(), z.unknown()), updatedAt: z.number() });
const input = z.object({ settings: z.object({ value: z.record(z.string(), z.unknown()), updatedAt: z.number() }).optional(), progress: z.array(progress).max(500).default([]), results: z.array(result).max(500).default([]), scores: z.array(score).max(500).default([]), documents: z.array(document).max(40).default([]), academy: academy.optional() });

export async function POST(request: Request) {
  const context = await requireCloudUser();
  if ('error' in context) return context.error;
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: 'Invalid sync payload.' }, { status: 422 });
  const payload = parsed.data;
  if (payload.settings) {
    await context.db.insert(userSettings).values({ userId: context.userId, settings: payload.settings.value, updatedAt: new Date(payload.settings.updatedAt) }).onConflictDoUpdate({
      target: userSettings.userId,
      set: { settings: payload.settings.value, updatedAt: new Date(payload.settings.updatedAt) },
      setWhere: sql`${userSettings.updatedAt} < excluded.updated_at`
    });
  }
  for (const item of payload.progress) {
    await context.db.insert(bookProgress).values({ userId: context.userId, bookId: item.bookId, chapterId: item.chapterId ?? String(item.chapterIndex), chapterIndex: item.chapterIndex, charOffset: item.charOffset, completed: false, updatedAt: new Date(item.lastRead) }).onConflictDoUpdate({
      target: [bookProgress.userId, bookProgress.bookId, bookProgress.chapterId],
      set: { charOffset: item.charOffset, chapterIndex: item.chapterIndex, updatedAt: new Date(item.lastRead) },
      setWhere: sql`${bookProgress.updatedAt} < excluded.updated_at`
    });
  }
  for (const item of payload.results) {
    await context.db.insert(typingResults).values({ id: item.clientId, userId: context.userId, mode: item.mode, subMode: item.subMode, title: item.title, wpm: item.wpm, rawWpm: item.rawWpm, accuracy: item.accuracy, consistency: item.consistency, durationMs: Math.round(item.duration * 1000), totalChars: item.totalChars ?? 0, correctChars: item.correctChars ?? 0, incorrectChars: item.incorrectChars ?? 0, errorKeys: item.errorKeys, visibility: 'private', occurredAt: new Date(item.timestamp) }).onConflictDoNothing();
  }
  for (const item of payload.scores) {
    await context.db.insert(arcadeScores).values({ id: item.clientId, userId: context.userId, game: item.game, configuration: item.configuration ?? {}, score: item.score, wpm: item.wpm, accuracy: item.accuracy, durationMs: item.timeMs, visibility: 'private', occurredAt: new Date(item.timestamp) }).onConflictDoNothing();
  }
  for (const item of payload.documents) {
    await context.db.insert(importedDocuments).values({ id: item.id, userId: context.userId, title: item.title, author: item.author, format: item.format, sections: item.sections, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) }).onConflictDoUpdate({ target: [importedDocuments.userId, importedDocuments.id], set: { title: item.title, author: item.author, sections: item.sections, updatedAt: new Date(item.updatedAt) }, setWhere: sql`${importedDocuments.updatedAt} < excluded.updated_at` });
  }
  if (payload.academy) await context.db.insert(academyStates).values({ userId: context.userId, state: payload.academy.value, updatedAt: new Date(payload.academy.updatedAt) }).onConflictDoUpdate({ target: academyStates.userId, set: { state: payload.academy.value, updatedAt: new Date(payload.academy.updatedAt) }, setWhere: sql`${academyStates.updatedAt} < excluded.updated_at` });
  const [settings, progressRows, resultRows, scoreRows, documentRows, academyRows] = await Promise.all([
    context.db.select().from(userSettings).where(eq(userSettings.userId, context.userId)),
    context.db.select().from(bookProgress).where(eq(bookProgress.userId, context.userId)),
    context.db.select().from(typingResults).where(eq(typingResults.userId, context.userId)).limit(500),
    context.db.select().from(arcadeScores).where(eq(arcadeScores.userId, context.userId)).limit(500),
    context.db.select().from(importedDocuments).where(eq(importedDocuments.userId, context.userId)).limit(40),
    context.db.select().from(academyStates).where(eq(academyStates.userId, context.userId)).limit(1)
  ]);
  return Response.json({ settings: settings[0] ?? null, progress: progressRows, results: resultRows, scores: scoreRows, documents: documentRows, academy: academyRows[0] ?? null, syncedAt: Date.now() });
}
