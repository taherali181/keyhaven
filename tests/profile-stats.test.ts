import { describe, expect, it } from 'vitest';
import {
  activityByDay, calendarWeeks, compactNumber, formatMinutes, lifetimeErrors, localDay, modeBreakdown, personalBests, problemKeys,
  readerLevel, readingSummary, streaks, typingSummary
} from '@/lib/profile-stats';
import { ReadingSessionTracker } from '@/lib/reading-session';
import type { BookProgressRecord, ReadingSessionRecord, TestResultRecord } from '@/types';

const at = (year: number, month: number, day: number, hour = 12, minute = 0) => new Date(year, month - 1, day, hour, minute).getTime();
const result = (overrides: Partial<TestResultRecord>): TestResultRecord => ({
  clientId: crypto.randomUUID(), mode: 'speed-test', subMode: '30s', wpm: 60, rawWpm: 62, accuracy: 95, consistency: 80,
  duration: 30, timestamp: at(2026, 1, 10), errors: 0, errorKeys: {}, ...overrides
});
const session = (overrides: Partial<ReadingSessionRecord>): ReadingSessionRecord => ({
  clientId: crypto.randomUUID(), workKey: 'story:a', kind: 'story', title: 'A', author: 'B', mode: 'read', startedAt: at(2026, 1, 13),
  durationMs: 600_000, words: 2500, pages: 10, ...overrides
});
const progress = (overrides: Partial<BookProgressRecord>): BookProgressRecord => ({
  bookId: 'story:a', chapterIndex: 0, charOffset: 0, percent: 30, totalWordsTyped: 0, lastRead: at(2026, 1, 12), ...overrides
});

