// Pure merge rules for Backup & sync, kept free of IndexedDB and fetch so they can be unit tested.

export function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}

/**
 * Whether a version from the server should replace the local record (last writer wins).
 * A local record with unsynced changes is kept unless the server's copy is strictly newer; a clean local
 * record simply follows the server.
 */
export function remoteWins(local: { updatedAt: number; dirty?: 0 | 1 } | undefined, remoteUpdatedAt: number) {
  if (!local) return true;
  if (local.dirty) return remoteUpdatedAt > local.updatedAt;
  return remoteUpdatedAt !== local.updatedAt;
}

/** A deletion removes a record (or, for key '*', every record) that was last changed at or before it. */
export function tombstoneCovers(tombstone: { key: string; deletedAt: number }, record: { key: string; updatedAt: number }) {
  return (tombstone.key === '*' || tombstone.key === record.key) && record.updatedAt <= tombstone.deletedAt;
}

/** One row per key, keeping the newest; a batch must not upsert the same row twice. */
export function latestByKey<T>(rows: T[], keyOf: (row: T) => string, timeOf: (row: T) => number): T[] {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const key = keyOf(row);
    const current = latest.get(key);
    if (!current || timeOf(row) >= timeOf(current)) latest.set(key, row);
  }
  return [...latest.values()];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

export const jsonBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;

/** Numbers from old records can be NaN or missing; the server only accepts finite values. */
export const finite = (value: unknown, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

/**
 * The local records to write for pulled keyed rows (`locals` lines up with `rows`): each row whose server copy wins
 * becomes the device's record again, clean, under its key field.
 */
export function keyedPuts<R>(
  rows: Array<{ key: string; updatedAt: number; state: Record<string, unknown> }>,
  locals: Array<{ updatedAt: number; dirty?: 0 | 1 } | undefined>,
  keyField: string,
  now: number
): R[] {
  return rows
    .filter((row, index) => remoteWins(locals[index] && { updatedAt: locals[index]!.updatedAt, dirty: locals[index]!.dirty }, row.updatedAt))
    .map(row => ({ ...row.state, [keyField]: row.key, updatedAt: row.updatedAt, dirty: 0, syncedAt: now }) as R);
}
