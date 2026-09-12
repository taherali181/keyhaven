import Dexie, { type Table } from 'dexie';
import { TestResultRecord, BookProgressRecord, ArcadeScoreRecord, UserSettings, ThemeId, ImportedDocumentRecord, AcademyStateRecord } from '@/types';

export class KeyHavenDatabase extends Dexie {
  testResults!: Table<TestResultRecord, number>;
  bookProgress!: Table<BookProgressRecord, string>;
  arcadeScores!: Table<ArcadeScoreRecord, number>;
  importedDocuments!: Table<ImportedDocumentRecord, string>;
  academyState!: Table<AcademyStateRecord, string>;

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
  }
}

export const db = new KeyHavenDatabase();

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'reading-room',
  font: 'serif',
  caretStyle: 'smooth',
  fontSize: 'base',
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
  readerLineHeight: 1.8,
  readerWidth: 'balanced',
  readerPaper: 'system',
  readerBackground: 'none',
  readerOverlay: 82,
  readerBlur: 0,
  updatedAt: 0
};

const SETTINGS_KEY = 'keyhaven_settings_v1';

export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    const legacyLight = parsed.theme === ('zen-sand' as ThemeId) || parsed.theme === ('paper-ink' as ThemeId);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      theme: parsed.theme === 'daylight' || legacyLight ? 'daylight' : 'reading-room'
    };
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
