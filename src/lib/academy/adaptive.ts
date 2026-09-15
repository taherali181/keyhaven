// Which keys need attention, from the Academy's per-key statistics and recent typing mistakes.
import type { AcademyKeyStat, TestResultRecord } from '@/types';

const TRACKABLE = /^[a-z,.;'?!]$/;
const MIN_ATTEMPTS = 8;
const DAY_MS = 86_400_000;

/** Mistakes per key from Academy and speed-test results in the last month. */
export function recentErrorKeys(results: TestResultRecord[], now: number, days = 30) {
  const since = now - days * DAY_MS;
  const totals: Record<string, number> = {};
  for (const result of results) {
    if ((result.mode !== 'learn' && result.mode !== 'speed-test') || result.timestamp < since) continue;
    for (const [key, count] of Object.entries(result.errorKeys ?? {})) {
      const normalized = key.toLowerCase();
      if (TRACKABLE.test(normalized) && Number.isFinite(count)) totals[normalized] = (totals[normalized] ?? 0) + count;
    }
  }
  return totals;
}

/** Keys ranked by how often they're missed and how much slower they are than the typist's usual key. */
export function weakKeys(keyStats: Record<string, AcademyKeyStat>, recentErrors: Record<string, number>, limit = 4) {
  const speeds = Object.values(keyStats).filter(stat => stat.hits >= 5 && stat.avgMs > 0).map(stat => stat.avgMs).sort((a, b) => a - b);
  const median = speeds[Math.floor(speeds.length / 2)] ?? 0;
  const scores = new Map<string, number>();
  for (const [key, stat] of Object.entries(keyStats)) {
    const attempts = stat.hits + stat.misses;
    if (!TRACKABLE.test(key) || attempts < MIN_ATTEMPTS) continue;
    const slowness = median && stat.hits >= 5 && stat.avgMs > 0 ? Math.max(0, stat.avgMs / median - 1) : 0;
    scores.set(key, (stat.misses / attempts) * 3 + slowness);
  }
  for (const [key, count] of Object.entries(recentErrors)) {
    if (TRACKABLE.test(key)) scores.set(key, (scores.get(key) ?? 0) + Math.min(1, count / 20));
  }
  return [...scores].filter(([, score]) => score > 0.15).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([key]) => key);
}

/** 0–1 per practised key: accurate and quick keys approach 1. */
export function confidenceMap(keyStats: Record<string, AcademyKeyStat>) {
  const confidence: Record<string, number> = {};
  for (const [key, stat] of Object.entries(keyStats)) {
    const attempts = stat.hits + stat.misses;
    if (attempts < 5) continue;
    const accuracy = stat.hits / attempts;
    const speed = stat.avgMs > 0 ? Math.min(1, Math.max(0, 1 - (stat.avgMs - 150) / 600)) : 0.5;
    confidence[key] = Math.round(accuracy * accuracy * (0.5 + 0.5 * speed) * 100) / 100;
  }
  return confidence;
}
