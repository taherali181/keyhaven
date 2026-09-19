// Achievements on the profile, all worked out from what's already saved: nothing extra is stored, so they appear
// on every device once its data has synced.
import type { AcademyStateRecord, ArcadeScoreRecord, BookProgressRecord, TestResultRecord } from '@/types';
import { ALL_LESSONS } from '@/data/academy/units';

export type AchievementGroup = 'typing' | 'reading' | 'habit' | 'practice' | 'writing';

export interface Achievement {
  id: string;
  group: AchievementGroup;
  title: string;
  detail: string;
  current: number;
  target: number;
  earned: boolean;
}

export interface AchievementInput {
  results: TestResultRecord[];
  progress: BookProgressRecord[];
  scores: ArcadeScoreRecord[];
  academy: AcademyStateRecord | null;
  typingMinutes: number;
  readingMinutes: number;
  longestStreak: number;
  highlights: number;
  pieces: number;
  savedQuotes: number;
}

const ARCADE_GAME_COUNT = 6;
const kindOf = (record: BookProgressRecord) => record.kind ?? (record.bookId.startsWith('story:') ? 'story' : 'book');

export function achievements(input: AchievementInput): Achievement[] {
  const speed = input.results.filter(result => result.mode === 'speed-test');
  const bestSpeed = speed.reduce((best, result) => Math.max(best, result.wpm), 0);
  const cleanRun = input.results.some(result => result.accuracy >= 100 && (result.totalChars ?? 0) >= 100);
  const finished = input.progress.filter(record => record.finishedAt);
  const stories = finished.filter(record => kindOf(record) === 'story').length;
  const books = finished.filter(record => kindOf(record) !== 'story').length;
  const passed = Object.values(input.academy?.lessons ?? {}).filter(lesson => lesson.passedAt).length;
  const challenges = Object.values(input.academy?.challenges ?? {}).filter(result => result.passed).length;
  const gamesPlayed = new Set(input.scores.map(score => score.game)).size;
  const bestStreak = input.scores.filter(score => score.game === 'accuracy-streak').reduce((best, score) => Math.max(best, score.score), 0);

  const make = (id: string, group: AchievementGroup, title: string, detail: string, current: number, target: number): Achievement =>
    ({ id, group, title, detail, current: Math.min(current, target), target, earned: current >= target });

  return [
    make('first-keys', 'typing', 'First keys', 'Finish a typing test or passage.', input.results.length, 1),
    make('speed-40', 'typing', 'Quick fingers', 'Reach 40 wpm in a Speed test.', bestSpeed, 40),
    make('speed-60', 'typing', 'Swift', 'Reach 60 wpm in a Speed test.', bestSpeed, 60),
    make('speed-80', 'typing', 'Rapid', 'Reach 80 wpm in a Speed test.', bestSpeed, 80),
    make('speed-100', 'typing', 'Lightning', 'Reach 100 wpm in a Speed test.', bestSpeed, 100),
    make('clean-run', 'typing', 'Clean run', 'Type 100 characters or more without a single mistake.', cleanRun ? 1 : 0, 1),
    make('typing-hour', 'typing', 'An hour at the keys', 'Spend 60 minutes typing.', Math.floor(input.typingMinutes), 60),
    make('first-story', 'reading', 'Once upon a time', 'Finish a short story.', stories, 1),
    make('ten-stories', 'reading', 'Story collector', 'Finish ten short stories.', stories, 10),
    make('first-book', 'reading', 'Cover to cover', 'Finish a whole book.', books, 1),
    make('reading-hours', 'reading', 'Deep reader', 'Spend five hours reading.', Math.floor(input.readingMinutes), 300),
    make('highlighter', 'reading', 'Marginalia', 'Highlight ten passages.', input.highlights, 10),
    make('saved-quotes', 'reading', 'Commonplace book', 'Save ten quotes.', input.savedQuotes, 10),
    make('streak-7', 'habit', 'A good week', 'Practise or read seven days in a row.', input.longestStreak, 7),
    make('streak-30', 'habit', 'A month of mornings', 'Practise or read thirty days in a row.', input.longestStreak, 30),
    make('challenges-5', 'habit', 'Challenger', 'Pass five Academy daily challenges.', challenges, 5),
    make('lessons-5', 'practice', 'Apprentice', 'Pass five Academy lessons.', passed, 5),
    make('course', 'practice', 'Graduate', 'Pass every Academy lesson.', passed, ALL_LESSONS.length),
    make('arcade-all', 'practice', 'Arcade regular', 'Play every Arcade game.', gamesPlayed, ARCADE_GAME_COUNT),
    make('streak-25', 'practice', 'Steady hands', 'Type 25 words in Accuracy Streak without a mistake.', bestStreak, 25),
    make('first-piece', 'writing', 'Author', 'Write a piece of your own in Write.', input.pieces, 1)
  ];
}
