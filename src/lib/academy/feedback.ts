// Feedback on one finished run, measured against the Academy's per-key history: which keys and fingers cost the
// most, whether each is improving, what to practise next, and the Academy lesson that teaches the weakest key.
import type { AcademyKeyStat, TypingStats } from '@/types';
import { ALL_LESSONS } from '@/data/academy/units';
import type { AcademyLesson } from '@/lib/academy/types';
import { eachKeystroke, isPassed, migrateAcademy, updateKeyStats, type AcademyState } from '@/lib/academy/progress';
import { describeKey } from '@/components/typing/VirtualKeyboardHeatmap';
import { db } from '@/lib/db';

export type KeyStats = Record<string, AcademyKeyStat>;
export type KeyTrend = 'better' | 'worse' | 'steady' | 'new';

export interface KeyFeedback {
  key: string;
  attempts: number;
  misses: number;
  /** Average time for a correct press in this run, 0 when there is no usable timing. */
  avgMs: number;
  trend: KeyTrend;
  /** Higher is weaker. */
  score: number;
}

export interface FingerFeedback { finger: string; attempts: number; misses: number; avgMs: number }

const TRACKABLE = /^[a-z0-9,.;'?!/-]$/;
/** A key needs this many presses in a run before it is judged. */
const MIN_RUN_ATTEMPTS = 3;
/** And this many in the history before a trend is drawn. */
const MIN_HISTORY_ATTEMPTS = 8;
const TREND_MARGIN = 0.15;

const missRate = (stat: { hits: number; misses: number }) => stat.misses / Math.max(1, stat.hits + stat.misses);
const median = (values: number[]) => {
  const sorted = values.filter(value => value > 0).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/** Per-key hits, misses and average correct-press time for this run alone. */
export function runKeyStats(stats: TypingStats, text: string, strict: boolean): KeyStats {
  const totals: Record<string, { hits: number; misses: number; ms: number; timed: number }> = {};
  eachKeystroke(stats, text, strict, (key, correct, ms) => {
    const entry = totals[key] ??= { hits: 0, misses: 0, ms: 0, timed: 0 };
    if (!correct) { entry.misses += 1; return; }
    entry.hits += 1;
    if (ms !== null) { entry.ms += ms; entry.timed += 1; }
  });
  return Object.fromEntries(Object.entries(totals).map(([key, entry]) => [key, { hits: entry.hits, misses: entry.misses, avgMs: entry.timed ? Math.round(entry.ms / entry.timed) : 0 }]));
}

/**
 * Keys from this run, weakest first, each with its trend against the history `before` the run was recorded.
 * Only keys that were missed or noticeably slow are returned.
 */
export function keyFeedback(run: KeyStats, before: KeyStats, limit = 4): KeyFeedback[] {
  const typical = median(Object.values(run).map(stat => stat.avgMs));
  const items: KeyFeedback[] = [];
  for (const [key, stat] of Object.entries(run)) {
    const attempts = stat.hits + stat.misses;
    if (!TRACKABLE.test(key) || attempts < MIN_RUN_ATTEMPTS) continue;
    const slowness = typical && stat.avgMs ? Math.max(0, stat.avgMs / typical - 1) : 0;
    const score = missRate(stat) * 3 + slowness;
    if (score <= TREND_MARGIN) continue;
    const history = before[key];
    let trend: KeyTrend = 'new';
    if (history && history.hits + history.misses >= MIN_HISTORY_ATTEMPTS) {
      const speedChange = history.avgMs && stat.avgMs ? stat.avgMs / history.avgMs - 1 : 0;
      const change = (missRate(stat) - missRate(history)) * 3 + speedChange;
      trend = change > TREND_MARGIN ? 'worse' : change < -TREND_MARGIN ? 'better' : 'steady';
    }
    items.push({ key, attempts, misses: stat.misses, avgMs: stat.avgMs, trend, score: Math.round(score * 100) / 100 });
  }
  return items.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key)).slice(0, limit);
}

