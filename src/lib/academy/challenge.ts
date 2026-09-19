// The Academy's daily challenge: one short passage a day, built around the keys that need work, with a target
// just above your usual pace. The same day and keys always give the same passage.
import type { TestResultRecord, TypingStats } from '@/types';
import { createRandom, wordDrill } from '@/lib/academy/generate';
import type { AcademyState } from '@/lib/academy/progress';

export interface DailyChallenge {
  day: string;
  keys: string[];
  target: { wpm: number; accuracy: number };
  text: string;
}

export interface ChallengeResult { wpm: number; accuracy: number; passed: boolean }

const DAY_MS = 86_400_000;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
/** Letters rotated through on days when no key stands out as weak. */
const ROTATION = ['e', 't', 'a', 'o', 'i', 'n', 's', 'r', 'h', 'l', 'd', 'c', 'u', 'm', 'w', 'f', 'g', 'y', 'p', 'b', 'v', 'k'];
export const CHALLENGE_ACCURACY = 96;
const MIN_WPM = 15;
const MAX_WPM = 120;
/** Challenge results older than this are dropped from the saved record. */
const KEEP_DAYS = 60;

/** Your usual pace: the median of your latest Academy and Speed results from the last two weeks. */
export function typicalWpm(results: TestResultRecord[], now: number) {
  const recent = results
    .filter(result => (result.mode === 'learn' || result.mode === 'speed-test') && result.timestamp >= now - 14 * DAY_MS && result.wpm > 0)
    .sort((a, b) => b.timestamp - a.timestamp).slice(0, 10).map(result => result.wpm).sort((a, b) => a - b);
  return recent.length ? recent[Math.floor(recent.length / 2)] : 0;
}

export function dailyChallenge(day: string, weak: string[], typical: number): DailyChallenge {
  const random = createRandom(`challenge:${day}`);
  const index = Math.floor(random() * ROTATION.length);
  const keys = weak.length ? weak.slice(0, 3) : [ROTATION[index], ROTATION[(index + 7) % ROTATION.length]];
  const wpm = Math.min(MAX_WPM, Math.max(MIN_WPM, typical ? Math.round(typical * 1.05) : 20));
  const text = wordDrill(keys, new Set([...LETTERS, "'", ';']), random, 28, { capitals: true, punctuation: keys.some(key => key === "'" || key === ';') }).replace(/;?$/, '.');
  return { day, keys, target: { wpm, accuracy: CHALLENGE_ACCURACY }, text };
}

export const challengePassed = (stats: Pick<TypingStats, 'wpm' | 'accuracy'>, challenge: Pick<DailyChallenge, 'target'>) =>
  stats.wpm >= challenge.target.wpm && stats.accuracy >= challenge.target.accuracy;

/** Keeps the day's best attempt (a pass beats any fail), and forgets challenges older than two months. */
export function recordChallenge(state: AcademyState, challenge: DailyChallenge, stats: Pick<TypingStats, 'wpm' | 'accuracy'>, now: number): AcademyState {
  const passed = challengePassed(stats, challenge);
  const previous = state.challenges?.[challenge.day];
  const better = !previous || (passed && !previous.passed) || (passed === previous.passed && stats.wpm > previous.wpm);
  const cutoff = new Date(now - KEEP_DAYS * DAY_MS).toISOString().slice(0, 10);
  const kept = Object.fromEntries(Object.entries(state.challenges ?? {}).filter(([day]) => day >= cutoff));
  return { ...state, challenges: { ...kept, [challenge.day]: better ? { wpm: stats.wpm, accuracy: stats.accuracy, passed } : previous }, updatedAt: now };
}

/** Days in a row, ending today or yesterday, with a passed challenge. */
export function challengeStreak(challenges: Record<string, ChallengeResult> | undefined, today: string) {
  const passed = new Set(Object.entries(challenges ?? {}).filter(([, result]) => result.passed).map(([day]) => day));
  const dayBefore = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
  let day = passed.has(today) ? today : dayBefore(today);
  let count = 0;
  while (passed.has(day)) { count++; day = dayBefore(day); }
  return count;
}