describe('profile streaks and calendar', () => {
  it('counts days by the local calendar, across midnight', () => {
    const now = at(2026, 1, 10, 0, 20);
    expect(streaks([localDay(at(2026, 1, 9, 23, 50)), localDay(at(2026, 1, 10, 0, 5))], now).current).toBe(2);
  });

  it('keeps yesterday’s streak alive until today ends and remembers the longest run', () => {
    const now = at(2026, 1, 10, 9);
    expect(streaks(['2026-01-08', '2026-01-09'], now).current).toBe(2);
    expect(streaks(['2026-01-07'], now).current).toBe(0);
    expect(streaks(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-07'], now).longest).toBe(3);
  });

  it('lays out whole Monday-first weeks ending with this week', () => {
    const days = activityByDay([result({ duration: 1200, timestamp: at(2026, 1, 10, 8) })], [session({ startedAt: at(2026, 1, 10, 20), durationMs: 720_000 })]);
    const weeks = calendarWeeks(days, at(2026, 1, 10, 15));
    expect(weeks).toHaveLength(26);
    expect(weeks.every(week => week.length === 7)).toBe(true);
    expect(new Date(weeks[0][0].start).getDay()).toBe(1);
    const cells = weeks.flat();
    const today = cells.find(cell => cell.day === '2026-01-10')!;
    expect(today).toMatchObject({ typingMinutes: 20, readingMinutes: 12, minutes: 32, level: 4, future: false });
    expect(cells.find(cell => cell.day === '2026-01-11')?.future).toBe(true);
  });
});

describe('profile typing stats', () => {
  const results = [
    result({ wpm: 60, correctChars: 150, timestamp: at(2026, 1, 9) }),
    result({ wpm: 80, accuracy: 97, correctChars: 200, timestamp: at(2026, 1, 10) }),
    result({ wpm: 80, accuracy: 93, subMode: '30s', correctChars: 200, timestamp: at(2026, 1, 8) }),
    result({ mode: 'quotes', subMode: 'Stoicism', wpm: 50, duration: 90, correctChars: 300 })
  ];

  it('summarises speed, time and words', () => {
    const summary = typingSummary(results);
    expect(summary).toMatchObject({ sessions: 4, bestWpm: 80, averageWpm: 68, minutes: 3, wordsTyped: 170 });
  });

  it('picks the fastest run per test, breaking ties by accuracy', () => {
    const thirty = personalBests(results).find(row => row.config === '30s')!;
    expect(thirty.attempts).toBe(3);
    expect(thirty.best).toMatchObject({ wpm: 80, accuracy: 97 });
    expect(personalBests(results).find(row => row.config === '60s')).toMatchObject({ attempts: 0, best: null });
  });

  it('orders sections by time spent and merges key mistakes', () => {
    expect(modeBreakdown(results).map(row => row.mode)).toEqual(['speed-test', 'quotes']);
    const errors = lifetimeErrors([result({ errorKeys: { A: 2, a: 1, ' ': 5, t: 1 } })]);
    expect(problemKeys(errors)).toEqual([{ key: 'a', count: 3 }, { key: 't', count: 1 }]);
  });
});

describe('profile reading stats', () => {
  it('measures reading time, speed and this week against last week', () => {
    const now = at(2026, 1, 14);
    const summary = readingSummary(
      [session({}), session({ startedAt: at(2026, 1, 8), durationMs: 300_000, words: 1000 }), session({ mode: 'type', durationMs: 900_000, words: 400 })],
      [progress({ bookId: 'pg:1', kind: 'book', author: 'Jane Austen', percent: 55, lastRead: at(2026, 1, 13) }), progress({ author: 'Jane Austen', lastRead: at(2026, 1, 12) }), progress({ bookId: 'story:b', finishedAt: at(2026, 1, 11), percent: 100 })],
      [{ key: 'pg:2', kind: 'book', title: 'C', author: 'D', want: true, addedAt: 1, updatedAt: 1 }],
      now
    );
    expect(summary.minutes).toBe(15);
    expect(summary.words).toBe(3900);
    expect(summary.averageWpm).toBe(233);
    expect(summary.thisWeekMinutes).toBe(10);
    expect(summary.lastWeekMinutes).toBe(5);
    expect(summary.currentlyReading.map(record => record.bookId)).toEqual(['pg:1', 'story:a']);
    expect(summary).toMatchObject({ storiesFinished: 1, booksFinished: 0, wantToRead: 1 });
    expect(summary.topAuthors[0]).toEqual({ author: 'Jane Austen', works: 2 });
  });

  it('assigns reader levels by words', () => {
    expect(readerLevel(0).title).toBe('Newcomer');
    expect(readerLevel(6000)).toMatchObject({ level: 2, title: 'Page turner', progress: 0.5 });
    expect(readerLevel(10_000).title).toBe('Reader');
    expect(readerLevel(5_000_000)).toMatchObject({ next: null, progress: 1 });
  });

  it('formats numbers compactly', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(0.4)).toBe('<1 min');
    expect(formatMinutes(75)).toBe('1.3 h');
    expect(compactNumber(1234)).toBe('1.2k');
    expect(compactNumber(56_000)).toBe('56k');
  });
});

describe('reading session tracker', () => {
  it('credits active time between interactions, but not idle gaps or big jumps', () => {
    const tracker = new ReadingSessionTracker();
    tracker.touch(0, 0, 0);
    tracker.touch(40_000, 300, 1);
    tracker.touch(100_000, 600, 2);
    tracker.touch(400_000, 900, 3);
    tracker.touch(410_000, 5000, 4);
    expect(tracker.flush(420_000)).toEqual({ startedAt: 0, durationMs: 120_000, words: 900, pages: 4 });
  });

  it('drops visits that are too short or had no interaction', () => {
    const short = new ReadingSessionTracker();
    short.touch(0, 0, 0);
    short.touch(5_000, 100, 0);
    expect(short.flush(8_000)).toBeNull();
    const untouched = new ReadingSessionTracker();
    untouched.touch(0, 0, 0);
    expect(untouched.flush(60_000)).toBeNull();
  });

  it('gives no credit for the time after the last interaction when the reader went idle', () => {
    const tracker = new ReadingSessionTracker();
    tracker.touch(0, 0, 0);
    tracker.touch(20_000, 200, 1);
    expect(tracker.flush(200_000, { idle: true })).toMatchObject({ durationMs: 20_000, words: 200, pages: 1 });
  });
});
