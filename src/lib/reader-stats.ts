// What the reader's bottom bar can show. Each item reads from one snapshot of the reader's state, so
// every stat agrees with the progress bar.
import type { ReaderBarStyle, ReaderStatId } from '@/types';
import { formatReadTime } from '@/lib/reading';
import { formatTime } from '@/lib/metrics';

export type ReaderMode = 'read' | 'type';

export interface ReaderStatContext {
  mode: ReaderMode;
  isStory: boolean;
  /** "chapter", "section" or "story". */
  unit: string;
  sectionTitle: string;
  /** Words before the reader's position, counted across the whole work. */
  positionWords: number;
  sectionStartWords: number;
  sectionWords: number;
  totalWords: number;
  readingWpm: number;
  typingWpm: number;
  accuracy: number;
  rawWpm: number;
  elapsedSeconds: number;
  /** Exact, one-based page and total for the current typography and viewport; null until measured. */
  bookPage: number | null;
  bookPages: number | null;
  part: number;
  partCount: number;
  /** Epoch ms; 0 until the clock has started on the client. */
  now: number;
  sessionStartedAt: number;
}

export interface ReaderStatValue { value: string; short?: string }

export interface ReaderStatDefinition {
  id: ReaderStatId;
  label: string;
  description: string;
  modes: ReaderMode[];
  value: (ctx: ReaderStatContext) => ReaderStatValue | null;
}

export interface ResolvedReaderStat { id: ReaderStatId; label: string; value: string; short?: string }

export const MAX_READER_STATS = 6;
export const DEFAULT_READER_STATS: Record<ReaderMode, ReaderStatId[]> = {
  read: ['chapterTimeLeft', 'bookTimeLeft', 'bookPage'],
  type: ['wpm', 'accuracy', 'elapsed']
};
export const DEFAULT_READER_BAR_STYLE: ReaderBarStyle = { compactProgress: true, compactOpacity: 'soft', labels: true };