/** The finger that cost the most in this run (misses first, then slowness), or null on a clean, even run. */
export function fingerFeedback(run: KeyStats): FingerFeedback | null {
  const fingers: Record<string, { hits: number; misses: number; ms: number; timed: number }> = {};
  for (const [key, stat] of Object.entries(run)) {
    const finger = describeKey(key)?.finger;
    if (!finger) continue;
    const entry = fingers[finger] ??= { hits: 0, misses: 0, ms: 0, timed: 0 };
    entry.hits += stat.hits;
    entry.misses += stat.misses;
    if (stat.avgMs) { entry.ms += stat.avgMs * stat.hits; entry.timed += stat.hits; }
  }
  const rows = Object.entries(fingers)
    .map(([finger, entry]) => ({ finger, attempts: entry.hits + entry.misses, misses: entry.misses, avgMs: entry.timed ? Math.round(entry.ms / entry.timed) : 0 }))
    .filter(row => row.attempts >= MIN_RUN_ATTEMPTS * 2);
  const typical = median(rows.map(row => row.avgMs));
  const scored = rows
    .map(row => ({ row, score: missRate({ hits: row.attempts - row.misses, misses: row.misses }) * 3 + (typical && row.avgMs ? Math.max(0, row.avgMs / typical - 1) : 0) }))
    .filter(item => item.score > TREND_MARGIN)
    .sort((a, b) => b.score - a.score || a.row.finger.localeCompare(b.row.finger));
  return scored[0]?.row ?? null;
}

/** The first Academy lesson that introduces one of these keys and has not been passed yet. */
export function suggestLesson(state: AcademyState, keys: string[]): AcademyLesson | null {
  const wanted = new Set(keys.map(key => key.toLowerCase()));
  return ALL_LESSONS.find(lesson => !isPassed(state, lesson.id) && lesson.newKeys.some(key => wanted.has(key.toLowerCase()))) ?? null;
}

/** One plain sentence on what to work on next. */
export function nextStep({ accuracy, weak, finger }: { accuracy: number; weak: KeyFeedback[]; finger: FingerFeedback | null }) {
  const names = weak.slice(0, 2).map(item => item.key.toUpperCase());
  if (accuracy < 92) return `Accuracy was ${accuracy}%. Slow down a little: clean keystrokes build speed faster than corrections.`;
  if (names.length) return `${names.join(' and ')} cost you the most this run${finger ? `, mostly on your ${finger.finger}` : ''}. A short focused review will help.`;
  if (finger) return `Your ${finger.finger} was the slowest this run. Keep it relaxed and close to its home key.`;
  return 'A clean, even run. Try a longer test or turn on punctuation for a fresh challenge.';
}

/** A Speed run teaches the Academy's per-key statistics; practice minutes and lessons stay Academy-only. */
export function recordSpeedRun(state: AcademyState, stats: TypingStats, text: string, strict: boolean, now: number): AcademyState {
  return { ...state, keyStats: updateKeyStats(state.keyStats, stats, text, strict), updatedAt: now };
}

/** Records a Speed run in the saved Academy and returns the per-key history from before it. */
export async function applySpeedRun(stats: TypingStats, text: string, strict: boolean, now = Date.now()): Promise<{ before: KeyStats; state: AcademyState }> {
  const state = migrateAcademy(await db.academyState.get('academy'));
  const next = recordSpeedRun(state, stats, text, strict, now);
  await db.academyState.put(next);
  return { before: state.keyStats, state: next };
}

export interface RunAnalysis {
  weak: KeyFeedback[];
  finger: FingerFeedback | null;
  lesson: { id: string; title: string } | null;
  advice: string;
}

/**
 * Everything the results popup says about a run. `focusKeys` (a lesson's new keys) are listed first when they are
 * among the weak ones; `currentLessonId` is never suggested back to you.
 */
export function analyseRun({ stats, text, strict, before, state, focusKeys = [], currentLessonId }: {
  stats: TypingStats; text: string; strict: boolean; before: KeyStats; state: AcademyState; focusKeys?: string[]; currentLessonId?: string;
}): RunAnalysis {
  const run = runKeyStats(stats, text, strict);
  const focus = new Set(focusKeys.map(key => key.toLowerCase()));
  const weak = keyFeedback(run, before).sort((a, b) => Number(focus.has(b.key)) - Number(focus.has(a.key)));
  const finger = fingerFeedback(run);
  const found = suggestLesson(state, weak.map(item => item.key));
  return {
    weak, finger,
    lesson: found && found.id !== currentLessonId ? { id: found.id, title: found.title } : null,
    advice: nextStep({ accuracy: stats.accuracy, weak, finger })
  };
}
