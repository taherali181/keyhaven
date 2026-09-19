// Aggregations behind the Profile page. Pure functions over Dexie records, so they can be unit tested and
// always use the reader's local calendar (a streak survives until local midnight, not UTC midnight).
import type { AcademyStateRecord, ArcadeScoreRecord, BookProgressRecord, ReadingSessionRecord, ShelfRecord, TestResultRecord, TypingMode } from '@/types';

const MINUTE = 60_000;

export function dayStart(ms: number) {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Calendar arithmetic (not 24 h steps), so daylight-saving changes never skip or repeat a day. */
export function addDays(ms: number, days: number) {
  const date = new Date(ms);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

export function localDay(ms: number) {
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDay(day: string) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date).getTime();
}

const finite = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

export function formatMinutes(minutes: number) {
  if (minutes < 1) return minutes > 0 ? '<1 min' : '0 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return hours < 10 ? `${hours.toFixed(1).replace(/\.0$/, '')} h` : `${Math.round(hours)} h`;
}

/** "1 story", "2 stories". */
export const plural = (count: number, singular: string, pluralForm = `${singular}s`) => `${count} ${count === 1 ? singular : pluralForm}`;

export function compactNumber(value: number) {
  const number = Math.round(value);
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (number >= 10_000) return `${Math.round(number / 1000)}k`;
  if (number >= 1000) return `${(number / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(number);
}

// ── Activity ──

export interface DayActivity { typingMinutes: number; readingMinutes: number }

/** Minutes per local day. Typing comes from results; reading from reading-mode sessions (typed reading is already a result). */
export function activityByDay(results: TestResultRecord[], sessions: ReadingSessionRecord[]) {
  const days = new Map<string, DayActivity>();
  const entry = (ms: number) => {
    const key = localDay(ms);
    let value = days.get(key);
    if (!value) { value = { typingMinutes: 0, readingMinutes: 0 }; days.set(key, value); }
    return value;
  };
  for (const result of results) if (finite(result.timestamp)) entry(result.timestamp).typingMinutes += Math.max(0, finite(result.duration)) / 60;
  for (const session of sessions) {
    if (!finite(session.startedAt)) continue;
    const day = entry(session.startedAt);
    if (session.mode === 'read') day.readingMinutes += Math.max(0, finite(session.durationMs)) / MINUTE;
  }
  return days;
}

/** Consecutive active days. Today still counts toward the streak until it ends, even before practising. */
export function streaks(activeDays: Iterable<string>, now: number) {
  const days = new Set(activeDays);
  let current = 0;
  let cursor = dayStart(now);
  if (!days.has(localDay(cursor))) cursor = addDays(cursor, -1);
  while (days.has(localDay(cursor))) { current += 1; cursor = addDays(cursor, -1); }
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of [...days].sort()) {
    run = previous && localDay(addDays(parseDay(previous), 1)) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  return { current, longest: Math.max(longest, current) };
}

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;
export const activityLevel = (minutes: number): ActivityLevel => (minutes <= 0 ? 0 : minutes < 5 ? 1 : minutes < 15 ? 2 : minutes < 30 ? 3 : 4);

export interface CalendarCell extends DayActivity { day: string; start: number; minutes: number; level: ActivityLevel; future: boolean }

/** Weeks (Monday first) ending with the current week, oldest first. */
export function calendarWeeks(days: Map<string, DayActivity>, now: number, weeks = 26): CalendarCell[][] {
  const today = dayStart(now);
  const thisMonday = addDays(today, -((new Date(today).getDay() + 6) % 7));
  const first = addDays(thisMonday, -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, week) => Array.from({ length: 7 }, (_, weekday) => {
    const start = addDays(first, week * 7 + weekday);
    const day = localDay(start);
    const activity = days.get(day) ?? { typingMinutes: 0, readingMinutes: 0 };
    const minutes = activity.typingMinutes + activity.readingMinutes;
    return { day, start, ...activity, minutes, level: activityLevel(minutes), future: start > today };
  }));
}

export function todayActivity(days: Map<string, DayActivity>, now: number): DayActivity {
  return days.get(localDay(now)) ?? { typingMinutes: 0, readingMinutes: 0 };
}

// ── Typing ──

const wordsIn = (result: TestResultRecord) => (result.correctChars ?? (finite(result.wpm) * 5 * finite(result.duration)) / 60) / 5;
const mean = (values: number[]) => (values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : 0);

export interface TypingSummary {
  sessions: number; bestWpm: number; averageWpm: number; averageAccuracy: number; averageConsistency: number;
  minutes: number; wordsTyped: number; recentWpm: number | null; previousWpm: number | null;
}

export function typingSummary(results: TestResultRecord[]): TypingSummary {
  const valid = results.filter(result => Number.isFinite(result.wpm));
  const newest = [...valid].sort((a, b) => b.timestamp - a.timestamp);
  const recent = newest.slice(0, 10);
  const previous = newest.slice(10, 20);
  return {
    sessions: valid.length,
    bestWpm: valid.reduce((best, result) => Math.max(best, result.wpm), 0),
    averageWpm: mean(valid.map(result => result.wpm)),
    averageAccuracy: mean(valid.map(result => finite(result.accuracy))),
    averageConsistency: mean(valid.map(result => finite(result.consistency))),
    minutes: valid.reduce((total, result) => total + Math.max(0, finite(result.duration)), 0) / 60,
    wordsTyped: Math.round(valid.reduce((total, result) => total + wordsIn(result), 0)),
    recentWpm: recent.length ? mean(recent.map(result => result.wpm)) : null,
    previousWpm: previous.length ? mean(previous.map(result => result.wpm)) : null
  };
}

export interface TrendPoint { index: number; wpm: number; accuracy: number; average: number; timestamp: number; title: string }

/** The latest sessions in order, with a five-session rolling average. */
export function wpmTrend(results: TestResultRecord[], limit = 50): TrendPoint[] {
  const recent = results.filter(result => Number.isFinite(result.wpm)).sort((a, b) => a.timestamp - b.timestamp).slice(-limit);
  return recent.map((result, index) => ({
    index: index + 1, wpm: result.wpm, accuracy: finite(result.accuracy), timestamp: result.timestamp, title: result.title ?? result.subMode,
    average: mean(recent.slice(Math.max(0, index - 4), index + 1).map(item => item.wpm))
  }));
}

export const SPEED_CONFIGS = ['15s', '30s', '60s', '120s', '10 words', '25 words', '50 words', '100 words'] as const;

export function personalBests(results: TestResultRecord[]) {
  const speed = results.filter(result => result.mode === 'speed-test');
  return SPEED_CONFIGS.map(config => {
    const runs = speed.filter(result => result.subMode === config);
    const best = runs.reduce<TestResultRecord | null>((top, result) => (!top || result.wpm > top.wpm || (result.wpm === top.wpm && result.accuracy > top.accuracy) ? result : top), null);
    return { config, attempts: runs.length, best };
  });
}

export const MODE_LABELS: Partial<Record<TypingMode, string>> = { stories: 'Stories', library: 'Books', quotes: 'Quotes', 'speed-test': 'Speed', learn: 'Academy', arcade: 'Arcade' };

export function modeBreakdown(results: TestResultRecord[]) {
  const groups = new Map<TypingMode, TestResultRecord[]>();
  for (const result of results) groups.set(result.mode, [...(groups.get(result.mode) ?? []), result]);
  return [...groups].map(([mode, rows]) => ({
    mode, label: MODE_LABELS[mode] ?? mode, sessions: rows.length,
    minutes: rows.reduce((total, row) => total + Math.max(0, finite(row.duration)), 0) / 60,
    averageWpm: mean(rows.map(row => finite(row.wpm)))
  })).sort((a, b) => b.minutes - a.minutes || b.sessions - a.sessions);
}

/** Mistakes per key across all results; case is merged and whitespace ignored. */
export function lifetimeErrors(results: TestResultRecord[]) {
  const totals: Record<string, number> = {};
  for (const result of results) {
    for (const [key, count] of Object.entries(result.errorKeys ?? {})) {
      if (!key.trim() || !Number.isFinite(count)) continue;
      const normalized = key.toLowerCase();
      totals[normalized] = (totals[normalized] ?? 0) + count;
    }
  }
  return totals;
}

export function problemKeys(errors: Record<string, number>, limit = 6) {
  return Object.entries(errors).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([key, count]) => ({ key, count }));
}

// ── Reading ──

export function weekStart(now: number) {
  const today = dayStart(now);
  return addDays(today, -((new Date(today).getDay() + 6) % 7));
}

export const workKind = (record: BookProgressRecord) => record.kind ?? (record.bookId.startsWith('story:') ? 'story' : record.bookId.startsWith('import:') ? 'import' : record.bookId.startsWith('ms:') ? 'manuscript' : 'book');

export interface ReadingSummary {
  minutes: number; words: number; averageWpm: number | null; thisWeekMinutes: number; lastWeekMinutes: number;
  storiesFinished: number; booksFinished: number; wantToRead: number;
  worksStarted: { stories: number; books: number; imports: number };
  currentlyReading: BookProgressRecord[]; recentlyFinished: BookProgressRecord[];
  topAuthors: Array<{ author: string; works: number }>;
}

export function readingSummary(sessions: ReadingSessionRecord[], progress: BookProgressRecord[], shelf: ShelfRecord[], now: number): ReadingSummary {
  const read = sessions.filter(session => session.mode === 'read');
  const minutes = read.reduce((total, session) => total + Math.max(0, finite(session.durationMs)), 0) / MINUTE;
  const readWords = read.reduce((total, session) => total + Math.max(0, finite(session.words)), 0);
  const thisWeek = weekStart(now);
  const lastWeek = addDays(thisWeek, -7);
  const minutesBetween = (from: number, to: number) => read.filter(session => session.startedAt >= from && session.startedAt < to).reduce((total, session) => total + Math.max(0, finite(session.durationMs)), 0) / MINUTE;
  const finished = progress.filter(record => record.finishedAt);
  const authors = new Map<string, Set<string>>();
  for (const record of progress) {
    const author = record.author?.trim();
    if (!author || workKind(record) === 'manuscript') continue;
    authors.set(author, (authors.get(author) ?? new Set()).add(record.bookId));
  }
  return {
    minutes,
    words: Math.round(sessions.reduce((total, session) => total + Math.max(0, finite(session.words)), 0)),
    averageWpm: minutes >= 1 && readWords > 0 ? Math.round(readWords / minutes) : null,
    thisWeekMinutes: minutesBetween(thisWeek, Number.POSITIVE_INFINITY),
    lastWeekMinutes: minutesBetween(lastWeek, thisWeek),
    storiesFinished: finished.filter(record => workKind(record) === 'story').length,
    booksFinished: finished.filter(record => workKind(record) !== 'story').length,
    wantToRead: shelf.filter(item => item.want).length,
    worksStarted: {
      stories: progress.filter(record => workKind(record) === 'story').length,
      books: progress.filter(record => workKind(record) === 'book').length,
      imports: progress.filter(record => workKind(record) === 'import').length
    },
    currentlyReading: progress.filter(record => !record.finishedAt && record.percent > 0).sort((a, b) => b.lastRead - a.lastRead).slice(0, 6),
    recentlyFinished: [...finished].sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0)).slice(0, 6),
    topAuthors: [...authors].map(([author, works]) => ({ author, works: works.size })).sort((a, b) => b.works - a.works || a.author.localeCompare(b.author)).slice(0, 5)
  };
}

// ── Identity and practice ──

export const READER_LEVELS = [
  { words: 0, title: 'Newcomer' }, { words: 2_000, title: 'Page turner' }, { words: 10_000, title: 'Reader' },
  { words: 40_000, title: 'Devoted reader' }, { words: 120_000, title: 'Bookworm' }, { words: 300_000, title: 'Bibliophile' },
  { words: 750_000, title: 'Scholar' }, { words: 1_500_000, title: 'Luminary' }
] as const;

/** A level from every word read or typed. */
export function readerLevel(words: number) {
  let index = 0;
  while (index < READER_LEVELS.length - 1 && words >= READER_LEVELS[index + 1].words) index += 1;
  const current = READER_LEVELS[index];
  const next = READER_LEVELS[index + 1] ?? null;
  const progress = next ? (words - current.words) / (next.words - current.words) : 1;
  return { level: index + 1, title: current.title, next, progress: Math.min(1, Math.max(0, progress)) };
}

/** The earliest recorded activity of any kind. */
export function memberSince(...lists: number[][]) {
  let first = Number.POSITIVE_INFINITY;
  for (const list of lists) for (const value of list) if (Number.isFinite(value) && value > 0 && value < first) first = value;
  return Number.isFinite(first) ? first : null;
}

export function academySummary(state: AcademyStateRecord | null) {
  if (!state) return null;
  // Version 1 records (mastery percentages) are only migrated once the Academy is opened.
  const lessons = Object.values(state.lessons ?? {});
  const mastery = Object.values(state.mastery ?? {});
  const current = state.version === 2 || lessons.length;
  return {
    placementComplete: Boolean(state.placementComplete),
    lessonsPassed: current ? lessons.filter(lesson => lesson.passedAt).length : mastery.filter(value => value >= 82).length,
    lessonsStarted: current ? lessons.length : mastery.length,
    exercises: current ? lessons.reduce((total, lesson) => total + (lesson.attempts ?? 0), 0) : state.completedExercises?.length ?? 0,
    currentLessonId: state.currentLessonId
  };
}

export const ARCADE_GAMES = [
  { id: 'alphabet-sprint', label: 'Alphabet Sprint' },
  { id: 'word-rain', label: 'Word Rain' },
  { id: 'ghost-racer', label: 'Ghost Racer' },
  { id: 'code-symbols', label: 'Code Symbols' },
  { id: 'accuracy-streak', label: 'Accuracy Streak' },
  { id: 'word-chain', label: 'Word Chain' }
] as const;

export function arcadeBests(scores: ArcadeScoreRecord[]) {
  return ARCADE_GAMES.map(game => {
    const rounds = scores.filter(score => score.game === game.id);
    if (!rounds.length) return { ...game, rounds: 0, best: null as string | null };
    const best = game.id === 'alphabet-sprint'
      ? `${(Math.min(...rounds.map(round => finite(round.timeMs) || Number.POSITIVE_INFINITY)) / 1000).toFixed(2)}s`
      : game.id === 'accuracy-streak'
        ? (top => `${top} ${top === 1 ? 'word' : 'words'}`)(Math.max(...rounds.map(round => finite(round.score))))
        : `${Math.max(...rounds.map(round => finite(round.score)))} pts`;
    return { ...game, rounds: rounds.length, best };
  });
}
