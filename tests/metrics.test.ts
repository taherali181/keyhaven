import { describe, expect, it } from 'vitest';
import { calculateAccuracy, calculateConsistency, calculateRawWPM, calculateWPM } from '@/lib/metrics';

describe('typing metrics', () => {
  it('uses the standard five-character word', () => {
    expect(calculateWPM(300, 60)).toBe(60);
    expect(calculateRawWPM(150, 30)).toBe(60);
  });
  it('bounds and rounds accuracy', () => {
    expect(calculateAccuracy(95, 100)).toBe(95);
    expect(calculateAccuracy(0, 0)).toBe(100);
  });
  it('recognizes a consistent pace', () => {
    expect(calculateConsistency([79, 80, 81, 80].map((wpm, index) => ({ second: index + 1, wpm, rawWpm: wpm, errors: 0 })))).toBeGreaterThanOrEqual(95);
  });
});
