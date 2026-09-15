// Academy progress: migration from the original record, unlocking, checkpoints and stars, per-key statistics,
// the daily practice log, placement, and the daily plan. Pure functions over the saved record.
import type { AcademyKeyStat, AcademyLessonProgress, AcademyStateRecord, TypingStats } from '@/types';
import { ALL_LESSONS, UNITS, findLesson, lessonByLegacyId } from '@/data/academy/units';
import type { AcademyLesson } from '@/lib/academy/types';
import { localDay, streaks } from '@/lib/profile-stats';

export type AcademyState = AcademyStateRecord & {
  version: 2;
  lessons: Record<string, AcademyLessonProgress>;
  keyStats: Record<string, AcademyKeyStat>;
  practiceLog: Record<string, number>;
};

/** Ordinary steps can always move on, but below this accuracy the summary suggests a retry. */
export const PASSING_STEP_ACCURACY = 85;
const DEFAULT_GOAL_MINUTES = 10;
/** Keystrokes slower than this are pauses, not typing speed. */
const MAX_KEY_MS = 2000;

export function initialAcademy(): AcademyState {
  return { id: 'academy', version: 2, placementComplete: false, currentLessonId: ALL_LESSONS[0].id, lessons: {}, keyStats: {}, practiceLog: {}, dailyGoalMinutes: DEFAULT_GOAL_MINUTES, updatedAt: 0 };
}

export const lessonIndex = (id: string) => ALL_LESSONS.findIndex(lesson => lesson.id === id);
export const isPassed = (state: AcademyState, id: string) => Boolean(state.lessons[id]?.passedAt);

export function isUnlocked(state: AcademyState, id: string) {
  const index = lessonIndex(id);
  if (index < 0) return false;
  if (index === 0 || isPassed(state, id) || (state.lessons[id]?.stepIndex ?? 0) > 0) return true;
  if (isPassed(state, ALL_LESSONS[index - 1].id)) return true;
  if (state.placementUnitId) {
    const placementUnit = UNITS.findIndex(unit => unit.id === state.placementUnitId);
    const lessonUnit = UNITS.findIndex(unit => unit.id === ALL_LESSONS[index].unitId);
    if (lessonUnit < placementUnit) return true;
    if (lessonUnit === placementUnit && UNITS[placementUnit].lessons[0].id === id) return true;
  }
  return false;
}

export function nextLessonId(state: AcademyState) {
  return ALL_LESSONS.find(lesson => !isPassed(state, lesson.id) && isUnlocked(state, lesson.id))?.id ?? ALL_LESSONS[ALL_LESSONS.length - 1].id;
}

/** Converts the original 12-lesson record (mastery percentages, practice dates) to the current shape. */
export function migrateAcademy(record?: AcademyStateRecord | null): AcademyState {
  if (!record) return initialAcademy();
  const state: AcademyState = {
    ...initialAcademy(), ...record, id: 'academy', version: 2,
    lessons: { ...(record.lessons ?? {}) }, keyStats: { ...(record.keyStats ?? {}) }, practiceLog: { ...(record.practiceLog ?? {}) },
    dailyGoalMinutes: record.dailyGoalMinutes || DEFAULT_GOAL_MINUTES
  };
  if (record.version !== 2) {
    for (const [legacyId, mastery] of Object.entries(record.mastery ?? {})) {
      const lesson = lessonByLegacyId(legacyId);
      if (!lesson || state.lessons[lesson.id]) continue;
      const passed = mastery >= 82;
      state.lessons[lesson.id] = { stepIndex: passed ? lesson.steps.length : 0, bestWpm: 0, bestAccuracy: Math.round(mastery), stars: passed ? 1 : 0, attempts: 1, ...(passed ? { passedAt: record.updatedAt || 1 } : {}) };
    }
    const dates = record.practiceDates ?? [];
    const perDay = dates.length ? Math.max(1, Math.round((record.totalMinutes ?? 0) / dates.length)) : 0;
    for (const day of dates) state.practiceLog[day] = Math.max(state.practiceLog[day] ?? 0, perDay);
    state.currentLessonId = lessonByLegacyId(record.currentLessonId)?.id ?? nextLessonId(state);
    delete state.mastery;
    delete state.completedExercises;
    delete state.practiceDates;
    delete state.totalMinutes;
    delete state.weeklyGoalMinutes;
  }
  if (!findLesson(state.currentLessonId)) state.currentLessonId = nextLessonId(state);
  return state;
}

