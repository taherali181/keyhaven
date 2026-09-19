// The Backup & sync engine: pushes this device's changes in batches, then pulls every entity's changes since
// the last cursor and merges them last-writer-wins. See src/lib/sync/protocol.ts for the wire format.
import type { Table, UpdateSpec } from 'dexie';
import { db } from '@/lib/db';
import type { AcademyStateRecord, BookProgressRecord, ImportedDocumentRecord, KeyedSyncEntity, ShelfRecord, TestResultRecord, TypingMode, UserSettings } from '@/types';
import { applyingRemote } from '@/lib/sync/tracking';
import { chunk, finite, isUuid, jsonBytes, keyedPuts, latestByKey, remoteWins, tombstoneCovers } from '@/lib/sync/merge';
import {
  KEYED_ENTITIES, MANUSCRIPT_BATCH, MAX_DOCUMENT_BYTES, MAX_MANUSCRIPT_BYTES, PUSH_BATCH, SYNC_ENTITIES,
  type Cursor, type DocumentRow, type KeyedStateRow, type PullPage, type PushInput, type PushResult,
  type ResultRow, type ScoreRow, type SessionRow, type StateRow, type SyncEntity, type TombstoneRow
} from '@/lib/sync/protocol';

export class SyncError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export interface SyncTransport {
  push(body: PushInput): Promise<PushResult>;
  pull(entity: SyncEntity, cursor: Cursor | null): Promise<PullPage>;
}

