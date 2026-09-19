// A single-file backup of everything on this device, and a restore that only ever adds or updates with newer copies.
import type { Table } from 'dexie';
import { db } from '@/lib/db';
import type { AcademyStateRecord, ArcadeScoreRecord, BookProgressRecord, FavoriteRecord, HighlightRecord, ImportedDocumentRecord, ManuscriptRecord, ReadingSessionRecord, ShelfRecord, TestResultRecord, UserSettings } from '@/types';

interface BackupFile {
  app: 'keyhaven';
  version: 1;
  exportedAt: number;
  settings: UserSettings;
  testResults: TestResultRecord[];
  arcadeScores: ArcadeScoreRecord[];
  readingSessions: ReadingSessionRecord[];
  bookProgress: BookProgressRecord[];
  shelf: ShelfRecord[];
  importedDocuments: ImportedDocumentRecord[];
  academyState: AcademyStateRecord | null;
  /** Added later; older files simply don't have them. */
  highlights?: HighlightRecord[];
  favorites?: FavoriteRecord[];
  manuscripts?: ManuscriptRecord[];
}

export async function exportBackupBlob(settings: UserSettings) {
  const [testResults, arcadeScores, readingSessions, bookProgress, shelf, importedDocuments, academyState, highlights, favorites, manuscripts] = await Promise.all([
    db.testResults.toArray(), db.arcadeScores.toArray(), db.readingSessions.toArray(), db.bookProgress.toArray(),
    db.shelf.toArray(), db.importedDocuments.toArray(), db.academyState.get('academy'),
    db.highlights.toArray(), db.favorites.toArray(), db.manuscripts.toArray()
  ]);
  const file: BackupFile = { app: 'keyhaven', version: 1, exportedAt: Date.now(), settings, testResults, arcadeScores, readingSessions, bookProgress, shelf, importedDocuments, academyState: academyState ?? null, highlights, favorites, manuscripts };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const list = <T>(value: unknown): T[] => (Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as T[] : []);

/** Fresh copies without local bookkeeping, so change tracking marks them for Backup & sync. */
function withoutLocalFields<T extends object>(record: T): T {
  const copy = { ...record } as T & { id?: unknown; dirty?: unknown; syncedAt?: unknown };
  delete copy.id;
  delete copy.dirty;
  delete copy.syncedAt;
  return copy;
}

async function addMissing<R extends { clientId: string }>(table: Table<R, number>, rows: R[]) {
  const unique = [...new Map(rows.filter(row => typeof row.clientId === 'string').map(row => [row.clientId, row])).values()];
  if (!unique.length) return 0;
  const existing = new Set((await table.where('clientId').anyOf(unique.map(row => row.clientId)).toArray()).map(row => row.clientId));
  const fresh = unique.filter(row => !existing.has(row.clientId)).map(withoutLocalFields);
  if (fresh.length) await table.bulkAdd(fresh);
  return fresh.length;
}

/** Keyed records newer in the file than here (or missing here), written with their key intact. */
async function putNewer<R extends { updatedAt: number }>(table: Table<R, string>, rows: R[], keyField: keyof R & string) {
  const valid = rows.filter(row => typeof row[keyField] === 'string' && typeof row.updatedAt === 'number');
  if (!valid.length) return 0;
  const local = await table.bulkGet(valid.map(row => row[keyField] as unknown as string));
  const newer = valid.filter((row, index) => !local[index] || row.updatedAt > local[index]!.updatedAt).map(row => {
    const copy = { ...row } as R & { dirty?: unknown; syncedAt?: unknown };
    delete copy.dirty;
    delete copy.syncedAt;
    return copy as R;
  });
  if (newer.length) await table.bulkPut(newer);
  return newer.length;
}

/** Adds records from a backup file that aren't here yet, and keyed records where the file's copy is newer. */
export async function importBackupFile(file: File): Promise<{ added: number; settings: UserSettings | null }> {
  let data: Partial<BackupFile>;
  try {
    data = JSON.parse(await file.text()) as Partial<BackupFile>;
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }
  if (data?.app !== 'keyhaven' || typeof data.version !== 'number') throw new Error('That file isn’t a KeyHaven backup.');

  let added = 0;
  added += await addMissing(db.testResults, list<TestResultRecord>(data.testResults));
  added += await addMissing(db.arcadeScores, list<ArcadeScoreRecord>(data.arcadeScores));
  added += await addMissing(db.readingSessions, list<ReadingSessionRecord>(data.readingSessions));

  const progress = list<BookProgressRecord>(data.bookProgress).filter(record => typeof record.bookId === 'string');
  const localProgress = await db.bookProgress.bulkGet(progress.map(record => record.bookId));
  const newerProgress = progress.filter((record, index) => !localProgress[index] || record.lastRead > localProgress[index]!.lastRead).map(withoutLocalFields);
  if (newerProgress.length) await db.bookProgress.bulkPut(newerProgress);
  added += newerProgress.length;

  const shelf = list<ShelfRecord>(data.shelf).filter(record => typeof record.key === 'string');
  const localShelf = await db.shelf.bulkGet(shelf.map(record => record.key));
  const newerShelf = shelf.filter((record, index) => !localShelf[index] || record.updatedAt > localShelf[index]!.updatedAt).map(withoutLocalFields);
  if (newerShelf.length) await db.shelf.bulkPut(newerShelf);
  added += newerShelf.length;

  const documents = list<ImportedDocumentRecord>(data.importedDocuments).filter(record => typeof record.id === 'string' && Array.isArray(record.sections));
  // Imported books are keyed by `id`, so they keep it (stripping it, as for results, would lose the key).
  added += await putNewer(db.importedDocuments, documents, 'id');

  added += await putNewer(db.highlights, list<HighlightRecord>(data.highlights), 'id');
  added += await putNewer(db.favorites, list<FavoriteRecord>(data.favorites), 'key');
  added += await putNewer(db.manuscripts, list<ManuscriptRecord>(data.manuscripts), 'id');

  const academy = data.academyState;
  if (academy && typeof academy === 'object' && typeof academy.updatedAt === 'number') {
    const local = await db.academyState.get('academy');
    if (!local || academy.updatedAt > local.updatedAt) { await db.academyState.put({ ...withoutLocalFields(academy), id: 'academy' }); added += 1; }
  }

  const settings = data.settings && typeof data.settings === 'object' && typeof data.settings.updatedAt === 'number' ? data.settings : null;
  return { added, settings };
}