export function addMinutes(log: Record<string, number>, now: number, minutes: number) {
  const day = localDay(now);
  return { ...log, [day]: Math.round(((log[day] ?? 0) + Math.max(0, minutes)) * 100) / 100 };
}

export const minutesToday = (state: AcademyState, now: number) => state.practiceLog[localDay(now)] ?? 0;
export const academyStreak = (state: AcademyState, now: number) => streaks(Object.entries(state.practiceLog).filter(([, minutes]) => minutes > 0).map(([day]) => day), now);

/**
 * Per-key hits, misses and a moving average of keystroke time, from one session. Keystrokes are matched to the
 * text they were aimed at: a correct key advances, and so does a wrong one unless strict mode kept it back.
 */
export function updateKeyStats(keyStats: Record<string, AcademyKeyStat>, stats: TypingStats, text: string, strict: boolean) {
  const next = { ...keyStats };
  let position = 0;
  for (const timing of stats.charTimings) {
    const expected = text[position];
    if (expected === undefined) break;
    const key = expected.toLowerCase();
    if (key.trim()) {
      const current = next[key] ?? { hits: 0, misses: 0, avgMs: 0 };
      if (timing.isCorrect) {
        const usable = timing.durationMs > 0 && timing.durationMs < MAX_KEY_MS;
        next[key] = { ...current, hits: current.hits + 1, avgMs: usable ? Math.round(current.avgMs ? current.avgMs * 0.8 + timing.durationMs * 0.2 : timing.durationMs) : current.avgMs };
      } else {
        next[key] = { ...current, misses: current.misses + 1 };
      }
    }
    if (timing.isCorrect || !strict) position += 1;
  }
  return next;
}

export function starsFor(lesson: AcademyLesson, wpm: number, accuracy: number): 0 | 1 | 2 | 3 {
  const { wpm: target, accuracy: needed } = lesson.checkpoint;
  if (wpm < target || accuracy < needed) return 0;
  if (wpm >= target * 1.5 && accuracy >= Math.max(needed, 98)) return 3;
  if (wpm >= target * 1.25 && accuracy >= needed + 2) return 2;
  return 1;
}

export interface StepOutcome { state: AcademyState; kind: 'step' | 'checkpoint'; passed: boolean; stars: 0 | 1 | 2 | 3; accuracyOk: boolean }

export function recordStep(state: AcademyState, lesson: AcademyLesson, stepIndex: number, stats: TypingStats, text: string, strict: boolean, now: number): StepOutcome {
  const step = lesson.steps[stepIndex];
  const previous: AcademyLessonProgress = state.lessons[lesson.id] ?? { stepIndex: 0, bestWpm: 0, bestAccuracy: 0, stars: 0, attempts: 0 };
  const isCheckpoint = step?.kind === 'checkpoint';
  const stars = isCheckpoint ? starsFor(lesson, stats.wpm, stats.accuracy) : 0;
  const passed = stars > 0;
  const progress: AcademyLessonProgress = {
    ...previous,
    attempts: previous.attempts + 1,
    stepIndex: isCheckpoint ? (passed ? lesson.steps.length : previous.stepIndex) : Math.max(previous.stepIndex, stepIndex + 1),
    bestWpm: isCheckpoint ? Math.max(previous.bestWpm, stats.wpm) : previous.bestWpm,
    bestAccuracy: isCheckpoint ? Math.max(previous.bestAccuracy, stats.accuracy) : previous.bestAccuracy,
    stars: Math.max(previous.stars, stars) as 0 | 1 | 2 | 3,
    passedAt: previous.passedAt ?? (passed ? now : undefined),
    failedAt: isCheckpoint ? (passed ? undefined : now) : previous.failedAt
  };
  const next: AcademyState = {
    ...state,
    lessons: { ...state.lessons, [lesson.id]: progress },
    keyStats: updateKeyStats(state.keyStats, stats, text, strict),
    practiceLog: addMinutes(state.practiceLog, now, stats.timeElapsed / 60),
    updatedAt: now
  };
  next.currentLessonId = passed ? nextLessonId(next) : lesson.id;
  return { state: next, kind: isCheckpoint ? 'checkpoint' : 'step', passed, stars, accuracyOk: stats.accuracy >= PASSING_STEP_ACCURACY };
}