/** Typing estimates fall back to a gentle pace until the live WPM means something. */
const TYPING_FALLBACK_WPM = 40;
const pace = (ctx: ReaderStatContext) => (ctx.mode === 'read' ? ctx.readingWpm : ctx.typingWpm >= 10 ? ctx.typingWpm : TYPING_FALLBACK_WPM);
const sectionLeft = (ctx: ReaderStatContext) => Math.max(0, ctx.sectionStartWords + ctx.sectionWords - ctx.positionWords);
const bookLeft = (ctx: ReaderStatContext) => Math.max(0, ctx.totalWords - ctx.positionWords);
const whole = (ctx: ReaderStatContext) => (ctx.isStory ? 'story' : 'book');
const clockTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const READER_STATS: ReaderStatDefinition[] = [
  {
    id: 'chapterTimeLeft', label: 'Time left in chapter', description: 'At your reading or typing pace', modes: ['read', 'type'],
    value: ctx => ({ value: formatReadTime(sectionLeft(ctx), pace(ctx)), short: `${ctx.unit} left` })
  },
  {
    id: 'bookTimeLeft', label: 'Time left in book', description: 'Hidden for short stories, where it matches the chapter', modes: ['read', 'type'],
    value: ctx => (ctx.isStory ? null : { value: formatReadTime(bookLeft(ctx), pace(ctx)), short: 'book left' })
  },
  {
    id: 'bookPage', label: 'Page in book', description: 'Pages at your current text size and window size', modes: ['read'],
    value: ctx => {
      if (ctx.bookPage === null || ctx.bookPages === null) return null;
      const pages = Math.max(1, ctx.bookPages);
      const page = Math.min(pages, Math.max(1, ctx.bookPage));
      return { value: `${page.toLocaleString()}/${pages.toLocaleString()}`, short: 'page' };
    }
  },
  {
    id: 'bookPercent', label: 'Book progress', description: 'Percent of the whole book or story', modes: ['read', 'type'],
    value: ctx => ({ value: `${Math.min(100, Math.round((ctx.positionWords / Math.max(1, ctx.totalWords)) * 100))}%`, short: `of ${whole(ctx)}` })
  },
  {
    id: 'chapterPercent', label: 'Chapter progress', description: 'Percent of the current chapter', modes: ['read', 'type'],
    value: ctx => (ctx.isStory ? null : { value: `${Math.min(100, Math.round(((ctx.positionWords - ctx.sectionStartWords) / Math.max(1, ctx.sectionWords)) * 100))}%`, short: `of ${ctx.unit}` })
  },
  {
    id: 'wordsLeft', label: 'Words left', description: 'In the current chapter', modes: ['read', 'type'],
    value: ctx => ({ value: sectionLeft(ctx).toLocaleString(), short: 'words left' })
  },
  {
    id: 'readingSpeed', label: 'Reading speed', description: 'Learned from how fast you turn pages', modes: ['read'],
    value: ctx => ({ value: String(ctx.readingWpm), short: 'wpm' })
  },
  {
    id: 'finishBy', label: 'Finish by', description: 'Clock time the chapter ends at your pace', modes: ['read', 'type'],
    value: ctx => (ctx.now ? { value: clockTime(ctx.now + (sectionLeft(ctx) / Math.max(1, pace(ctx))) * 60_000), short: `${ctx.unit} ends` } : null)
  },
  {
    id: 'sessionTime', label: 'Session time', description: 'How long this sitting has lasted', modes: ['read', 'type'],
    value: ctx => (ctx.now && ctx.sessionStartedAt ? { value: `${Math.max(0, Math.floor((ctx.now - ctx.sessionStartedAt) / 60_000))} min`, short: 'session' } : null)
  },
  {
    id: 'chapterName', label: 'Chapter name', description: 'The title of the current chapter', modes: ['read', 'type'],
    value: ctx => (ctx.isStory || !ctx.sectionTitle ? null : { value: ctx.sectionTitle })
  },
  {
    id: 'clock', label: 'Clock', description: 'The current time', modes: ['read', 'type'],
    value: ctx => (ctx.now ? { value: clockTime(ctx.now) } : null)
  },
  { id: 'wpm', label: 'Words per minute', description: 'Live typing speed', modes: ['type'], value: ctx => ({ value: String(ctx.typingWpm), short: 'wpm' }) },
  { id: 'accuracy', label: 'Accuracy', description: 'Correct keystrokes in this part', modes: ['type'], value: ctx => ({ value: `${ctx.accuracy}%`, short: 'acc' }) },
  { id: 'rawWpm', label: 'Raw speed', description: 'Typing speed including mistakes', modes: ['type'], value: ctx => ({ value: String(ctx.rawWpm), short: 'raw' }) },
  { id: 'elapsed', label: 'Time on this part', description: 'Stopwatch for the part you are typing', modes: ['type'], value: ctx => ({ value: formatTime(ctx.elapsedSeconds) }) },
  { id: 'part', label: 'Part', description: 'Which typing part of the chapter you are on', modes: ['type'], value: ctx => ({ value: `${ctx.part + 1}/${ctx.partCount}`, short: 'part' }) }
];

const BY_ID = new Map(READER_STATS.map(stat => [stat.id, stat]));

export const statsForMode = (mode: ReaderMode) => READER_STATS.filter(stat => stat.modes.includes(mode));

/** Keeps only known, mode-appropriate, unique ids (at most six); falls back to the defaults. */
export function sanitizeReaderStats(value: unknown): Record<ReaderMode, ReaderStatId[]> {
  const input = (value && typeof value === 'object' ? value : {}) as Partial<Record<ReaderMode, unknown>>;
  const clean = (mode: ReaderMode) => {
    const list = input[mode];
    if (!Array.isArray(list)) return DEFAULT_READER_STATS[mode];
    return [...new Set(list)].filter((id): id is ReaderStatId => typeof id === 'string' && Boolean(BY_ID.get(id as ReaderStatId)?.modes.includes(mode))).slice(0, MAX_READER_STATS);
  };
  return { read: clean('read'), type: clean('type') };
}

export function resolveReaderStats(ids: ReaderStatId[], ctx: ReaderStatContext, labels = true): ResolvedReaderStat[] {
  return ids.flatMap(id => {
    const stat = BY_ID.get(id);
    if (!stat || !stat.modes.includes(ctx.mode)) return [];
    const result = stat.value(ctx);
    return result ? [{ id, label: stat.label, value: result.value, short: labels ? result.short : undefined }] : [];
  });
}
