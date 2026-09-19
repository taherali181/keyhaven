import { describe, expect, it } from 'vitest';
import { challengePassed, challengeStreak, dailyChallenge, recordChallenge, typicalWpm } from '@/lib/academy/challenge';
import { initialAcademy } from '@/lib/academy/progress';
import type { TestResultRecord } from '@/types';

const result = (wpm: number, timestamp: number, mode: TestResultRecord['mode'] = 'learn'): TestResultRecord => ({ clientId: `${wpm}-${timestamp}`, mode, subMode: '', wpm, rawWpm: wpm, accuracy: 97, consistency: 80, duration: 30, timestamp, errors: 0, errorKeys: {}, totalChars: 1, correctChars: 1, incorrectChars: 0 });

describe('academy daily challenge', () => {
  it('is the same passage for the same day and keys, and different the next day', () => {
    const a = dailyChallenge('2026-09-19', ['q', 'z'], 40);
    expect(dailyChallenge('2026-09-19', ['q', 'z'], 40)).toEqual(a);
    expect(dailyChallenge('2026-09-20', ['q', 'z'], 40).text).not.toBe(a.text);
    expect(a.keys).toEqual(['q', 'z']);
    expect(a.target).toEqual({ wpm: 42, accuracy: 96 });
    expect(a.text).toMatch(/\.$/);
  });

  it('picks rotating letters when no key is weak, and a gentle target for a new typist', () => {
    const challenge = dailyChallenge('2026-09-19', [], 0);
    expect(challenge.keys).toHaveLength(2);
    expect(challenge.target.wpm).toBe(20);
  });

  it('takes the usual pace from recent Academy and Speed results only', () => {
    const now = Date.UTC(2026, 8, 19);
    expect(typicalWpm([result(30, now - 1000), result(50, now - 2000), result(40, now - 3000), result(99, now - 1000, 'quotes'), result(10, now - 30 * 86_400_000)], now)).toBe(40);
    expect(typicalWpm([], now)).toBe(0);
  });

  it('keeps the best attempt of the day, a pass before any fail', () => {
    const challenge = dailyChallenge('2026-09-19', ['e'], 40);
    const now = Date.UTC(2026, 8, 19, 12);
    let state = recordChallenge(initialAcademy(), challenge, { wpm: 60, accuracy: 90 }, now);
    expect(state.challenges?.['2026-09-19']).toEqual({ wpm: 60, accuracy: 90, passed: false });
    state = recordChallenge(state, challenge, { wpm: 43, accuracy: 97 }, now);
    expect(state.challenges?.['2026-09-19']).toEqual({ wpm: 43, accuracy: 97, passed: true });
    state = recordChallenge(state, challenge, { wpm: 70, accuracy: 80 }, now);
    expect(state.challenges?.['2026-09-19'].passed).toBe(true);
    expect(challengePassed({ wpm: 42, accuracy: 96 }, challenge)).toBe(true);
  });

  it('counts a streak of passed days ending today or yesterday', () => {
    const passed = { wpm: 40, accuracy: 97, passed: true };
    const challenges = { '2026-09-17': passed, '2026-09-18': passed, '2026-09-16': { ...passed, passed: false } };
    expect(challengeStreak(challenges, '2026-09-19')).toBe(2);
    expect(challengeStreak({ ...challenges, '2026-09-19': passed }, '2026-09-19')).toBe(3);
    expect(challengeStreak(challenges, '2026-09-21')).toBe(0);
  });
});
