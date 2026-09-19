import Dexie, { type Table } from 'dexie';
import { DEFAULT_READER_BAR_STYLE, DEFAULT_READER_STATS, sanitizeReaderStats } from '@/lib/reader-stats';
import { sanitizeSectionPrefs } from '@/lib/section-settings';
import { DEFAULT_TYPOGRAPHY, normalizeTypography } from '@/lib/typography';
import { TestResultRecord, BookProgressRecord, ArcadeScoreRecord, UserSettings, ThemeId, ReaderToneId, ImportedDocumentRecord, AcademyStateRecord, ShelfRecord, Work, ReadingSessionRecord, PendingDeleteRecord, HighlightRecord, FavoriteRecord, ManuscriptRecord, DocumentAssetRecord, DocumentFileRecord } from '@/types';
import { installSyncTracking } from '@/lib/sync/tracking';

export class KeyHavenDatabase extends Dexie {
  testResults!: Table<TestResultRecord, number>;
  bookProgress!: Table<BookProgressRecord, string>;
  arcadeScores!: Table<ArcadeScoreRecord, number>;
  importedDocuments!: Table<ImportedDocumentRecord, string>;
  academyState!: Table<AcademyStateRecord, string>;
  works!: Table<Work, string>;
  shelf!: Table<ShelfRecord, string>;
  readingSessions!: Table<ReadingSessionRecord, number>;
  pendingDeletes!: Table<PendingDeleteRecord, string>;
  highlights!: Table<HighlightRecord, string>;
  favorites!: Table<FavoriteRecord, string>;
  manuscripts!: Table<ManuscriptRecord, string>;
  documentAssets!: Table<DocumentAssetRecord, string>;
  documentFiles!: Table<DocumentFileRecord, string>;

  constructor() {
    super('KeyHavenDB');
    this.version(1).stores({
      testResults: '++id, mode, subMode, timestamp, wpm, accuracy',
      bookProgress: 'bookId, lastRead',
      arcadeScores: '++id, game, score, wpm, timestamp'
    });
    this.version(2).stores({
      testResults: '++id, &clientId, mode, subMode, timestamp, wpm, accuracy, syncedAt',
      bookProgress: 'bookId, chapterIndex, lastRead, syncedAt',
      arcadeScores: '++id, &clientId, game, score, wpm, timestamp, syncedAt'
    }).upgrade(async transaction => {
      await transaction.table('testResults').toCollection().modify(record => {
        record.clientId ||= crypto.randomUUID();
      });
      await transaction.table('arcadeScores').toCollection().modify(record => {
        record.clientId ||= crypto.randomUUID();
      });
    });
    this.version(3).stores({
      testResults: '++id, &clientId, mode, subMode, timestamp, wpm, accuracy, syncedAt',
      bookProgress: 'bookId, chapterIndex, lastRead, syncedAt',
      arcadeScores: '++id, &clientId, game, score, wpm, timestamp, syncedAt',
      importedDocuments: 'id, title, format, updatedAt, syncedAt',
      academyState: 'id, updatedAt, syncedAt'
    });
    // v4: one reader for stories, Gutenberg books and imports. Progress is keyed by work key, parsed books
    // are cached for offline reading, and the shelf holds "want to read" and "finished" marks.
    this.version(4).stores({
      testResults: '++id, &clientId, mode, subMode, timestamp, wpm, accuracy, syncedAt',
      bookProgress: 'bookId, kind, chapterIndex, lastRead, syncedAt',
      arcadeScores: '++id, &clientId, game, score, wpm, timestamp, syncedAt',
      importedDocuments: 'id, title, format, updatedAt, syncedAt',
      academyState: 'id, updatedAt, syncedAt',
      works: 'key, kind, updatedAt',
      shelf: 'key, kind, want, finishedAt, updatedAt'
    }).upgrade(async transaction => {
      const imports = new Set((await transaction.table('importedDocuments').toCollection().primaryKeys()).map(String));
      const progress = transaction.table('bookProgress');
      const records = await progress.toArray() as BookProgressRecord[];
      for (const record of records) {
        if (record.bookId.includes(':')) continue;
        await progress.delete(record.bookId);
        // Imported documents keep their progress; the old built-in excerpt books no longer exist.
        if (imports.has(record.bookId)) await progress.put({ ...record, bookId: `import:${record.bookId}`, kind: 'import' });
      }
      // Story reading positions used to live in localStorage.
      try {
        const positions = JSON.parse(localStorage.getItem('keyhaven_story_reading_v1') || '{}') as Record<string, number>;
        for (const [id, fraction] of Object.entries(positions)) {
          if (typeof fraction !== 'number') continue;
          await progress.put({ bookId: `story:${id}`, kind: 'story', chapterIndex: 0, charOffset: 0, chunkIndex: 0, pageFraction: fraction, percent: Math.round(fraction * 100), totalWordsTyped: 0, lastRead: Date.now() });
        }
      } catch { /* no stored positions */ }
    });
    // v5: Backup & sync. Records carry a `dirty` flag, reading sessions are kept for stats, and deletions wait in
    // pendingDeletes until they are backed up. Everything already here counts as not yet backed up.
    this.version(5).stores({
      testResults: '++id, &clientId, mode, subMode, timestamp, wpm, accuracy, syncedAt, dirty',
      bookProgress: 'bookId, kind, chapterIndex, lastRead, syncedAt, dirty',
      arcadeScores: '++id, &clientId, game, score, wpm, timestamp, syncedAt, dirty',
      importedDocuments: 'id, title, format, updatedAt, syncedAt, dirty',
      academyState: 'id, updatedAt, syncedAt, dirty',
      works: 'key, kind, updatedAt',
      shelf: 'key, kind, want, finishedAt, updatedAt, dirty',
      readingSessions: '++id, &clientId, workKey, kind, startedAt, dirty',
      pendingDeletes: 'id, entity'
    }).upgrade(async transaction => {
      for (const name of ['testResults', 'arcadeScores', 'bookProgress', 'shelf', 'importedDocuments', 'academyState']) {
        await transaction.table(name).toCollection().modify(record => { record.dirty = 1; });
      }
    });
    // v6: highlights and notes, saved quotes and the reader's own writing (all backed up), plus EPUB images and
    // original PDF files, which stay on this device.
    this.version(6).stores({
      testResults: '++id, &clientId, mode, subMode, timestamp, wpm, accuracy, syncedAt, dirty',
      bookProgress: 'bookId, kind, chapterIndex, lastRead, syncedAt, dirty',
      arcadeScores: '++id, &clientId, game, score, wpm, timestamp, syncedAt, dirty',
      importedDocuments: 'id, title, format, updatedAt, syncedAt, dirty',
      academyState: 'id, updatedAt, syncedAt, dirty',
      works: 'key, kind, updatedAt',
      shelf: 'key, kind, want, finishedAt, updatedAt, dirty',
      readingSessions: '++id, &clientId, workKey, kind, startedAt, dirty',
      pendingDeletes: 'id, entity',
      highlights: 'id, workKey, updatedAt, dirty',
      favorites: 'key, kind, updatedAt, dirty',
      manuscripts: 'id, updatedAt, dirty',
      documentAssets: 'id, documentId',
      documentFiles: 'id'
    });
    installSyncTracking(this);
  }
}

