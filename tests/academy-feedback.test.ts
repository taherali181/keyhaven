import { describe, expect, it } from 'vitest';
import type { CharTiming, TypingStats } from '@/types';
import { ALL_LESSONS } from '@/data/academy/units';
import { initialAcademy } from '@/lib/academy/progress';
import { analyseRun, fingerFeedback, keyFeedback, recordSpeedRun, runKeyStats, suggestLesson } from '@/lib/academy/feedback';

/** A run over `text` where the keys in `miss` are typed wrong once each time and `slow` keys take 600 ms. */
function run(text: string, { miss = '', slow = '' }: { miss?: string; slow?: string } = {}): TypingStats {
  const charTimings: CharTiming[] = [];
  for (const char of text) {
    if (miss.includes(char)) charTimings.push({ char: '#', timestamp: 0, durationMs: 200, isCorrect: false });
    charTimings.push({ char, timestamp: 0, durationMs: slow.includes(char) ? 600 : 200, isCorrect: true });
  }
  return { wpm: 60, rawWpm: 62, accuracy: 96, consistency: 80, timeElapsed: 30, totalChars: text.length, correctChars: text.length, incorrectChars: 0, extraChars: 0, missedChars: 0, charTimings, errorHeatmap: {}, history: [], evidence: [] };
}

const TEXT = 'the rat sat on the mat and the cat ran at the rat '.repeat(2);

describe('run feedback', () => {
  it('counts presses, misses and average time per key for one run', () => {
    const stats = runKeyStats(run('aab', { miss: 'b', slow: 'a' }), 'aab', false);
    expect(stats.a).toEqual({ hits: 2, misses: 0, avgMs: 600 });
    // Not strict: a wrong key still moves on, so the miss is followed by the next expected key.
    expect(stats.b?.misses).toBe(1);
  });

  it('ranks missed and slow keys and compares them with their history', () => {
    const current = runKeyStats(run(TEXT, { miss: 'r', slow: 'n' }), TEXT, true);
    const before = { r: { hits: 100, misses: 0, avgMs: 200 }, n: { hits: 100, misses: 0, avgMs: 600 } };
    const weak = keyFeedback(current, before);
    // N is three times slower than the other keys, which outweighs R being missed half the time.
    expect(weak.slice(0, 2).map(item => item.key)).toEqual(['n', 'r']);
    expect(weak.find(item => item.key === 'r')?.trend).toBe('worse');
    expect(weak.find(item => item.key === 'n')?.trend).toBe('steady');
    expect(keyFeedback(current, {}).every(item => item.trend === 'new')).toBe(true);
    // Keys that were neither missed nor slow are left out.
    expect(weak.some(item => item.key === 'e')).toBe(false);
  });

  it('calls a key better when it beats its history', () => {
    const current = runKeyStats(run(TEXT, { slow: 'n' }), TEXT, true);
    const weak = keyFeedback(current, { n: { hits: 100, misses: 40, avgMs: 1200 } });
    expect(weak.find(item => item.key === 'n')?.trend).toBe('better');
  });

  it('finds the finger that cost the most', () => {
    const current = runKeyStats(run(TEXT, { miss: 'r' }), TEXT, true);
    expect(fingerFeedback(current)?.finger).toBe('left index finger');
    expect(fingerFeedback(runKeyStats(run(TEXT), TEXT, true))).toBeNull();
  });

  it('suggests the first unpassed lesson that teaches a weak key', () => {
    const state = initialAcademy();
    const lesson = ALL_LESSONS.find(item => item.newKeys.includes('r'))!;
    expect(suggestLesson(state, ['r'])?.id).toBe(lesson.id);
    state.lessons[lesson.id] = { stepIndex: lesson.steps.length, bestWpm: 40, bestAccuracy: 98, stars: 2, attempts: 1, passedAt: 1 };
    expect(suggestLesson(state, ['r'])?.id).not.toBe(lesson.id);
  });

  it('never suggests the lesson you are already in, and lists its keys first', () => {
    const lesson = ALL_LESSONS.find(item => item.newKeys.includes('r'))!;
    const stats = run(TEXT, { miss: 'rn' });
    const analysis = analyseRun({ stats, text: TEXT, strict: true, before: {}, state: initialAcademy(), focusKeys: ['n'], currentLessonId: lesson.id });
    expect(analysis.weak[0].key).toBe('n');
    expect(analysis.lesson?.id).not.toBe(lesson.id);
    expect(analysis.advice).toMatch(/N and R|R and N/);
    expect(analysis.advice).not.toContain('[object');
  });

  it('teaches the Academy from a Speed run without counting practice minutes', () => {
    const state = initialAcademy();
    const next = recordSpeedRun(state, run(TEXT, { miss: 'r' }), TEXT, true, 1000);
    expect(next.keyStats.r.misses).toBeGreaterThan(0);
    expect(next.practiceLog).toEqual(state.practiceLog);
    expect(next.updatedAt).toBe(1000);
  });
});
