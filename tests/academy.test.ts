import { describe, expect, it } from 'vitest';
import { ALL_LESSONS, UNITS, findLesson } from '@/data/academy/units';
import { createRandom, reviewText, stepText } from '@/lib/academy/generate';
import { confidenceMap, recentErrorKeys, weakKeys } from '@/lib/academy/adaptive';
import { dailyPlan, initialAcademy, isUnlocked, migrateAcademy, placementUnit, recordPlacement, recordStep, starsFor, updateKeyStats } from '@/lib/academy/progress';
import { describeKey, locateChar } from '@/components/typing/VirtualKeyboardHeatmap';
import type { TestResultRecord, TypingStats } from '@/types';

const stats = (overrides: Partial<TypingStats> = {}): TypingStats => ({
  wpm: 40, rawWpm: 42, accuracy: 98, consistency: 80, timeElapsed: 60, totalChars: 200, correctChars: 196, incorrectChars: 4,
  extraChars: 0, missedChars: 0, charTimings: [], errorHeatmap: {}, history: [], evidence: [], ...overrides
});

describe('academy course', () => {
  it('has ten units, unique lessons, one Endurance lesson and a checkpoint ending every lesson', () => {
    expect(UNITS).toHaveLength(10);
    expect(new Set(ALL_LESSONS.map(lesson => lesson.id)).size).toBe(ALL_LESSONS.length);
    expect(ALL_LESSONS.filter(lesson => /Endurance/.test(`${lesson.title} ${lesson.goal}`))).toHaveLength(1);
    for (const lesson of ALL_LESSONS) expect(lesson.steps[lesson.steps.length - 1].kind, lesson.id).toBe('checkpoint');
  });

  it('maps every lesson of the original course', () => {
    for (let number = 1; number <= 12; number += 1) expect(ALL_LESSONS.some(lesson => lesson.legacyIds?.includes(`lesson-${number}`)), `lesson-${number}`).toBe(true);
  });
});

describe('academy drills', () => {
  it('only uses keys that have been taught in the letter units', () => {
    for (const unit of UNITS.slice(0, 3)) {
      for (const lesson of unit.lessons) {
        const allowed = new Set([...lesson.keys, ' ']);
        lesson.steps.forEach((_, index) => {
          const text = stepText(lesson, index, 0);
          expect(text.length, `${lesson.id}:${index}`).toBeGreaterThan(20);
          const stray = [...text].filter(character => !allowed.has(character));
          expect(stray, `${lesson.id}:${index}`).toEqual([]);
        });
      }
    }
  });

  it('repeats for the same attempt and changes on a retry', () => {
    const lesson = findLesson('top-2')!;
    expect(stepText(lesson, 2, 0)).toBe(stepText(lesson, 2, 0));
    expect(stepText(lesson, 2, 1)).not.toBe(stepText(lesson, 2, 0));
    expect(createRandom('seed')()).toBe(createRandom('seed')());
  });

  it('builds reviews mostly from words with the weak keys', () => {
    const words = reviewText(['q', 'z'], 'review').split(' ');
    expect(words.filter(word => /[qz]/.test(word)).length).toBeGreaterThan(words.length / 2);
  });
});