export const db = new KeyHavenDatabase();

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'night',
  font: DEFAULT_TYPOGRAPHY.font,
  caretStyle: 'smooth',
  fontSize: DEFAULT_TYPOGRAPHY.fontSize,
  switchSound: 'holy-panda',
  soundVolume: 0.5,
  ambientSound: 'none',
  ambientVolume: 0.4,
  showLiveWpm: true,
  showLiveAccuracy: true,
  showKeyboard: false,
  zenMode: false,
  smoothCaret: true,
  strictMode: false,
  leaderboardEnabled: true,
  readerLineHeight: DEFAULT_TYPOGRAPHY.readerLineHeight,
  readerWidth: DEFAULT_TYPOGRAPHY.readerWidth,
  readerWordSpacing: DEFAULT_TYPOGRAPHY.readerWordSpacing,
  readerParagraphSpacing: DEFAULT_TYPOGRAPHY.readerParagraphSpacing,
  readerAlign: DEFAULT_TYPOGRAPHY.readerAlign,
  readerHyphens: DEFAULT_TYPOGRAPHY.readerHyphens,
  customTones: [],
  storyMode: 'read',
  muted: false,
  ambientMotion: false,
  readerBarPinned: true,
  readerStats: DEFAULT_READER_STATS,
  readerBarStyle: DEFAULT_READER_BAR_STYLE,
  sectionPrefs: {},
  dailyTypingGoalMinutes: 15,
  dailyReadingGoalMinutes: 20,
  academyGuide: 'on',
  readerBackground: 'misty-mountains',
  readerOverlay: 65,
  readerBlur: 2,
  readerFontWeight: DEFAULT_TYPOGRAPHY.readerFontWeight,
  readerLetterSpacing: DEFAULT_TYPOGRAPHY.readerLetterSpacing,
  updatedAt: 0
};

const SETTINGS_KEY = 'keyhaven_settings_v1';

const BUILT_IN_THEMES = new Set<ReaderToneId>(['paper', 'sepia', 'night', 'bright', 'pitch', 'mist', 'sage', 'slate', 'ocean', 'rose', 'espresso', 'lavender']);

type StoredSettings = Partial<UserSettings> & {
  /** Removed in the unified theme model. "system" had no colors of its own. */
  readerPaper?: 'system' | ThemeId;
  /** Older releases used these two values for chrome independently of page tone. */
  theme?: ThemeId | 'reading-room' | 'daylight' | 'zen-sand' | 'paper-ink';
};

function validTheme(value: unknown, customTones: UserSettings['customTones']): value is ThemeId {
  if (typeof value !== 'string') return false;
  if (BUILT_IN_THEMES.has(value as ReaderToneId)) return true;
  return value.startsWith('custom:') && customTones.some(tone => `custom:${tone.id}` === value);
}

/** Normalizes local, imported and synced settings through the same backwards-compatible migration. */
export function normalizeSettings(value: unknown): UserSettings {
  const parsed = value && typeof value === 'object' ? value as StoredSettings : {};
  const customTones = Array.isArray(parsed.customTones) ? parsed.customTones : [];
  // An explicit legacy page tone is the user's visible choice and wins. Match theme migrates to Night.
  const theme = parsed.readerPaper !== 'system' && validTheme(parsed.readerPaper, customTones)
    ? parsed.readerPaper
    : validTheme(parsed.theme, customTones) ? parsed.theme : 'night';
  const stored = { ...parsed };
  delete stored.readerPaper;
  delete stored.theme;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    theme,
    customTones,
    readerStats: sanitizeReaderStats(parsed.readerStats),
    readerBarStyle: { ...DEFAULT_READER_BAR_STYLE, ...(parsed.readerBarStyle ?? {}) },
    ...normalizeTypography(parsed),
    sectionPrefs: sanitizeSectionPrefs(parsed.sectionPrefs)
  };
}

export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function createClientId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}