// ── Placement ──

export const PLACEMENT_PASSAGES = [
  { title: 'Home row words', text: 'a sad lad had a flask; dad asks all lads as salad falls' },
  { title: 'Every letter', text: 'quiet water moves past the brown fox as seven jumping kids wave from a busy bridge' },
  { title: 'Sentences', text: 'The morning was calm, and Mara wrote quickly. "Keep going," she said, "the words will follow."' }
];

export function placementUnit(runs: Array<Pick<TypingStats, 'wpm' | 'accuracy'>>) {
  if (!runs.length) return UNITS[0].id;
  const wpm = runs.reduce((total, run) => total + run.wpm, 0) / runs.length;
  const accuracy = runs.reduce((total, run) => total + run.accuracy, 0) / runs.length;
  const sentences = runs[runs.length - 1];
  if (wpm < 18 || accuracy < 88) return 'home-row';
  if (wpm < 25) return 'top-row';
  if (wpm < 32) return 'bottom-row';
  if (sentences.accuracy < 92 || sentences.wpm < 30) return 'shift';
  if (wpm < 45) return 'rhythm';
  return 'prose';
}

export function recordPlacement(state: AcademyState, runs: Array<{ stats: TypingStats; text: string }>, strict: boolean, now: number): AcademyState {
  let keyStats = state.keyStats;
  let practiceLog = state.practiceLog;
  for (const run of runs) {
    keyStats = updateKeyStats(keyStats, run.stats, run.text, strict);
    practiceLog = addMinutes(practiceLog, now, run.stats.timeElapsed / 60);
  }
  const unit = UNITS.find(item => item.id === placementUnit(runs.map(run => run.stats))) ?? UNITS[0];
  return { ...state, placementComplete: true, placementUnitId: unit.id, currentLessonId: unit.lessons[0].id, keyStats, practiceLog, updatedAt: now };
}

// ── Daily plan ──

export interface PlanItem { id: 'continue' | 'review' | 'retry'; label: string; title: string; detail: string; lessonId?: string; keys?: string[] }

export function dailyPlan(state: AcademyState, weak: string[]): PlanItem[] {
  const current = findLesson(state.currentLessonId);
  const lesson = current && !isPassed(state, current.id) ? current : findLesson(nextLessonId(state)) ?? ALL_LESSONS[0];
  const progress = state.lessons[lesson.id];
  const allPassed = ALL_LESSONS.every(item => isPassed(state, item.id));
  const started = !allPassed && (progress?.stepIndex ?? 0) > 0;
  const step = Math.min(progress?.stepIndex ?? 0, lesson.steps.length - 1);
  const items: PlanItem[] = [{
    id: 'continue', lessonId: lesson.id, title: lesson.title,
    label: allPassed ? 'Keep sharp' : started ? 'Continue learning' : 'Next lesson',
    detail: allPassed ? 'Every checkpoint is passed. Practise again for more stars.' : started ? `Step ${step + 1} of ${lesson.steps.length} · ${lesson.steps[step].title}` : lesson.goal
  }, {
    id: 'review', label: 'Adaptive review', keys: weak,
    title: weak.length ? `Focus on ${weak.map(key => key.toUpperCase()).join(' · ')}` : 'Build a steady rhythm',
    detail: weak.length ? 'Words built around the keys that slow you down or trip you up.' : 'Common words at an easy pace. Your weakest keys appear here as you practise.'
  }];
  const failed = ALL_LESSONS
    .filter(item => item.id !== lesson.id && !isPassed(state, item.id) && state.lessons[item.id]?.failedAt)
    .sort((a, b) => (state.lessons[b.id]?.failedAt ?? 0) - (state.lessons[a.id]?.failedAt ?? 0))[0];
  if (failed) items.push({ id: 'retry', label: 'Checkpoint retry', title: failed.title, detail: `Needs ${failed.checkpoint.wpm} wpm at ${failed.checkpoint.accuracy}% accuracy.`, lessonId: failed.id });
  return items;
}
