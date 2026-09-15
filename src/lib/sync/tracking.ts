// Change tracking for Backup & sync. Dexie hooks flag every local create and update as `dirty`, and queue a
// tombstone for every delete, so the engine only ever sends what changed. Writes made while applying data
// from the server run inside `applyingRemote` and are left clean.
import type { KeyHavenDatabase } from '@/lib/db';
import type { SyncTombstoneEntity } from '@/types';

export const SYNC_REQUEST_EVENT = 'keyhaven:sync';

let remoteDepth = 0;

export async function applyingRemote<T>(work: () => Promise<T>): Promise<T> {
  remoteDepth += 1;
  try { return await work(); } finally { remoteDepth -= 1; }
}

function requestSync() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SYNC_REQUEST_EVENT));
}

const clientKey = (_primaryKey: unknown, record: Record<string, unknown>) => (typeof record.clientId === 'string' ? record.clientId : null);
const primaryKey = (key: unknown) => (key === undefined || key === null ? null : String(key));

const TRACKED: Array<{ table: string; entity: SyncTombstoneEntity | null; keyOf: (key: unknown, record: Record<string, unknown>) => string | null }> = [
  { table: 'testResults', entity: 'results', keyOf: clientKey },
  { table: 'arcadeScores', entity: 'scores', keyOf: clientKey },
  { table: 'readingSessions', entity: 'sessions', keyOf: clientKey },
  { table: 'bookProgress', entity: 'progress', keyOf: primaryKey },
  { table: 'shelf', entity: 'shelf', keyOf: primaryKey },
  { table: 'importedDocuments', entity: 'documents', keyOf: primaryKey },
  { table: 'academyState', entity: null, keyOf: () => null }
];

export function installSyncTracking(database: KeyHavenDatabase) {
  for (const { table, entity, keyOf } of TRACKED) {
    const target = database.table(table);
    target.hook('creating', (_key, record) => {
      const data = record as { dirty?: 0 | 1 };
      if (remoteDepth) { data.dirty = 0; return; }
      if (data.dirty === undefined) data.dirty = 1;
      requestSync();
    });
    target.hook('updating', modifications => {
      // The engine marks records clean by writing `dirty` itself; leave those writes alone.
      if ('dirty' in (modifications as object)) return undefined;
      if (remoteDepth) return { dirty: 0 };
      requestSync();
      return { dirty: 1 };
    });
    if (!entity) continue;
    target.hook('deleting', (key, record, transaction) => {
      if (remoteDepth) return;
      const tombstoneKey = keyOf(key, record as Record<string, unknown>);
      if (!tombstoneKey) return;
      const deletedAt = Date.now();
      transaction.on('complete', () => {
        void database.pendingDeletes.put({ id: `${entity}:${tombstoneKey}`, entity, key: tombstoneKey, deletedAt }).then(requestSync).catch(() => {});
      });
    });
  }
}

/** `table.clear()` skips hooks; record the deletion explicitly (key '*' covers everything up to now). */
export async function queueTombstone(database: KeyHavenDatabase, entity: SyncTombstoneEntity, key: string) {
  await database.pendingDeletes.put({ id: `${entity}:${key}`, entity, key, deletedAt: Date.now() });
  requestSync();
}
