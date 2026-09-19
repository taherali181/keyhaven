export type TypingMode = 
  | 'stories'
  | 'speed-test'
  | 'quotes'
  | 'library'
  | 'learn'
  | 'arcade'
  | 'leaderboard'
  | 'profile'
  | 'home'
  | 'pdf'
  | 'manuscript';

export type ReaderBackground = 'none' | 'plain' | 'custom' | 'cherry-blossoms' | 'misty-mountains' | 'quiet-lake' | 'soft-forest' | 'mountain-valley' | 'alpine-lake' | 'forest-sunset' | 'twilight-peaks';

export type ReaderToneId = 'paper' | 'sepia' | 'night' | 'bright' | 'pitch' | 'mist' | 'sage' | 'slate' | 'ocean' | 'rose' | 'espresso' | 'lavender';
export type ThemeId = ReaderToneId | `custom:${string}`;

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
  | 'playfair'
  | 'source-serif'
  | 'lora'
  | 'merriweather'
  | 'garamond'
  | 'inter'
  | 'plex'
  | 'atkinson'
  | 'jetbrains-mono';

export type CaretStyle = 
  | 'smooth'
  | 'block'
  | 'underline'
  | 'bar'
  | 'glow';

/** Anything the reader can open: a catalog short story, a Project Gutenberg book, an imported EPUB/PDF, or the reader's own writing. */
export type WorkKind = 'story' | 'book' | 'import' | 'manuscript';

/** A stretch of time spent in the reader, for reading stats. */
export interface ReadingSessionRecord {
  id?: number;
  clientId: string;
  workKey: string;
  kind: WorkKind;
  title: string;
  author: string;
  mode: 'read' | 'type';
  startedAt: number;
  durationMs: number;
  /** Words moved through during the session. */
  words: number;
  pages: number;
  syncedAt?: number;
  dirty?: 0 | 1;
}

/** Record kinds whose deletions travel between devices. */
export type SyncTombstoneEntity = 'results' | 'scores' | 'sessions' | 'progress' | 'shelf' | 'documents' | KeyedSyncEntity;

/** Records that sync as a key plus the device's whole record, merged last-writer-wins on `updatedAt`. */
export type KeyedSyncEntity = 'highlights' | 'favorites' | 'manuscripts';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

/** A highlighted stretch of one paragraph in the reader, with an optional note. */
export interface HighlightRecord {
  id: string;
  workKey: string;
  /** Section (chapter or story part) and paragraph index within it; `start`/`end` are character offsets in the paragraph. */
  sectionIndex: number;
  paragraph: number;
  start: number;
  end: number;
  /** The highlighted text, used to find the spot again if the paragraph's offsets ever shift. */
  quote: string;
  color: HighlightColor;
  note?: string;
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
  dirty?: 0 | 1;
}

/** Something the reader saved: for now, quotes (`quote:<id>`). */
export interface FavoriteRecord {
  key: string;
  kind: 'quote';
  addedAt: number;
  updatedAt: number;
  syncedAt?: number;
  dirty?: 0 | 1;
}

/** A document the reader wrote in Write. `# Heading` lines start new sections. */
export interface ManuscriptRecord {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
  dirty?: 0 | 1;
}

/** An image from an imported EPUB. Kept on this device only. */
export interface DocumentAssetRecord {
  id: string;
  documentId: string;
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  alt: string;
}

/** The original file of an imported PDF, so its pages can be shown as they look. Kept on this device only. */
export interface DocumentFileRecord {
  id: string;
  blob: Blob;
  name: string;
  size: number;
  addedAt: number;
}

/** A local deletion waiting to be backed up. Key '*' covers every record of that kind up to `deletedAt`. */
export interface PendingDeleteRecord {
  id: string;
  entity: SyncTombstoneEntity;
  key: string;
  deletedAt: number;
}

