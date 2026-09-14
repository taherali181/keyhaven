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

export type ReaderBackground = 'none' | 'plain' | 'cherry-blossoms' | 'misty-mountains' | 'quiet-lake' | 'soft-forest' | 'mountain-valley' | 'alpine-lake' | 'forest-sunset' | 'twilight-peaks';

export type ReaderToneId = 'paper' | 'sepia' | 'night' | 'bright' | 'pitch' | 'mist' | 'sage' | 'slate' | 'ocean' | 'rose' | 'espresso';

/** A user-made page tone: three picked colors, the rest of the palette is derived. */
export interface CustomReaderTone {
  id: string;
  name: string;
  background: string;
  text: string;
  accent: string;
}

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

/** Anything the reader can open: a catalog short story, a Project Gutenberg book, or an imported EPUB/PDF. */
export type WorkKind = 'story' | 'book' | 'import';

export interface WorkSection {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface Work {
  /** Namespaced key: `story:<id>`, `pg:<gutenberg id>` or `import:<id>`. Also the bookProgress id. */
  key: string;
  kind: WorkKind;
  title: string;
  author: string;
  year?: number | string;
  /** A story has a single section; books have one per chapter. */
  sections: WorkSection[];
  updatedAt: number;
}

/** One entry of public/catalog/stories/index.json. */
export interface StoryMeta {
  id: string;
  title: string;
  author: string;
  year: number;
  words: number;
  tags: string[];
  popular?: boolean;
  source: number;
}

export interface CatalogAuthorName {
  name: string;
  birth?: number;
  death?: number;
}

/** One entry of public/catalog/books.json. */
export interface CatalogBook {
  id: number;
  title: string;
  subtitle?: string;
  authors: CatalogAuthorName[];
  cats: string[];
  subjects: string[];
  downloads: number;
}

export interface CatalogAuthor extends CatalogAuthorName {
  downloads: number;
  books: number[];
}

/** Library shelf entries: books saved for later and anything marked finished. */
export interface ShelfRecord {
  key: string;
  kind: WorkKind;
  title: string;
  author: string;
  want: boolean;
  finishedAt?: number;
  addedAt: number;
  updatedAt: number;
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
  /** The work key (`story:…`, `pg:…`, `import:…`). */
  bookId: string;
  chapterId?: string;
  /** Section (chapter) index. */
  chapterIndex: number;
  /** Characters typed into the section, counting whole chunks before the current one. */
  charOffset: number;
  percent: number;
  totalWordsTyped: number;
  lastRead: number;
  syncedAt?: number;
  kind?: WorkKind;
  title?: string;
  author?: string;
  /** Typing chunk within the section. */
  chunkIndex?: number;
  /** Reading mode: how far through the section's pages (0–1). */
  pageFraction?: number;
  /** Sections read to their last page. */
  readSections?: number[];
  finishedAt?: number;
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

/** Items the reader's bottom bar can show; see src/lib/reader-stats.ts. */
export type ReaderStatId =
  | 'chapterTimeLeft' | 'bookTimeLeft' | 'bookPage' | 'bookPercent' | 'chapterPercent' | 'wordsLeft'
  | 'readingSpeed' | 'sessionTime' | 'finishBy' | 'chapterName' | 'clock'
  | 'wpm' | 'accuracy' | 'rawWpm' | 'elapsed' | 'part';

export interface ReaderBarStyle {
  /** While the title bar auto-hides: keep a thin progress line in the bottom bar. */
  compactProgress: boolean;
  compactOpacity: 'soft' | 'faint';
  /** "4 min chapter left" vs "4 min". */
  labels: boolean;
}

/** Per-section typography and bottom bar (see src/lib/section-settings.ts). */
export type SectionPrefs = Pick<UserSettings, 'font' | 'fontSize' | 'readerFontWeight' | 'readerLetterSpacing' | 'readerLineHeight' | 'readerWidth' | 'readerStats' | 'readerBarStyle'>;

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
  readerWidth: 'narrow' | 'balanced' | 'wide' | 'full';
  /** 'system' follows the theme; `custom:<id>` points into customTones. */
  readerPaper: 'system' | ReaderToneId | `custom:${string}`;
  customTones: CustomReaderTone[];
  readerBackground: ReaderBackground;
  readerOverlay: number;
  readerBlur: number;
  readerFontWeight: 300 | 400 | 500 | 600;
  readerLetterSpacing: 'tight' | 'normal' | 'wide';
  /** Stories: type the passage, or just read it in pages. */
  storyMode: 'type' | 'read';
  /** Silences key sounds and background ambience without losing their settings. */
  muted: boolean;
  /** Floating motes and drifting scenery. Off by default: animated full-screen effects cost GPU. */
  ambientMotion: boolean;
  /** Reader title bar: always shown, or hidden until the pointer reaches the top. */
  readerBarPinned: boolean;
  readerStats: { read: ReaderStatId[]; type: ReaderStatId[] };
  readerBarStyle: ReaderBarStyle;
  /** Typography and bottom bar for sections other than Read; Read uses the top-level values. */
  sectionPrefs: Partial<Record<TypingMode, Partial<SectionPrefs>>>;
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
