import { describe, expect, it } from 'vitest';
import { beats, recentTrend, summariseAttempt } from '@/lib/result-history';
import type { TestResultRecord } from '@/types';

let counter = 0;
const record = (wpm: number, accuracy: number, timestamp: number): TestResultRecord => ({
  clientId: `r${counter++}`, mode: 'quotes', subMode: 'All', wpm, rawWpm: wpm, accuracy, consistency: 80,
  duration: 20, timestamp, errors: 0, errorKeys: {}
});

describe('result history', () => {
  it('breaks equal speed ties on accuracy', () => {
    expect(beats(record(60, 98, 1), record(60, 95, 2))).toBe(true);
    expect(beats(record(60, 95, 1), record(60, 95, 2))).toBe(false);
  });

  it('treats a first attempt as neither a best nor comparable', () => {
    const current = record(50, 97, 10);
    const summary = summariseAttempt(current, [current]);
    expect(summary).toMatchObject({ attempts: 1, rank: 1, isPersonalBest: false, averageWpm: null, deltaWpm: null, trend: [50] });
  });

  it('flags a new personal best and compares with earlier attempts only', () => {
    const earlier = [record(40, 90, 1), record(50, 95, 2)];
    const later = record(90, 99, 20);
    const current = record(55, 96, 10);
    const summary = summariseAttempt(current, [...earlier, later, current]);
    expect(summary.isPersonalBest).toBe(true);
    expect(summary.averageWpm).toBe(45);
    expect(summary.deltaWpm).toBe(10);
    expect(summary.rank).toBe(2);
    expect(summary.bestWpm).toBe(90);
    expect(summary.attempts).toBe(4);
  });

  it('averages only the last ten earlier attempts', () => {
    const earlier = [record(10, 90, 0), ...Array.from({ length: 10 }, (_, index) => record(60, 90, index + 1))];
    const summary = summariseAttempt(record(61, 90, 50), earlier);
    expect(summary.averageWpm).toBe(60);
  });

  it('orders the trend oldest first and keeps the newest attempts', () => {
    const records = [record(30, 90, 3), record(10, 90, 1), record(20, 90, 2)];
    expect(recentTrend(records)).toEqual([10, 20, 30]);
    expect(recentTrend(records, 2)).toEqual([20, 30]);
  });
});