describe('academy progress', () => {
  it('unlocks lessons in order, or from a placement', () => {
    const state = initialAcademy();
    expect(isUnlocked(state, 'home-1')).toBe(true);
    expect(isUnlocked(state, 'home-2')).toBe(false);
    const placed = { ...state, placementComplete: true, placementUnitId: 'bottom-row' };
    expect(isUnlocked(placed, 'top-3')).toBe(true);
    expect(isUnlocked(placed, 'bottom-1')).toBe(true);
    expect(isUnlocked(placed, 'bottom-2')).toBe(false);
  });

  it('passes a checkpoint, awards stars and moves on to the next lesson', () => {
    const lesson = findLesson('home-1')!;
    const checkpoint = lesson.steps.length - 1;
    const failed = recordStep(initialAcademy(), lesson, checkpoint, stats({ wpm: 5, accuracy: 99 }), 'fj', false, 10);
    expect(failed.passed).toBe(false);
    expect(failed.state.lessons['home-1'].failedAt).toBe(10);
    expect(isUnlocked(failed.state, 'home-2')).toBe(false);
    const passed = recordStep(failed.state, lesson, checkpoint, stats({ wpm: 30, accuracy: 99 }), 'fj', false, 20);
    expect(passed).toMatchObject({ passed: true, stars: 3 });
    expect(passed.state.lessons['home-1']).toMatchObject({ passedAt: 20, failedAt: undefined, stepIndex: lesson.steps.length });
    expect(passed.state.currentLessonId).toBe('home-2');
    expect(isUnlocked(passed.state, 'home-2')).toBe(true);
    expect(starsFor(lesson, lesson.checkpoint.wpm, lesson.checkpoint.accuracy)).toBe(1);
  });

  it('moves ordinary steps forward and logs practice minutes by local day', () => {
    const outcome = recordStep(initialAcademy(), findLesson('home-1')!, 0, stats({ accuracy: 80, timeElapsed: 90 }), 'fj', false, new Date(2026, 0, 5, 9).getTime());
    expect(outcome.state.lessons['home-1'].stepIndex).toBe(1);
    expect(outcome.accuracyOk).toBe(false);
    expect(outcome.state.practiceLog['2026-01-05']).toBe(1.5);
  });

  it('learns per-key speed and misses from keystrokes', () => {
    const timings = [
      { char: 'f', timestamp: 0, durationMs: 0, isCorrect: true },
      { char: 'k', timestamp: 200, durationMs: 200, isCorrect: false },
      { char: 'd', timestamp: 500, durationMs: 300, isCorrect: true }
    ];
    const keys = updateKeyStats({}, stats({ charTimings: timings }), 'fjd', false);
    expect(keys).toEqual({ f: { hits: 1, misses: 0, avgMs: 0 }, j: { hits: 0, misses: 1, avgMs: 0 }, d: { hits: 1, misses: 0, avgMs: 300 } });
    const strict = updateKeyStats({}, stats({ charTimings: [timings[1], { char: 'f', timestamp: 600, durationMs: 400, isCorrect: true }] }), 'fj', true);
    expect(strict).toEqual({ f: { hits: 1, misses: 1, avgMs: 400 } });
  });

  it('upgrades a record from the original course', () => {
    const state = migrateAcademy({ id: 'academy', placementComplete: true, currentLessonId: 'lesson-3', completedExercises: ['lesson-1:0'], mastery: { 'lesson-1': 90, 'lesson-2': 60 }, dailyGoalMinutes: 15, weeklyGoalMinutes: 60, practiceDates: ['2026-01-02'], totalMinutes: 12, updatedAt: 5 });
    expect(state.version).toBe(2);
    expect(state.lessons['home-1'].passedAt).toBe(5);
    expect(state.lessons['home-2'].passedAt).toBeUndefined();
    expect(state.currentLessonId).toBe('top-1');
    expect(state.practiceLog['2026-01-02']).toBe(12);
    expect(state.dailyGoalMinutes).toBe(15);
    expect(state.mastery).toBeUndefined();
  });

  it('places by speed and plans reviews around the weakest keys', () => {
    expect(placementUnit([{ wpm: 12, accuracy: 95 }])).toBe('home-row');
    expect(placementUnit([{ wpm: 50, accuracy: 97 }, { wpm: 52, accuracy: 97 }, { wpm: 48, accuracy: 96 }])).toBe('prose');
    const placed = recordPlacement(initialAcademy(), [{ stats: stats({ wpm: 28, accuracy: 95 }), text: 'ab' }], false, 1);
    expect(placed).toMatchObject({ placementComplete: true, placementUnitId: 'bottom-row', currentLessonId: 'bottom-1' });

    const keyStats = { e: { hits: 90, misses: 30, avgMs: 180 }, t: { hits: 100, misses: 1, avgMs: 170 }, q: { hits: 20, misses: 1, avgMs: 520 }, a: { hits: 3, misses: 3, avgMs: 0 } };
    const weak = weakKeys(keyStats, {});
    expect(weak).toEqual(['q', 'e']);
    const plan = dailyPlan(placed, weak);
    expect(plan.map(item => item.id)).toEqual(['continue', 'review']);
    expect(plan[1].title).toBe('Focus on Q · E');
    expect(confidenceMap(keyStats).t).toBeGreaterThan(confidenceMap(keyStats).e);

    const results = [{ mode: 'learn', timestamp: 100, errorKeys: { R: 3, ' ': 9 } }, { mode: 'quotes', timestamp: 100, errorKeys: { x: 5 } }] as unknown as TestResultRecord[];
    expect(recentErrorKeys(results, 200)).toEqual({ r: 3 });
  });
});

describe('keyboard guide', () => {
  it('finds keys, fingers and the opposite Shift', () => {
    expect(describeKey('e')).toEqual({ label: 'E', finger: 'left middle finger' });
    expect(describeKey('K')).toEqual({ label: 'K', finger: 'right middle finger with left Shift' });
    expect(locateChar('?')?.shiftId).toBe('ShiftLeft');
    expect(describeKey(' ')?.label).toBe('Space');
  });
});
