// Server side of Backup & sync: storing pushed batches and paging changes back out by synced_at.
import { and, asc, eq, inArray, lte, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { syncDb } from '@/server/db';
import {
  academyStates, arcadeScores, importedDocuments, msNow, readingProgress, readingSessions, shelfItems, syncTombstones, typingResults, userItems, userSettings
} from '@/server/schema';
import type { KeyedSyncEntity } from '@/types';
import { isUuid, latestByKey } from '@/lib/sync/merge';
import {
  DOCUMENT_PULL_LIMIT, KEYED_ENTITIES, KEYED_PULL_LIMIT, PULL_LIMIT,
  type Cursor, type DocumentRow, type KeyedStateRow, type PullPage, type PushInputParsed, type PushResult, type ResultRow,
  type ScoreRow, type SessionRow, type StateRow, type SyncEntity, type TombstoneRow
} from '@/lib/sync/protocol';

export type SyncDatabase = NonNullable<typeof syncDb>;

/** Rows strictly after the cursor, ordering ties on synced_at by key. */
const after = (synced: AnyPgColumn, key: AnyPgColumn, t: number, k: string): SQL =>
  sql`(${synced}, ${key}::text) > (${new Date(t).toISOString()}::timestamptz, ${k})`;
const cursorOrder = (synced: AnyPgColumn, key: AnyPgColumn) => [asc(synced), asc(sql`${key}::text`)];

function toPage<Row, Out>(rows: Row[], limit: number, cursorOf: (row: Row) => Cursor, map: (row: Row) => Out): PullPage<Out> {
  const last = rows[rows.length - 1];
  return { rows: rows.map(map), cursor: last ? cursorOf(last) : null, more: rows.length === limit };
}

const asState = (value: unknown) => (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;

const isKeyed = (entity: string): entity is KeyedSyncEntity => (KEYED_ENTITIES as readonly string[]).includes(entity);

async function pullKeyed(db: SyncDatabase, userId: string, entity: KeyedSyncEntity, t: number, k: string): Promise<PullPage> {
  const limit = KEYED_PULL_LIMIT[entity];
  const rows = await db.select().from(userItems)
    .where(and(eq(userItems.userId, userId), eq(userItems.entity, entity), after(userItems.syncedAt, userItems.key, t, k)))
    .orderBy(...cursorOrder(userItems.syncedAt, userItems.key)).limit(limit);
  return toPage(rows, limit, row => ({ t: row.syncedAt.getTime(), k: row.key }), (row): KeyedStateRow => ({ key: row.key, updatedAt: row.updatedAt.getTime(), state: asState(row.state) }));
}

/** Upserts newer rows only, then returns the server's copy of each, so the device learns when a newer edit won. */
async function pushKeyed(db: SyncDatabase, userId: string, entity: KeyedSyncEntity, input: KeyedStateRow[]): Promise<KeyedStateRow[]> {
  const rows = latestByKey(input, row => row.key, row => row.updatedAt);
  if (!rows.length) return [];
  await db.insert(userItems).values(rows.map(row => ({ userId, entity, key: row.key, state: row.state, updatedAt: new Date(row.updatedAt) })))
    .onConflictDoUpdate({ target: [userItems.userId, userItems.entity, userItems.key], set: { state: sql`excluded.state`, updatedAt: sql`excluded.updated_at`, syncedAt: msNow }, setWhere: sql`${userItems.updatedAt} < excluded.updated_at` });
  const current = await db.select().from(userItems).where(and(eq(userItems.userId, userId), eq(userItems.entity, entity), inArray(userItems.key, rows.map(row => row.key))));
  return current.map(row => ({ key: row.key, updatedAt: row.updatedAt.getTime(), state: asState(row.state) }));
}

export async function pullPage(db: SyncDatabase, userId: string, entity: SyncEntity, t: number, k: string): Promise<PullPage> {
  if (isKeyed(entity)) return pullKeyed(db, userId, entity, t, k);
  switch (entity) {
    case 'results': {
      const rows = await db.select().from(typingResults).where(and(eq(typingResults.userId, userId), after(typingResults.syncedAt, typingResults.id, t, k))).orderBy(...cursorOrder(typingResults.syncedAt, typingResults.id)).limit(PULL_LIMIT);
      return toPage(rows, PULL_LIMIT, row => ({ t: row.syncedAt.getTime(), k: row.id }), (row): ResultRow => ({
        clientId: row.id, mode: row.mode, subMode: row.subMode, title: row.title ?? undefined, wpm: row.wpm, rawWpm: row.rawWpm, accuracy: row.accuracy,
        consistency: row.consistency, duration: row.durationMs / 1000, timestamp: row.occurredAt.getTime(), errors: row.incorrectChars,
        errorKeys: (row.errorKeys ?? {}) as Record<string, number>, totalChars: row.totalChars, correctChars: row.correctChars, incorrectChars: row.incorrectChars,
        visibility: row.visibility === 'public' ? 'public' : 'private'
      }));
    }
    case 'scores': {
      const rows = await db.select().from(arcadeScores).where(and(eq(arcadeScores.userId, userId), after(arcadeScores.syncedAt, arcadeScores.id, t, k))).orderBy(...cursorOrder(arcadeScores.syncedAt, arcadeScores.id)).limit(PULL_LIMIT);
      return toPage(rows, PULL_LIMIT, row => ({ t: row.syncedAt.getTime(), k: row.id }), (row): ScoreRow => ({
        clientId: row.id, game: row.game, score: row.score, wpm: row.wpm, accuracy: row.accuracy, timeMs: row.durationMs, timestamp: row.occurredAt.getTime(),
        configuration: asState(row.configuration), visibility: row.visibility === 'public' ? 'public' : 'private'
      }));
    }
    case 'sessions': {
      const rows = await db.select().from(readingSessions).where(and(eq(readingSessions.userId, userId), after(readingSessions.syncedAt, readingSessions.id, t, k))).orderBy(...cursorOrder(readingSessions.syncedAt, readingSessions.id)).limit(PULL_LIMIT);
      return toPage(rows, PULL_LIMIT, row => ({ t: row.syncedAt.getTime(), k: row.id }), (row): SessionRow => ({
        clientId: row.id, workKey: row.workKey, kind: row.kind as SessionRow['kind'], title: row.title, author: row.author, mode: row.mode === 'type' ? 'type' : 'read',
        startedAt: row.startedAt.getTime(), durationMs: row.durationMs, words: row.words, pages: row.pages
      }));
    }
    case 'progress': {
      const rows = await db.select().from(readingProgress).where(and(eq(readingProgress.userId, userId), after(readingProgress.syncedAt, readingProgress.workKey, t, k))).orderBy(...cursorOrder(readingProgress.syncedAt, readingProgress.workKey)).limit(PULL_LIMIT);
      return toPage(rows, PULL_LIMIT, row => ({ t: row.syncedAt.getTime(), k: row.workKey }), (row): KeyedStateRow => ({ key: row.workKey, updatedAt: row.updatedAt.getTime(), state: asState(row.state) }));
    }
    case 'shelf': {
      const rows = await db.select().from(shelfItems).where(and(eq(shelfItems.userId, userId), after(shelfItems.syncedAt, shelfItems.key, t, k))).orderBy(...cursorOrder(shelfItems.syncedAt, shelfItems.key)).limit(PULL_LIMIT);
      return toPage(rows, PULL_LIMIT, row => ({ t: row.syncedAt.getTime(), k: row.key }), (row): KeyedStateRow => ({ key: row.key, updatedAt: row.updatedAt.getTime(), state: asState(row.state) }));
    }
    case 'documents': {
      const rows = await db.select().from(importedDocuments).where(and(eq(importedDocuments.userId, userId), after(importedDocuments.syncedAt, importedDocuments.id, t, k))).orderBy(...cursorOrder(importedDocuments.syncedAt, importedDocuments.id)).limit(DOCUMENT_PULL_LIMIT);
      return toPage(rows, DOCUMENT_PULL_LIMIT, row => ({ t: row.syncedAt.getTime(), k: row.id }), (row): DocumentRow => ({
        id: row.id, title: row.title, author: row.author, format: row.format === 'pdf' ? 'pdf' : 'epub', sections: row.sections as DocumentRow['sections'],
        createdAt: row.createdAt.getTime(), updatedAt: row.updatedAt.getTime()
      }));
    }
    case 'academy': {
      const rows = await db.select().from(academyStates).where(and(eq(academyStates.userId, userId), after(academyStates.syncedAt, academyStates.userId, t, k))).limit(1);
      return toPage(rows, 2, row => ({ t: row.syncedAt.getTime(), k: row.userId }), (row): StateRow => ({ updatedAt: row.updatedAt.getTime(), state: asState(row.state) }));
    }
    case 'settings': {
      const rows = await db.select().from(userSettings).where(and(eq(userSettings.userId, userId), after(userSettings.syncedAt, userSettings.userId, t, k))).limit(1);
      return toPage(rows, 2, row => ({ t: row.syncedAt.getTime(), k: row.userId }), (row): StateRow => ({ updatedAt: row.updatedAt.getTime(), state: asState(row.settings) }));
    }
    case 'tombstones': {
      const rows = await db.select().from(syncTombstones).where(and(eq(syncTombstones.userId, userId), after(syncTombstones.syncedAt, syncTombstones.id, t, k))).orderBy(...cursorOrder(syncTombstones.syncedAt, syncTombstones.id)).limit(PULL_LIMIT);
      return toPage(rows, PULL_LIMIT, row => ({ t: row.syncedAt.getTime(), k: row.id }), (row): TombstoneRow => ({ entity: row.entity as TombstoneRow['entity'], key: row.key, deletedAt: row.deletedAt.getTime() }));
    }
  }
}

/** Removes what a deletion covers. Immutable records go by id; merged records only if not edited after the deletion. */
async function deleteCovered(db: SyncDatabase, userId: string, tombstone: TombstoneRow) {
  const at = new Date(tombstone.deletedAt);
  const all = tombstone.key === '*';
  if (isKeyed(tombstone.entity)) {
    await db.delete(userItems).where(and(eq(userItems.userId, userId), eq(userItems.entity, tombstone.entity), all ? undefined : eq(userItems.key, tombstone.key), lte(userItems.updatedAt, at)));
    return;
  }
  switch (tombstone.entity) {
    case 'results':
      if (all) await db.delete(typingResults).where(and(eq(typingResults.userId, userId), lte(typingResults.occurredAt, at)));
      else if (isUuid(tombstone.key)) await db.delete(typingResults).where(and(eq(typingResults.userId, userId), eq(typingResults.id, tombstone.key)));
      return;
    case 'scores':
      if (all) await db.delete(arcadeScores).where(and(eq(arcadeScores.userId, userId), lte(arcadeScores.occurredAt, at)));
      else if (isUuid(tombstone.key)) await db.delete(arcadeScores).where(and(eq(arcadeScores.userId, userId), eq(arcadeScores.id, tombstone.key)));
      return;
    case 'sessions':
      if (all) await db.delete(readingSessions).where(and(eq(readingSessions.userId, userId), lte(readingSessions.startedAt, at)));
      else if (isUuid(tombstone.key)) await db.delete(readingSessions).where(and(eq(readingSessions.userId, userId), eq(readingSessions.id, tombstone.key)));
      return;
    case 'progress':
      await db.delete(readingProgress).where(and(eq(readingProgress.userId, userId), all ? undefined : eq(readingProgress.workKey, tombstone.key), lte(readingProgress.updatedAt, at)));
      return;
    case 'shelf':
      await db.delete(shelfItems).where(and(eq(shelfItems.userId, userId), all ? undefined : eq(shelfItems.key, tombstone.key), lte(shelfItems.updatedAt, at)));
      return;
    case 'documents':
      if (all || isUuid(tombstone.key)) await db.delete(importedDocuments).where(and(eq(importedDocuments.userId, userId), all ? undefined : eq(importedDocuments.id, tombstone.key), lte(importedDocuments.updatedAt, at)));
      return;
  }
}

const round = (value: number) => Math.round(value);

/** Stores one pushed batch. Returns the server's copy of every keyed record in it (see PushResult). */
export async function pushBatch(db: SyncDatabase, userId: string, input: PushInputParsed): Promise<PushResult> {
  const result: PushResult = { progress: [], shelf: [], highlights: [], favorites: [], manuscripts: [], academy: null, settings: null };

  const tombstones = latestByKey(input.tombstones, row => `${row.entity}:${row.key}`, row => row.deletedAt);
  if (tombstones.length) {
    await db.insert(syncTombstones).values(tombstones.map(row => ({ userId, entity: row.entity, key: row.key, deletedAt: new Date(row.deletedAt) })))
      .onConflictDoUpdate({ target: [syncTombstones.userId, syncTombstones.entity, syncTombstones.key], set: { deletedAt: sql`greatest(${syncTombstones.deletedAt}, excluded.deleted_at)`, syncedAt: msNow } });
    for (const tombstone of tombstones) await deleteCovered(db, userId, tombstone);
  }

  const results = latestByKey(input.results, row => row.clientId, row => row.timestamp);
  if (results.length) {
    await db.insert(typingResults).values(results.map(row => ({
      id: row.clientId, userId, mode: row.mode, subMode: row.subMode, title: row.title, wpm: round(row.wpm), rawWpm: round(row.rawWpm), accuracy: row.accuracy,
      consistency: round(row.consistency), durationMs: round(row.duration * 1000), totalChars: round(row.totalChars ?? 0), correctChars: round(row.correctChars ?? 0),
      incorrectChars: round(row.incorrectChars ?? row.errors ?? 0), errorKeys: row.errorKeys, occurredAt: new Date(row.timestamp)
    }))).onConflictDoNothing();
  }

  const scores = latestByKey(input.scores, row => row.clientId, row => row.timestamp);
  if (scores.length) {
    await db.insert(arcadeScores).values(scores.map(row => ({
      id: row.clientId, userId, game: row.game, configuration: row.configuration ?? {}, score: round(row.score), wpm: round(row.wpm), accuracy: row.accuracy,
      durationMs: round(row.timeMs), occurredAt: new Date(row.timestamp)
    }))).onConflictDoNothing();
  }

  const sessions = latestByKey(input.sessions, row => row.clientId, row => row.startedAt);
  if (sessions.length) {
    await db.insert(readingSessions).values(sessions.map(row => ({
      id: row.clientId, userId, workKey: row.workKey, kind: row.kind, title: row.title, author: row.author, mode: row.mode,
      startedAt: new Date(row.startedAt), durationMs: row.durationMs, words: row.words, pages: row.pages
    }))).onConflictDoNothing();
  }

  const progress = latestByKey(input.progress, row => row.key, row => row.updatedAt);
  if (progress.length) {
    await db.insert(readingProgress).values(progress.map(row => ({ userId, workKey: row.key, state: row.state, updatedAt: new Date(row.updatedAt) })))
      .onConflictDoUpdate({ target: [readingProgress.userId, readingProgress.workKey], set: { state: sql`excluded.state`, updatedAt: sql`excluded.updated_at`, syncedAt: msNow }, setWhere: sql`${readingProgress.updatedAt} < excluded.updated_at` });
    const current = await db.select().from(readingProgress).where(and(eq(readingProgress.userId, userId), inArray(readingProgress.workKey, progress.map(row => row.key))));
    result.progress = current.map(row => ({ key: row.workKey, updatedAt: row.updatedAt.getTime(), state: asState(row.state) }));
  }

  const shelf = latestByKey(input.shelf, row => row.key, row => row.updatedAt);
  if (shelf.length) {
    await db.insert(shelfItems).values(shelf.map(row => ({ userId, key: row.key, state: row.state, updatedAt: new Date(row.updatedAt) })))
      .onConflictDoUpdate({ target: [shelfItems.userId, shelfItems.key], set: { state: sql`excluded.state`, updatedAt: sql`excluded.updated_at`, syncedAt: msNow }, setWhere: sql`${shelfItems.updatedAt} < excluded.updated_at` });
    const current = await db.select().from(shelfItems).where(and(eq(shelfItems.userId, userId), inArray(shelfItems.key, shelf.map(row => row.key))));
    result.shelf = current.map(row => ({ key: row.key, updatedAt: row.updatedAt.getTime(), state: asState(row.state) }));
  }

  for (const entity of KEYED_ENTITIES) result[entity] = await pushKeyed(db, userId, entity, input[entity]);

  for (const row of input.documents) {
    await db.insert(importedDocuments).values({ id: row.id, userId, title: row.title, author: row.author, format: row.format, sections: row.sections, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) })
      .onConflictDoUpdate({ target: [importedDocuments.userId, importedDocuments.id], set: { title: sql`excluded.title`, author: sql`excluded.author`, format: sql`excluded.format`, sections: sql`excluded.sections`, updatedAt: sql`excluded.updated_at`, syncedAt: msNow }, setWhere: sql`${importedDocuments.updatedAt} < excluded.updated_at` });
  }

  if (input.academy) {
    await db.insert(academyStates).values({ userId, state: input.academy.state, updatedAt: new Date(input.academy.updatedAt) })
      .onConflictDoUpdate({ target: academyStates.userId, set: { state: sql`excluded.state`, updatedAt: sql`excluded.updated_at`, syncedAt: msNow }, setWhere: sql`${academyStates.updatedAt} < excluded.updated_at` });
    const [row] = await db.select().from(academyStates).where(eq(academyStates.userId, userId)).limit(1);
    result.academy = row ? { updatedAt: row.updatedAt.getTime(), state: asState(row.state) } : null;
  }

  if (input.settings) {
    await db.insert(userSettings).values({ userId, settings: input.settings.state, updatedAt: new Date(input.settings.updatedAt) })
      .onConflictDoUpdate({ target: userSettings.userId, set: { settings: sql`excluded.settings`, updatedAt: sql`excluded.updated_at`, syncedAt: msNow }, setWhere: sql`${userSettings.updatedAt} < excluded.updated_at` });
    const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    result.settings = row ? { updatedAt: row.updatedAt.getTime(), state: asState(row.settings) } : null;
  }

  return result;
}