export interface WorkSection {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface Work {
  /** Namespaced key: `story:<id>`, `pg:<gutenberg id>`, `import:<id>` or `ms:<id>`. Also the bookProgress id. */
  key: string;
  kind: WorkKind;
  title: string;
  author: string;
  year?: number | string;
  /** A story has a single section; books have one per chapter. */
  sections: WorkSection[];
  updatedAt: number;
  /** Imports: the file it came from. A PDF can also be read as its original pages. */
  format?: 'epub' | 'pdf';
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
  syncedAt?: number;
  dirty?: 0 | 1;
  updatedAt: number;
}

/** A public-domain quote, checked against its source on Project Gutenberg (public/catalog/quotes.json). */
export interface Quote {
  id: string;
  text: string;
  author: string;
  /** The work it comes from. */
  source?: string;
  category: string;
  /** Project Gutenberg book id of the source. */
  gutenberg?: number;
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
  /** 1 while this record has changes not yet backed up (see src/lib/sync/tracking.ts). */
  dirty?: 0 | 1;
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
  /** 1 while this record has changes not yet backed up (see src/lib/sync/tracking.ts). */
  dirty?: 0 | 1;
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
  /** 1 while this record has changes not yet backed up (see src/lib/sync/tracking.ts). */
  dirty?: 0 | 1;
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
export type SectionPrefs = Pick<UserSettings, 'font' | 'fontSize' | 'readerFontWeight' | 'readerLetterSpacing' | 'readerWordSpacing' | 'readerParagraphSpacing' | 'readerAlign' | 'readerHyphens' | 'readerLineHeight' | 'readerWidth' | 'readerStats' | 'readerBarStyle'>;

/** Reader page-turn actions that keys can be mapped to. */
export type PageAction = 'next' | 'prev' | 'first' | 'last';

/** How pages turn in Read mode. Set in the main Settings panel (Input). See src/lib/reader-input.ts. */
export interface ReaderInputSettings {
  /** The mouse wheel turns pages. */
  wheel: boolean;
  /** Clicking the left or right edge of the page turns it. */
  clickZones: boolean;
  keys: Record<PageAction, string[]>;
}

export interface UserSettings {
  theme: ThemeId;
  font: FontFamily;
  caretStyle: CaretStyle;
  /** Passage text size in px at desktop widths (scaled down on phones). See src/lib/typography.ts. */
  fontSize: number;
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
  /** Text column width in px. */
  readerWidth: number;
  customTones: CustomReaderTone[];
  readerBackground: ReaderBackground;
  /** Read mode only; narrow screens always display one page. */
  readerPageLayout?: 'single' | 'spread';
  /** Compressed image data URL retained with the user's settings. */
  customScenery?: string;
  readerOverlay: number;
  readerBlur: number;
  readerFontWeight: number;
  /** Letter and word spacing in em. */
  readerLetterSpacing: number;
  readerWordSpacing: number;
  /** Blank lines between paragraphs on reading pages (whole lines keep page breaks between lines). */
  readerParagraphSpacing: 0 | 1 | 2;
  readerAlign: 'left' | 'justify';
  readerHyphens: boolean;
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
  /** Daily goals shown on the profile, in minutes. */
  dailyTypingGoalMinutes: number;
  dailyReadingGoalMinutes: number;
  /** Academy lessons show the keyboard guide under the text. */
  academyGuide: 'on' | 'off';
  readerInput: ReaderInputSettings;
  /** Quotes shown in Quotes: every quote, only saved ones, or one category. */
  quoteFilter: string;
  /** The last Speed test set up, so the next visit starts the same way. */
  speedPrefs: SpeedPrefs;
  updatedAt: number;
}

export type SpeedMode = 'time' | 'words' | 'quote' | 'custom' | 'zen';
export type QuoteLength = 'short' | 'medium' | 'long' | 'any';

export interface SpeedPrefs {
  mode: SpeedMode;
  /** Seconds, for a timed test. */
  time: number;
  /** Words, for a word-count test. */
  words: number;
  quoteLength: QuoteLength;
  punctuation: boolean;
  numbers: boolean;
  /** Your own practice text, for Custom. */
  customText: string;
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
  /** 1 while this record has changes not yet backed up (see src/lib/sync/tracking.ts). */
  dirty?: 0 | 1;
}

export interface AcademyLessonProgress {
  /** Next step to practise; equals the step count once the checkpoint is passed. */
  stepIndex: number;
  bestWpm: number;
  bestAccuracy: number;
  stars: 0 | 1 | 2 | 3;
  attempts: number;
  passedAt?: number;
  /** Most recent checkpoint attempt that fell short, while not yet passed. */
  failedAt?: number;
}

export interface AcademyKeyStat { hits: number; misses: number; avgMs: number }

/** Academy progress (see src/lib/academy/progress.ts). Version 1 records are migrated when loaded. */
export interface AcademyStateRecord {
  id: 'academy';
  version?: 2;
  placementComplete: boolean;
  placementUnitId?: string;
  currentLessonId: string;
  lessons?: Record<string, AcademyLessonProgress>;
  keyStats?: Record<string, AcademyKeyStat>;
  /** Minutes practised per local day (YYYY-MM-DD). */
  practiceLog?: Record<string, number>;
  dailyGoalMinutes: number;
  /** Version 1 fields. */
  completedExercises?: string[];
  mastery?: Record<string, number>;
  weeklyGoalMinutes?: number;
  practiceDates?: string[];
  totalMinutes?: number;
  updatedAt: number;
  syncedAt?: number;
  /** 1 while this record has changes not yet backed up (see src/lib/sync/tracking.ts). */
  dirty?: 0 | 1;
}