async function errorText(response: Response) {
  try {
    const body = await response.json() as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export const httpTransport: SyncTransport = {
  async push(body) {
    const response = await fetch('/api/sync/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new SyncError(await errorText(response), response.status);
    return await response.json() as PushResult;
  },
  async pull(entity, cursor) {
    const query = new URLSearchParams({ entity });
    if (cursor) { query.set('t', String(cursor.t)); query.set('k', cursor.k); }
    const response = await fetch(`/api/sync/pull?${query}`, { cache: 'no-store' });
    if (!response.ok) throw new SyncError(await errorText(response), response.status);
    return await response.json() as PullPage;
  }
};

export interface SettingsIO { get(): UserSettings; apply(settings: UserSettings): void }
export interface SyncSummary { pushed: number; pulled: number; skippedDocuments: number; skippedManuscripts: number }

/** Settings that describe this device rather than the reader, so they never travel. */
const DEVICE_ONLY_SETTINGS = ['zenMode'] as const;

const storageKey = (name: string, userId: string) => `keyhaven_backup_${name}_v1:${userId}`;
const LAST_USER_KEY = 'keyhaven_backup_user_v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

function withoutSyncFields(record: object): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...record };
  delete copy.dirty;
  delete copy.syncedAt;
  return copy;
}

/**
 * Sends a batch; if the server rejects it as invalid, retries row by row so one malformed old record can never
 * block the rest. Rows that still fail are reported back and skipped.
 */
async function sendBatch<T>(rows: T[], send: (batch: T[]) => Promise<PushResult>): Promise<PushResult[]> {
  try {
    return [await send(rows)];
  } catch (error) {
    if (!(error instanceof SyncError) || error.status !== 422) throw error;
    if (rows.length === 1) return [];
    const results: PushResult[] = [];
    for (const row of rows) {
      try { results.push(await send([row])); } catch (inner) { if (!(inner instanceof SyncError) || inner.status !== 422) throw inner; }
    }
    return results;
  }
}

// ── Push ──

async function pushTombstones(transport: SyncTransport) {
  const pending = await db.pendingDeletes.toArray();
  for (const batch of chunk(pending, PUSH_BATCH)) {
    await sendBatch(batch, rows => transport.push({ tombstones: rows.map(({ entity, key, deletedAt }) => ({ entity, key, deletedAt })) }));
    await db.pendingDeletes.bulkDelete(batch.map(item => item.id));
  }
  return pending.length;
}

async function pushSettings(transport: SyncTransport, userId: string, io: SettingsIO) {
  const marker = storageKey('settings', userId);
  const settings = io.get();
  if (!settings.updatedAt || settings.updatedAt <= readJson<number>(marker, 0)) return 0;
  const state: Record<string, unknown> = { ...settings };
  for (const key of DEVICE_ONLY_SETTINGS) delete state[key];
  const [result] = await sendBatch([state], ([row]) => transport.push({ settings: { updatedAt: settings.updatedAt, state: row } }));
  writeJson(marker, settings.updatedAt);
  if (result?.settings) applySettings(result.settings, userId, io);
  return 1;
}

async function pushAcademy(transport: SyncTransport) {
  const record = await db.academyState.get('academy');
  if (!record?.dirty) return 0;
  const [result] = await sendBatch([record], ([row]) => transport.push({ academy: { updatedAt: finite(row.updatedAt), state: withoutSyncFields(row) } }));
  await db.academyState.where('id').equals('academy').modify(current => { if (current.updatedAt === record.updatedAt) { current.dirty = 0; current.syncedAt = Date.now(); } });
  if (result?.academy) await applyAcademy([result.academy]);
  return 1;
}

async function pushProgress(transport: SyncTransport) {
  let pushed = 0;
  for (;;) {
    const rows = await db.bookProgress.where('dirty').equals(1).limit(PUSH_BATCH).toArray();
    if (!rows.length) return pushed;
    const results = await sendBatch(rows, batch => transport.push({ progress: batch.map(row => ({ key: row.bookId, updatedAt: finite(row.lastRead), state: withoutSyncFields(row) })) }));
    const sent = new Map(rows.map(row => [row.bookId, row.lastRead]));
    const now = Date.now();
    await db.bookProgress.where('bookId').anyOf([...sent.keys()]).modify(record => { if (record.lastRead === sent.get(record.bookId)) { record.dirty = 0; record.syncedAt = now; } });
    await applyProgress(results.flatMap(result => result.progress));
    pushed += rows.length;
    if (rows.length < PUSH_BATCH) return pushed;
  }
}

async function pushShelf(transport: SyncTransport) {
  let pushed = 0;
  for (;;) {
    const rows = await db.shelf.where('dirty').equals(1).limit(PUSH_BATCH).toArray();
    if (!rows.length) return pushed;
    const results = await sendBatch(rows, batch => transport.push({ shelf: batch.map(row => ({ key: row.key, updatedAt: finite(row.updatedAt), state: withoutSyncFields(row) })) }));
    const sent = new Map(rows.map(row => [row.key, row.updatedAt]));
    const now = Date.now();
    await db.shelf.where('key').anyOf([...sent.keys()]).modify(record => { if (record.updatedAt === sent.get(record.key)) { record.dirty = 0; record.syncedAt = now; } });
    await applyShelf(results.flatMap(result => result.shelf));
    pushed += rows.length;
    if (rows.length < PUSH_BATCH) return pushed;
  }
}

async function pushDocuments(transport: SyncTransport) {
  let pushed = 0;
  let skipped = 0;
  const ids = await db.importedDocuments.where('dirty').equals(1).primaryKeys();
  for (const id of ids) {
    const document = await db.importedDocuments.get(id);
    if (!document) continue;
    const row: DocumentRow = { id: document.id, title: document.title.slice(0, 300), author: (document.author ?? '').slice(0, 300), format: document.format, sections: document.sections, createdAt: finite(document.createdAt), updatedAt: finite(document.updatedAt) };
    if (!isUuid(document.id) || jsonBytes(row) > MAX_DOCUMENT_BYTES) skipped += 1;
    else if ((await sendBatch([row], batch => transport.push({ documents: batch }))).length) pushed += 1;
    else skipped += 1;
    await db.importedDocuments.where('id').equals(id).modify(current => { if (current.updatedAt === document.updatedAt) { current.dirty = 0; current.syncedAt = Date.now(); } });
  }
  return { pushed, skipped };
}

// ── Keyed records (highlights, favourites, manuscripts) ──

type KeyedRecord = Record<string, unknown> & { updatedAt: number; dirty?: 0 | 1; syncedAt?: number };
interface KeyedSpec { table: Table<KeyedRecord, string>; keyField: string; batch: number; maxBytes?: number }

const KEYED: Record<KeyedSyncEntity, KeyedSpec> = {
  highlights: { table: db.highlights as unknown as Table<KeyedRecord, string>, keyField: 'id', batch: PUSH_BATCH },
  favorites: { table: db.favorites as unknown as Table<KeyedRecord, string>, keyField: 'key', batch: PUSH_BATCH },
  manuscripts: { table: db.manuscripts as unknown as Table<KeyedRecord, string>, keyField: 'id', batch: MANUSCRIPT_BATCH, maxBytes: MAX_MANUSCRIPT_BYTES }
};

const isKeyed = (entity: string): entity is KeyedSyncEntity => (KEYED_ENTITIES as readonly string[]).includes(entity);

async function pushKeyed(transport: SyncTransport, entity: KeyedSyncEntity) {
  const { table, keyField, batch, maxBytes } = KEYED[entity];
  let pushed = 0;
  let skipped = 0;
  for (;;) {
    const rows = await table.where('dirty').equals(1).limit(batch).toArray();
    if (!rows.length) break;
    const out: KeyedStateRow[] = rows.map(row => ({ key: String(row[keyField]), updatedAt: finite(row.updatedAt), state: withoutSyncFields(row) }));
    // Too large to send: stays on this device (marked clean below, so it is not retried until it changes).
    const sendable = out.filter(row => !maxBytes || jsonBytes(row) <= maxBytes);
    skipped += out.length - sendable.length;
    const results = sendable.length ? await sendBatch(sendable, part => transport.push({ [entity]: part } as PushInput)) : [];
    const sent = new Map(out.map(row => [row.key, row.updatedAt]));
    const now = Date.now();
    await table.where(keyField).anyOf([...sent.keys()]).modify(record => { if (record.updatedAt === sent.get(String(record[keyField]))) { record.dirty = 0; record.syncedAt = now; } });
    await applyKeyed(entity, results.flatMap(result => result[entity] ?? []));
    pushed += sendable.length;
    if (rows.length < batch) break;
  }
  return { pushed, skipped };
}

async function applyKeyed(entity: KeyedSyncEntity, rows: KeyedStateRow[]) {
  const { table, keyField } = KEYED[entity];
  const unique = latestByKey(rows, row => row.key, row => row.updatedAt);
  if (!unique.length) return;
  const locals = await table.bulkGet(unique.map(row => row.key));
  const puts = keyedPuts<KeyedRecord>(unique, locals, keyField, Date.now());
  if (puts.length) await applyingRemote(() => table.bulkPut(puts));
}

type ImmutableRecord = { id?: number; clientId: string; dirty?: 0 | 1; syncedAt?: number };

/** Results, scores and reading sessions never change once saved, so they are simply sent once. */
async function pushImmutable<R extends ImmutableRecord>(table: Table<R, number>, send: (rows: R[]) => Promise<PushResult>) {
  let pushed = 0;
  for (;;) {
    const rows = await table.where('dirty').equals(1).limit(PUSH_BATCH).toArray();
    if (!rows.length) return pushed;
    // Records from before UUID client ids get one now, so they can be backed up on the next pass.
    const legacy = rows.filter(row => !isUuid(row.clientId) && row.id !== undefined);
    for (const row of legacy) await table.update(row.id!, { clientId: crypto.randomUUID() } as unknown as UpdateSpec<R>);
    const valid = rows.filter(row => isUuid(row.clientId));
    if (valid.length) await sendBatch(valid, send);
    await table.where('clientId').anyOf(valid.map(row => row.clientId)).modify({ dirty: 0, syncedAt: Date.now() } as unknown as UpdateSpec<R>);
    pushed += valid.length;
    if (rows.length < PUSH_BATCH) return pushed;
  }
}

const toResultRow = (record: TestResultRecord): ResultRow => ({
  clientId: record.clientId, mode: String(record.mode).slice(0, 40), subMode: String(record.subMode ?? '').slice(0, 300), title: record.title?.slice(0, 400),
  wpm: finite(record.wpm), rawWpm: finite(record.rawWpm), accuracy: finite(record.accuracy), consistency: finite(record.consistency),
  duration: Math.max(0, finite(record.duration)), timestamp: Math.max(0, finite(record.timestamp)), errors: finite(record.errors),
  errorKeys: Object.fromEntries(Object.entries(record.errorKeys ?? {}).filter(([, value]) => Number.isFinite(value))),
  totalChars: finite(record.totalChars), correctChars: finite(record.correctChars), incorrectChars: finite(record.incorrectChars), visibility: record.visibility
});

// ── Pull and merge ──

function applySettings(row: StateRow, userId: string, io: SettingsIO) {
  const local = io.get();
  if (row.updatedAt > local.updatedAt) {
    io.apply({ ...(row.state as unknown as UserSettings), updatedAt: row.updatedAt, zenMode: local.zenMode });
    writeJson(storageKey('settings', userId), row.updatedAt);
  }
}

async function applyAcademy(rows: StateRow[]) {
  const row = rows[rows.length - 1];
  if (!row) return;
  const local = await db.academyState.get('academy');
  if (!remoteWins(local && { updatedAt: local.updatedAt, dirty: local.dirty }, row.updatedAt)) return;
  await applyingRemote(() => db.academyState.put({ ...(row.state as unknown as AcademyStateRecord), id: 'academy', updatedAt: row.updatedAt, dirty: 0, syncedAt: Date.now() }));
}

async function applyProgress(rows: KeyedStateRow[]) {
  const unique = latestByKey(rows, row => row.key, row => row.updatedAt);
  if (!unique.length) return;
  const locals = await db.bookProgress.bulkGet(unique.map(row => row.key));
  const now = Date.now();
  const puts = unique
    .filter((row, index) => remoteWins(locals[index] && { updatedAt: locals[index]!.lastRead, dirty: locals[index]!.dirty }, row.updatedAt))
    .map(row => ({ ...(row.state as unknown as BookProgressRecord), bookId: row.key, lastRead: row.updatedAt, dirty: 0 as const, syncedAt: now }));
  if (puts.length) await applyingRemote(() => db.bookProgress.bulkPut(puts));
}

async function applyShelf(rows: KeyedStateRow[]) {
  const unique = latestByKey(rows, row => row.key, row => row.updatedAt);
  if (!unique.length) return;
  const locals = await db.shelf.bulkGet(unique.map(row => row.key));
  const now = Date.now();
  const puts = unique
    .filter((row, index) => remoteWins(locals[index] && { updatedAt: locals[index]!.updatedAt, dirty: locals[index]!.dirty }, row.updatedAt))
    .map(row => ({ ...(row.state as unknown as ShelfRecord), key: row.key, updatedAt: row.updatedAt, dirty: 0 as const, syncedAt: now }));
  if (puts.length) await applyingRemote(() => db.shelf.bulkPut(puts));
}

async function applyDocuments(rows: DocumentRow[]) {
  for (const row of rows) {
    const local = await db.importedDocuments.get(row.id);
    if (!remoteWins(local && { updatedAt: local.updatedAt, dirty: local.dirty }, row.updatedAt)) continue;
    const document: ImportedDocumentRecord = { ...row, dirty: 0, syncedAt: Date.now() };
    await applyingRemote(() => db.importedDocuments.put(document));
  }
}

async function applyResults(rows: ResultRow[]) {
  const unique = latestByKey(rows, row => row.clientId, row => row.timestamp);
  const existing = new Map((await db.testResults.where('clientId').anyOf(unique.map(row => row.clientId)).toArray()).map(record => [record.clientId, record]));
  const now = Date.now();
  const additions: TestResultRecord[] = unique.filter(row => !existing.has(row.clientId)).map(row => ({
    ...row, mode: row.mode as TypingMode, errors: finite(row.errors ?? row.incorrectChars), errorKeys: row.errorKeys ?? {}, dirty: 0, syncedAt: now
  }));
  await applyingRemote(async () => {
    if (additions.length) await db.testResults.bulkAdd(additions);
    // Speed results verified by the server become public; keep that flag in step.
    for (const row of unique) {
      const local = existing.get(row.clientId);
      if (local?.id !== undefined && row.visibility && local.visibility !== row.visibility) await db.testResults.update(local.id, { visibility: row.visibility, dirty: 0 });
    }
  });
}

async function applyScores(rows: ScoreRow[]) {
  const unique = latestByKey(rows, row => row.clientId, row => row.timestamp);
  const existing = new Set((await db.arcadeScores.where('clientId').anyOf(unique.map(row => row.clientId)).toArray()).map(record => record.clientId));
  const now = Date.now();
  const additions = unique.filter(row => !existing.has(row.clientId)).map(row => ({ ...row, game: row.game as 'alphabet-sprint' | 'word-rain' | 'ghost-racer', dirty: 0 as const, syncedAt: now }));
  if (additions.length) await applyingRemote(() => db.arcadeScores.bulkAdd(additions));
}

async function applySessions(rows: SessionRow[]) {
  const unique = latestByKey(rows, row => row.clientId, row => row.startedAt);
  const existing = new Set((await db.readingSessions.where('clientId').anyOf(unique.map(row => row.clientId)).toArray()).map(record => record.clientId));
  const now = Date.now();
  const additions = unique.filter(row => !existing.has(row.clientId)).map(row => ({ ...row, dirty: 0 as const, syncedAt: now }));
  if (additions.length) await applyingRemote(() => db.readingSessions.bulkAdd(additions));
}

async function applyTombstones(rows: TombstoneRow[]) {
  await applyingRemote(async () => {
    for (const tombstone of rows) {
      const all = tombstone.key === '*';
      if (isKeyed(tombstone.entity)) {
        const { table, keyField } = KEYED[tombstone.entity];
        await table.filter(record => tombstoneCovers(tombstone, { key: String(record[keyField]), updatedAt: record.updatedAt })).delete();
        continue;
      }
      switch (tombstone.entity) {
        case 'results':
          if (all) await db.testResults.where('timestamp').belowOrEqual(tombstone.deletedAt).delete();
          else await db.testResults.where('clientId').equals(tombstone.key).delete();
          break;
        case 'scores':
          if (all) await db.arcadeScores.where('timestamp').belowOrEqual(tombstone.deletedAt).delete();
          else await db.arcadeScores.where('clientId').equals(tombstone.key).delete();
          break;
        case 'sessions':
          if (all) await db.readingSessions.where('startedAt').belowOrEqual(tombstone.deletedAt).delete();
          else await db.readingSessions.where('clientId').equals(tombstone.key).delete();
          break;
        case 'progress':
          await db.bookProgress.filter(record => tombstoneCovers(tombstone, { key: record.bookId, updatedAt: record.lastRead })).delete();
          break;
        case 'shelf':
          await db.shelf.filter(record => tombstoneCovers(tombstone, { key: record.key, updatedAt: record.updatedAt })).delete();
          break;
        case 'documents':
          await db.importedDocuments.filter(record => tombstoneCovers(tombstone, { key: record.id, updatedAt: record.updatedAt })).delete();
          break;
      }
    }
  });
}

async function applyPulled(entity: SyncEntity, rows: unknown[], userId: string, io: SettingsIO) {
  if (isKeyed(entity)) return applyKeyed(entity, rows as KeyedStateRow[]);
  switch (entity) {
    case 'tombstones': return applyTombstones(rows as TombstoneRow[]);
    case 'settings': { const row = (rows as StateRow[])[rows.length - 1]; if (row) applySettings(row, userId, io); return; }
    case 'academy': return applyAcademy(rows as StateRow[]);
    case 'progress': return applyProgress(rows as KeyedStateRow[]);
    case 'shelf': return applyShelf(rows as KeyedStateRow[]);
    case 'documents': return applyDocuments(rows as DocumentRow[]);
    case 'results': return applyResults(rows as ResultRow[]);
    case 'scores': return applyScores(rows as ScoreRow[]);
    case 'sessions': return applySessions(rows as SessionRow[]);
  }
}

async function pullAll(transport: SyncTransport, userId: string, io: SettingsIO) {
  const cursorKey = storageKey('cursors', userId);
  const cursors = readJson<Partial<Record<SyncEntity, Cursor>>>(cursorKey, {});
  let pulled = 0;
  for (const entity of SYNC_ENTITIES) {
    for (;;) {
      const page = await transport.pull(entity, cursors[entity] ?? null);
      if (page.rows.length) await applyPulled(entity, page.rows, userId, io);
      pulled += page.rows.length;
      if (page.cursor) { cursors[entity] = page.cursor; writeJson(cursorKey, cursors); }
      if (!page.more) break;
    }
  }
  return pulled;
}

/** Everything on this device joins the account now signed in (used when a different account signs in here). */
async function markAllDirty() {
  await db.testResults.toCollection().modify({ dirty: 1 });
  await db.arcadeScores.toCollection().modify({ dirty: 1 });
  await db.readingSessions.toCollection().modify({ dirty: 1 });
  await db.bookProgress.toCollection().modify({ dirty: 1 });
  await db.shelf.toCollection().modify({ dirty: 1 });
  await db.importedDocuments.toCollection().modify({ dirty: 1 });
  await db.academyState.toCollection().modify({ dirty: 1 });
  for (const entity of KEYED_ENTITIES) await KEYED[entity].table.toCollection().modify({ dirty: 1 });
}

/** One full pass: send local changes, then fetch and merge everything newer from the account. */
export async function runSync(transport: SyncTransport, userId: string, io: SettingsIO): Promise<SyncSummary> {
  const previousUser = readJson<string | null>(LAST_USER_KEY, null);
  if (previousUser && previousUser !== userId) await markAllDirty();
  writeJson(LAST_USER_KEY, userId);

  let pushed = await pushTombstones(transport);
  pushed += await pushSettings(transport, userId, io);
  pushed += await pushAcademy(transport);
  pushed += await pushProgress(transport);
  pushed += await pushShelf(transport);
  let skippedManuscripts = 0;
  for (const entity of KEYED_ENTITIES) {
    const keyed = await pushKeyed(transport, entity);
    pushed += keyed.pushed;
    if (entity === 'manuscripts') skippedManuscripts = keyed.skipped;
  }
  const documents = await pushDocuments(transport);
  pushed += documents.pushed;
  pushed += await pushImmutable(db.testResults, rows => transport.push({ results: rows.map(toResultRow) }));
  pushed += await pushImmutable(db.arcadeScores, rows => transport.push({ scores: rows.map(row => ({ clientId: row.clientId, game: row.game, score: finite(row.score), wpm: finite(row.wpm), accuracy: finite(row.accuracy), timeMs: Math.max(0, finite(row.timeMs)), timestamp: Math.max(0, finite(row.timestamp)), configuration: row.configuration, visibility: row.visibility })) }));
  pushed += await pushImmutable(db.readingSessions, rows => transport.push({ sessions: rows.map(row => ({ clientId: row.clientId, workKey: row.workKey, kind: row.kind, title: row.title.slice(0, 400), author: row.author.slice(0, 300), mode: row.mode, startedAt: Math.max(0, finite(row.startedAt)), durationMs: Math.round(Math.min(86_400_000, Math.max(0, finite(row.durationMs)))), words: Math.round(Math.max(0, finite(row.words))), pages: Math.round(Math.max(0, finite(row.pages))) })) }));

  const pulled = await pullAll(transport, userId, io);
  return { pushed, pulled, skippedDocuments: documents.skipped, skippedManuscripts };
}

/** Removes the account's data from this device (sign out → "Remove from this device"). Settings stay. */
export async function clearLocalAccountData() {
  await applyingRemote(async () => {
    await Promise.all([
      db.testResults.clear(), db.arcadeScores.clear(), db.readingSessions.clear(), db.bookProgress.clear(),
      db.shelf.clear(), db.importedDocuments.clear(), db.academyState.clear(), db.pendingDeletes.clear(),
      db.highlights.clear(), db.favorites.clear(), db.manuscripts.clear(), db.documentAssets.clear(), db.documentFiles.clear()
    ]);
  });
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('keyhaven_backup_')) localStorage.removeItem(key);
  } catch { /* storage blocked */ }
}
