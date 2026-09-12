import Dexie, { type Table } from 'dexie';
import { TestResultRecord, BookProgressRecord, ArcadeScoreRecord, UserSettings } from '@/types';

export class KeyHavenDatabase extends Dexie {
  testResults!: Table<TestResultRecord, number>;
  bookProgress!: Table<BookProgressRecord, string>;
  arcadeScores!: Table<ArcadeScoreRecord, number>;

  constructor() {
    super('KeyHavenDB');
    this.version(1).stores({
      testResults: '++id, mode, subMode, timestamp, wpm, accuracy',
      bookProgress: 'bookId, lastRead',
      arcadeScores: '++id, game, score, wpm, timestamp'
    });
  }
}

export const db = new KeyHavenDatabase();

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'zen-sand',
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
  strictMode: false
};

const SETTINGS_KEY = 'keyhaven_settings_v1';

export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}
