import { describe, expect, it } from 'vitest';
import { achievements, type AchievementInput } from '@/lib/achievements';
import type { TestResultRecord } from '@/types';

const base: AchievementInput = { results: [], progress: [], scores: [], academy: null, typingMinutes: 0, readingMinutes: 0, longestStreak: 0, highlights: 0, pieces: 0, savedQuotes: 0 };
const speed = (wpm: number, accuracy = 95, totalChars = 150): TestResultRecord => ({ clientId: String(wpm), mode: 'speed-test', subMode: '30s', wpm, rawWpm: wpm, accuracy, consistency: 80, duration: 30, timestamp: 1, errors: 0, errorKeys: {}, totalChars, correctChars: totalChars, incorrectChars: 0 });
const find = (list: ReturnType<typeof achievements>, id: string) => list.find(item => item.id === id)!;

describe('achievements', () => {
  it('start with nothing earned', () => {
    expect(achievements(base).filter(item => item.earned)).toEqual([]);
  });

  it('are earned from saved results, with progress capped at the target', () => {
    const list = achievements({ ...base, results: [speed(64), speed(30, 100, 120)], longestStreak: 9, pieces: 2, highlights: 4 });
    expect(find(list, 'first-keys').earned).toBe(true);
    expect(find(list, 'speed-60').earned).toBe(true);
    expect(find(list, 'speed-80')).toMatchObject({ earned: false, current: 64, target: 80 });
    expect(find(list, 'clean-run').earned).toBe(true);
    expect(find(list, 'streak-7')).toMatchObject({ earned: true, current: 7 });
    expect(find(list, 'first-piece').earned).toBe(true);
    expect(find(list, 'highlighter')).toMatchObject({ earned: false, current: 4 });
  });

  it('count stories and books separately, and arcade games by kind', () => {
    const list = achievements({
      ...base,
      progress: [
        { bookId: 'story:a', kind: 'story', chapterIndex: 0, charOffset: 0, totalWordsTyped: 0, percent: 100, lastRead: 1, finishedAt: 1 },
        { bookId: 'pg:1', kind: 'book', chapterIndex: 0, charOffset: 0, totalWordsTyped: 0, percent: 100, lastRead: 1, finishedAt: 1 }
      ],
      scores: [{ clientId: 'x', game: 'accuracy-streak', score: 30, wpm: 40, accuracy: 99, timeMs: 1, timestamp: 1 }]
    });
    expect(find(list, 'first-story').earned).toBe(true);
    expect(find(list, 'first-book').earned).toBe(true);
    expect(find(list, 'streak-25').earned).toBe(true);
    expect(find(list, 'arcade-all')).toMatchObject({ current: 1, earned: false });
  });
});
