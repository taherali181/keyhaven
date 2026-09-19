// The Backup & sync wire format, shared by the browser (src/lib/sync/engine.ts) and the API routes.
// Pushes send batches of changed records; pulls page through each entity by the server's synced_at cursor.
import { z } from 'zod';
import type { KeyedSyncEntity, SyncTombstoneEntity } from '@/types';

/** Pull order: deletions first, then small state, then the larger collections. */
export const SYNC_ENTITIES = ['tombstones', 'settings', 'academy', 'progress', 'shelf', 'favorites', 'highlights', 'manuscripts', 'documents', 'results', 'scores', 'sessions'] as const;
export type SyncEntity = (typeof SYNC_ENTITIES)[number];
/** Entities stored on the server as generic keyed items (the `user_items` table). */
export const KEYED_ENTITIES = ['highlights', 'favorites', 'manuscripts'] as const satisfies readonly KeyedSyncEntity[];
export const TOMBSTONE_ENTITIES = ['results', 'scores', 'sessions', 'progress', 'shelf', 'documents', ...KEYED_ENTITIES] as const satisfies readonly SyncTombstoneEntity[];

export const PUSH_BATCH = 200;
export const PULL_LIMIT = 500;
export const DOCUMENT_PULL_LIMIT = 4;
/** Imported books larger than this stay on the device (keeps each request well under hosting body limits). */
export const MAX_DOCUMENT_BYTES = 3_500_000;
/** Manuscripts travel a few at a time and each stays under this size, so a request never nears the body limit. */
export const MAX_MANUSCRIPT_BYTES = 1_000_000;
export const MANUSCRIPT_BATCH = 3;
/** Rows per pull page for each keyed entity. */
export const KEYED_PULL_LIMIT: Record<KeyedSyncEntity, number> = { highlights: PULL_LIMIT, favorites: PULL_LIMIT, manuscripts: 4 };

const time = z.number().finite().nonnegative();
const count = z.number().finite();

export const resultRow = z.object({
  clientId: z.uuid(), mode: z.string().max(40), subMode: z.string().max(300), title: z.string().max(400).optional(),
  wpm: count, rawWpm: count, accuracy: count, consistency: count, duration: z.number().finite().nonnegative(), timestamp: time,
  errors: count.optional(), errorKeys: z.record(z.string(), z.number().finite()).default({}),
  totalChars: count.optional(), correctChars: count.optional(), incorrectChars: count.optional(),
  visibility: z.enum(['private', 'public']).optional()
});

export const scoreRow = z.object({
  clientId: z.uuid(), game: z.string().max(40), score: count, wpm: count, accuracy: count, timeMs: z.number().finite().nonnegative(), timestamp: time,
  configuration: z.record(z.string(), z.unknown()).optional(), visibility: z.enum(['private', 'public']).optional()
});

export const sessionRow = z.object({
  clientId: z.uuid(), workKey: z.string().max(300), kind: z.enum(['story', 'book', 'import', 'manuscript']), title: z.string().max(400), author: z.string().max(300),
  mode: z.enum(['read', 'type']), startedAt: time, durationMs: z.number().int().nonnegative().max(86_400_000),
  words: z.number().int().nonnegative(), pages: z.number().int().nonnegative()
});

/** Records merged last-writer-wins by key: reading progress, shelf entries, highlights, favourites and manuscripts. */
export const keyedStateRow = z.object({ key: z.string().min(1).max(300), updatedAt: time, state: z.record(z.string(), z.unknown()) });

export const documentRow = z.object({
  id: z.uuid(), title: z.string().max(300), author: z.string().max(300), format: z.enum(['epub', 'pdf']),
  sections: z.array(z.object({ id: z.string().max(200), title: z.string().max(300), text: z.string().max(1_500_000) })).max(2000),
  createdAt: time, updatedAt: time
});

/** Single documents per account: settings and Academy state. */
export const stateRow = z.object({ updatedAt: time, state: z.record(z.string(), z.unknown()) });

export const tombstoneRow = z.object({ entity: z.enum(TOMBSTONE_ENTITIES), key: z.string().min(1).max(300), deletedAt: time });

export const pushInput = z.object({
  tombstones: z.array(tombstoneRow).max(PUSH_BATCH).default([]),
  results: z.array(resultRow).max(PUSH_BATCH).default([]),
  scores: z.array(scoreRow).max(PUSH_BATCH).default([]),
  sessions: z.array(sessionRow).max(PUSH_BATCH).default([]),
  progress: z.array(keyedStateRow).max(PUSH_BATCH).default([]),
  shelf: z.array(keyedStateRow).max(PUSH_BATCH).default([]),
  highlights: z.array(keyedStateRow).max(PUSH_BATCH).default([]),
  favorites: z.array(keyedStateRow).max(PUSH_BATCH).default([]),
  manuscripts: z.array(keyedStateRow).max(MANUSCRIPT_BATCH).default([]),
  documents: z.array(documentRow).max(1).default([]),
  academy: stateRow.optional(),
  settings: stateRow.optional()
});

export type PushInput = z.input<typeof pushInput>;
export type PushInputParsed = z.infer<typeof pushInput>;
export type ResultRow = z.infer<typeof resultRow>;
export type ScoreRow = z.infer<typeof scoreRow>;
export type SessionRow = z.infer<typeof sessionRow>;
export type KeyedStateRow = z.infer<typeof keyedStateRow>;
export type DocumentRow = z.infer<typeof documentRow>;
export type StateRow = z.infer<typeof stateRow>;
export type TombstoneRow = z.infer<typeof tombstoneRow>;

/** Position in an entity's pull stream: the server's synced_at (ms) and the row key, for ties. */
export interface Cursor { t: number; k: string }

export interface PullPage<Row = unknown> { rows: Row[]; cursor: Cursor | null; more: boolean }

/** The server's copy of every keyed record in a push, so a device learns straight away when a newer edit won. */
export type PushResult = { progress: KeyedStateRow[]; shelf: KeyedStateRow[]; academy: StateRow | null; settings: StateRow | null } & Record<KeyedSyncEntity, KeyedStateRow[]>;
