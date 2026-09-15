import { db } from '@/lib/db';
import type { TestResultRecord, TypingMode } from '@/types';

export interface AttemptSummary {
  /** Attempts in this scope, including the current one. */
  attempts: number;
  /** 1 is the fastest attempt in the scope. */
  rank: number;
  /** Beats every earlier attempt (never true for a first attempt). */
  isPersonalBest: boolean;
  bestWpm: number;
  /** Average of the last ten earlier attempts; null on a first attempt. */
  averageWpm: number | null;
  averageAccuracy: number | null;
  deltaWpm: number | null;
  /** Wpm of recent attempts, oldest first, ending with the current one. */
  trend: number[];
}

const AVERAGE_WINDOW = 10;

const sameRecord = (a: TestResultRecord, b: TestResultRecord) => a.clientId === b.clientId;
/** Faster wins; equal speed goes to the more accurate attempt. */
export const beats = (a: TestResultRecord, b: TestResultRecord) => a.wpm > b.wpm || (a.wpm === b.wpm && a.accuracy > b.accuracy);
const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;

/** Newest first. */
export const newestFirst = (records: TestResultRecord[]) => [...records].sort((a, b) => b.timestamp - a.timestamp);

export function recentTrend(records: TestResultRecord[], limit = 12) {
  return newestFirst(records).slice(0, limit).reverse().map(record => record.wpm);
}

/** How one attempt compares with the other attempts in its scope. `records` may include the attempt itself. */
export function summariseAttempt(current: TestResultRecord, records: TestResultRecord[]): AttemptSummary {
  const others = records.filter(record => !sameRecord(record, current));
  const earlier = newestFirst(others.filter(record => record.timestamp <= current.timestamp));
  const recent = earlier.slice(0, AVERAGE_WINDOW);
  const averageWpm = recent.length ? Math.round(mean(recent.map(record => record.wpm))) : null;
  const averageAccuracy = recent.length ? Math.round(mean(recent.map(record => record.accuracy))) : null;
  const all = [...others, current];
  return {
    attempts: all.length,
    rank: 1 + others.filter(record => beats(record, current)).length,
    isPersonalBest: earlier.length > 0 && earlier.every(record => beats(current, record)),
    bestWpm: Math.max(...all.map(record => record.wpm)),
    averageWpm,
    averageAccuracy,
    deltaWpm: averageWpm === null ? null : current.wpm - averageWpm,
    trend: recentTrend(all)
  };
}

/** Every saved result for these modes, newest first. */
export async function loadResults(modes: TypingMode[]) {
  return newestFirst(await db.testResults.where('mode').anyOf(modes).toArray());
}
