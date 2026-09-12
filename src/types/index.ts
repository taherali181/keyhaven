export type TypingMode = 
  | 'stories'
  | 'speed-test'
  | 'quotes'
  | 'library'
  | 'learn'
  | 'arcade'
  | 'leaderboard'
  | 'profile';

export type ThemeId = 'reading-room' | 'daylight';

export type ReaderBackground = 'none' | 'cherry-blossoms' | 'misty-mountains' | 'quiet-lake' | 'soft-forest';

export type WrapMode = 'literary' | 'whole-word';
export type TypingSessionStatus = 'idle' | 'running' | 'finished';

export type SwitchSound = 
  | 'off'
  | 'cherry-blue'
  | 'gateron-brown'
  | 'cherry-red'
  | 'holy-panda'
  | 'typewriter'
  | 'raindrop';

export type AmbientSound = 
  | 'none'
  | 'rain'
  | 'fireplace'
  | 'cafe'
  | 'forest'
  | 'zen-river'
  | 'alpha-waves';

export type FontFamily = 
  | 'jetbrains'
  | 'fira'
  | 'serif'
  | 'sans'
  | 'playfair';

export type CaretStyle = 
  | 'smooth'
  | 'block'
  | 'underline'
  | 'bar'
  | 'glow';

export interface Story {
  id: string;
  title: string;
  author: string;
  year: number | string;
  category: string;
  synopsis: string;
  paragraphs: string[];
  totalWords: number;
}

export interface BookChapter {
  id: string;
  title: string;
  chapterNumber: number;
  text: string;
  wordCount: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  year: number | string;
  category: 'Philosophy' | 'Classic Fiction' | 'Non-Fiction' | 'Poetry';
  coverGradient: string;
  synopsis: string;
  chapters: BookChapter[];
  totalWords: number;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  source?: string;
  category: 'Stoicism' | 'Eastern Philosophy' | 'Science & Tech' | 'Literature' | 'Motivational';
  length: 'short' | 'medium' | 'long';
}

export interface Lesson {
  id: string;
  tier: number;
  title: string;
  subtitle: string;
  description: string;
  targetKeys: string[];
  fingerAssignments: Record<string, string>;
  exercises: string[];
}

export interface CharTiming {
  char: string;
  timestamp: number;
  durationMs: number;
  isCorrect: boolean;
}

export interface HistoryPoint {
  second: number;
  wpm: number;
  rawWpm: number;
  errors: number;
}

export interface TypingStats {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  timeElapsed: number;
  totalChars: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  missedChars: number;
  charTimings: CharTiming[];
  errorHeatmap: Record<string, number>;
  history: HistoryPoint[];
  evidence: TypingSessionEvidence[];
}

export interface TestResultRecord {
  id?: number;
  clientId: string;
  mode: TypingMode;
  subMode: string;
  title?: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  duration: number;
  timestamp: number;
  errors: number;
  errorKeys: Record<string, number>;
  totalChars?: number;
  correctChars?: number;
  incorrectChars?: number;
  syncedAt?: number;
  challengeId?: string;
  visibility?: 'private' | 'public';
}

export interface BookProgressRecord {
  bookId: string;
  chapterId?: string;
  chapterIndex: number;
  charOffset: number;
  percent: number;
  totalWordsTyped: number;
  lastRead: number;
  syncedAt?: number;
}

export interface ArcadeScoreRecord {
  id?: number;
  clientId: string;
  game: 'alphabet-sprint' | 'word-rain' | 'ghost-racer';
  score: number;
  wpm: number;
  accuracy: number;
  timeMs: number;
  timestamp: number;
  rank?: number;
  name?: string;
  syncedAt?: number;
  challengeId?: string;
  visibility?: 'private' | 'public';
  configuration?: Record<string, unknown>;
}

export interface UserSettings {
  theme: ThemeId;
  font: FontFamily;
  caretStyle: CaretStyle;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  switchSound: SwitchSound;
  soundVolume: number;
  ambientSound: AmbientSound;
  ambientVolume: number;
  showLiveWpm: boolean;
  showLiveAccuracy: boolean;
  showKeyboard: boolean;
  zenMode: boolean;
  smoothCaret: boolean;
  strictMode: boolean;
  leaderboardEnabled: boolean;
  readerLineHeight: number;
  readerWidth: 'narrow' | 'balanced' | 'wide';
  readerPaper: 'system' | 'paper' | 'sepia' | 'night';
  readerBackground: ReaderBackground;
  readerOverlay: number;
  readerBlur: number;
  updatedAt: number;
}

export interface TypingSessionEvidence {
  key: string;
  atMs: number;
}

export interface ImportedSection {
  id: string;
  title: string;
  text: string;
}

export interface ImportedDocumentRecord {
  id: string;
  title: string;
  author: string;
  format: 'epub' | 'pdf';
  sections: ImportedSection[];
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
}

export interface AcademyStateRecord {
  id: 'academy';
  placementComplete: boolean;
  currentLessonId: string;
  completedExercises: string[];
  mastery: Record<string, number>;
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
  practiceDates: string[];
  totalMinutes: number;
  updatedAt: number;
  syncedAt?: number;
}
