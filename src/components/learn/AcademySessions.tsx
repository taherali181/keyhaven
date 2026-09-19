'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Keyboard, RotateCcw } from 'lucide-react';
import type { TypingStats, UserSettings } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LiveStatsBar } from '@/components/typing/LiveStatsBar';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { describeKey, VirtualKeyboardHeatmap } from '@/components/typing/VirtualKeyboardHeatmap';
import { UNITS, nextLessonAfter, unitOf } from '@/data/academy/units';
import type { AcademyLesson } from '@/lib/academy/types';
import { reviewText, stepText } from '@/lib/academy/generate';
import { PASSING_STEP_ACCURACY, PLACEMENT_PASSAGES, addMinutes, recordPlacement, recordStep, updateKeyStats, type AcademyState, type StepOutcome } from '@/lib/academy/progress';

type UpdateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
type StepState = 'done' | 'current' | 'todo';

export interface SavedResult { title: string; subMode: string; stats: TypingStats }

interface SessionProps {
  academy: AcademyState;
  settings: UserSettings;
  onKeyPress: (key: string) => void;
  onUpdateSetting: UpdateSetting;
  onSave: (next: AcademyState, result?: SavedResult) => void;
  onExit: () => void;
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}

/** The next key and finger, drawn on a keyboard that stays on screen while typing. */
function KeyGuide({ nextChar, focusKeys }: { nextChar: string; focusKeys: string[] }) {
  const next = describeKey(nextChar);
  return <div className="ac-guide">
    <VirtualKeyboardHeatmap activeKey={nextChar} highlightKeys={focusKeys} label={next ? `Keyboard guide. Next key ${next.label}, ${next.finger}` : 'Keyboard guide'} />
    <p className="ac-guide-caption" aria-hidden="true">{next ? <>Next <kbd>{next.label}</kbd> {next.finger}</> : 'All done'}</p>
  </div>;
}

function PracticeSession({ settings, onKeyPress, onUpdateSetting, eyebrow, title, subtitle, text, sessionKey, focusKeys, steps, onBack, onComplete, summary }: {
  settings: UserSettings; onKeyPress: (key: string) => void; onUpdateSetting: UpdateSetting;
  eyebrow: string; title: string; subtitle?: string; text: string; sessionKey: string; focusKeys: string[]; steps?: StepState[];
  onBack: () => void; onComplete: (stats: TypingStats) => void; summary?: React.ReactNode;
}) {
  const engine = useTypingEngine({ targetText: text, sessionKey, strictMode: settings.strictMode, onComplete, onKeyPress });
  const guideOn = settings.academyGuide !== 'off';
  const nextChar = engine.isFinished ? '' : text[engine.typed.length] ?? '';
  const current = steps ? steps.indexOf('current') : -1;

  return <section className="ac-shell ac-practice">
    <header className="ac-practice-header">
      <button type="button" className="ac-back" onClick={onBack}><ArrowLeft aria-hidden="true" />Academy</button>
      <div className="ac-practice-title">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {steps && <ol className="ac-steps" aria-label={`Step ${current + 1} of ${steps.length}`}>{steps.map((state, index) => <li key={index} data-state={state} />)}</ol>}
      </div>
      <button type="button" className="ac-guide-toggle" aria-pressed={guideOn} onClick={() => onUpdateSetting('academyGuide', guideOn ? 'off' : 'on')}><Keyboard aria-hidden="true" />Guide</button>
    </header>
    <TypingArea targetText={text} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font={settings.font} fontSize={settings.fontSize} wrapMode="whole-word" viewportLines={3} lineHeight={1.8} onKeyDown={engine.handleKeyDown} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={engine.handleCompositionEnd} onReset={() => engine.reset()} />
    {summary}
    {guideOn && <KeyGuide nextChar={nextChar} focusKeys={focusKeys} />}
    {!summary && <LiveStatsBar wpm={engine.wpm} accuracy={engine.accuracy} timeElapsed={engine.timeElapsed} onReset={() => engine.reset()} showLiveWpm={settings.showLiveWpm} showLiveAccuracy={settings.showLiveAccuracy} />}
  </section>;
}

function Summary({ eyebrow, stats, children, actions }: { eyebrow: string; stats: TypingStats; children: React.ReactNode; actions: React.ReactNode }) {
  return <div className="ac-summary" role="status">
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <strong>{stats.wpm} wpm · {stats.accuracy}%</strong>
      <p>{children}</p>
    </div>
    <div className="ac-summary-actions">{actions}</div>
  </div>;
}

export function LessonRun({ lesson, academy, settings, onKeyPress, onUpdateSetting, onSave, onExit, onOpenLesson }: SessionProps & { lesson: AcademyLesson; onOpenLesson: (id: string) => void }) {
  const last = lesson.steps.length - 1;
  const [stepIndex, setStepIndex] = useState(() => {
    const progress = academy.lessons[lesson.id];
    return progress && !progress.passedAt ? Math.min(progress.stepIndex, last) : 0;
  });
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<(StepOutcome & { stats: TypingStats }) | null>(null);
  const academyRef = useLatest(academy);
  const step = lesson.steps[stepIndex];
  const text = useMemo(() => stepText(lesson, stepIndex, attempt), [lesson, stepIndex, attempt]);
  const unit = unitOf(lesson.id);
  const next = nextLessonAfter(lesson.id);

  const complete = (stats: TypingStats) => {
    const result = recordStep(academyRef.current, lesson, stepIndex, stats, text, settings.strictMode, Date.now());
    onSave(result.state, { title: `${lesson.title} · ${step.title}`, subMode: lesson.title, stats });
    setOutcome({ ...result, stats });
  };
  const retry = () => { setOutcome(null); setAttempt(value => value + 1); };
  const advance = () => { setOutcome(null); setAttempt(0); setStepIndex(value => Math.min(last, value + 1)); };
  const checkpoint = outcome?.kind === 'checkpoint' ? outcome : null;
  const stepSummary = outcome?.kind === 'step'
    ? <Summary eyebrow="Step complete" stats={outcome.stats} actions={<>
      <button type="button" className={`rs-btn ${outcome.accuracyOk ? '' : 'is-primary'}`} onClick={retry}><RotateCcw aria-hidden="true" />Retry</button>
      <button type="button" className={`rs-btn ${outcome.accuracyOk ? 'is-primary' : ''}`} onClick={advance}>{lesson.steps[stepIndex + 1]?.kind === 'checkpoint' ? 'Go to the checkpoint' : 'Next step'}<ArrowRight aria-hidden="true" /></button>
    </>}>{outcome.accuracyOk ? 'Nicely done. Keep the same easy rhythm on the next step.' : `Aim for ${PASSING_STEP_ACCURACY}% accuracy before moving on. Slow down a little; speed follows accuracy.`}</Summary>
    : null;

  return <>
    <PracticeSession
      settings={settings} onKeyPress={onKeyPress} onUpdateSetting={onUpdateSetting}
      eyebrow={`${unit?.title ?? 'Course'} · Step ${stepIndex + 1} of ${lesson.steps.length}`}
      title={lesson.title}
      subtitle={step.kind === 'checkpoint' ? `Checkpoint · ${lesson.checkpoint.wpm} wpm at ${lesson.checkpoint.accuracy}% accuracy` : step.title}
      text={text}
      sessionKey={`${lesson.id}:${stepIndex}:${attempt}`}
      focusKeys={lesson.newKeys}
      steps={lesson.steps.map((_, index) => (index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'todo'))}
      onBack={onExit}
      onComplete={complete}
      summary={stepSummary}
    />
    <TestResultsModal
      stats={checkpoint?.stats ?? null}
      isOpen={Boolean(checkpoint)}
      title={checkpoint?.passed ? `Checkpoint passed · ${checkpoint.stars} of 3 stars` : `Not yet · aim for ${lesson.checkpoint.wpm} wpm at ${lesson.checkpoint.accuracy}%`}
      onRetry={retry}
      onNext={checkpoint?.passed ? () => (next ? onOpenLesson(next.id) : onExit()) : undefined}
    />
  </>;
}

export function ReviewRun({ keys, academy, settings, onKeyPress, onUpdateSetting, onSave, onExit }: SessionProps & { keys: string[] }) {
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState<TypingStats | null>(null);
  const academyRef = useLatest(academy);
  const text = useMemo(() => reviewText(keys, `review:${keys.join('')}:${attempt}`), [keys, attempt]);

  const complete = (stats: TypingStats) => {
    const state = academyRef.current;
    const now = Date.now();
    onSave({ ...state, keyStats: updateKeyStats(state.keyStats, stats, text, settings.strictMode), practiceLog: addMinutes(state.practiceLog, now, stats.timeElapsed / 60), updatedAt: now }, { title: 'Adaptive review', subMode: 'Review', stats });
    setDone(stats);
  };

  return <PracticeSession
    settings={settings} onKeyPress={onKeyPress} onUpdateSetting={onUpdateSetting}
    eyebrow="Adaptive review"
    title={keys.length ? `Focus on ${keys.map(key => key.toUpperCase()).join(' · ')}` : 'A steady rhythm'}
    subtitle={keys.length ? 'Words built around the keys that need attention' : 'Common words at an easy pace'}
    text={text}
    sessionKey={`review:${attempt}`}
    focusKeys={keys}
    onBack={onExit}
    onComplete={complete}
    summary={done ? <Summary eyebrow="Review complete" stats={done} actions={<>
      <button type="button" className="rs-btn" onClick={onExit}>Back to the plan</button>
      <button type="button" className="rs-btn is-primary" onClick={() => { setDone(null); setAttempt(value => value + 1); }}><RotateCcw aria-hidden="true" />Another review</button>
    </>}>Every review updates how confident each key looks on your Academy page.</Summary> : null}
  />;
}

export function PlacementRun({ academy, settings, onKeyPress, onUpdateSetting, onSave, onExit, onStartLesson }: SessionProps & { onStartLesson: (id: string) => void }) {
  const [index, setIndex] = useState(0);
  const [runs, setRuns] = useState<Array<{ stats: TypingStats; text: string }>>([]);
  const [placed, setPlaced] = useState<AcademyState | null>(null);
  const academyRef = useLatest(academy);
  const passage = PLACEMENT_PASSAGES[index];

  const complete = (stats: TypingStats) => {
    const all = [...runs, { stats, text: passage.text }];
    setRuns(all);
    const result = { title: `Placement · ${passage.title}`, subMode: 'Placement', stats };
    if (all.length < PLACEMENT_PASSAGES.length) { onSave(academyRef.current, result); return; }
    const next = recordPlacement(academyRef.current, all, settings.strictMode, Date.now());
    onSave(next, result);
    setPlaced(next);
  };

  if (placed) {
    const unit = UNITS.find(item => item.id === placed.placementUnitId) ?? UNITS[0];
    const wpm = Math.round(runs.reduce((total, run) => total + run.stats.wpm, 0) / Math.max(1, runs.length));
    const accuracy = Math.round(runs.reduce((total, run) => total + run.stats.accuracy, 0) / Math.max(1, runs.length));
    return <section className="ac-shell ac-practice">
      <button type="button" className="ac-back" onClick={onExit}><ArrowLeft aria-hidden="true" />Academy</button>
      <div className="ac-summary is-final" role="status">
        <p className="eyebrow">Placement complete</p>
        <h2>Start with {unit.title.toLowerCase()}</h2>
        <p>You averaged {wpm} wpm at {accuracy}% accuracy. {unit.id === UNITS[0].id ? 'The course starts right at the basics.' : 'Earlier units are unlocked whenever you want a refresher.'}</p>
        <div className="ac-summary-actions">
          <button type="button" className="rs-btn is-primary" onClick={() => onStartLesson(unit.lessons[0].id)}>Start {unit.lessons[0].title}<ArrowRight aria-hidden="true" /></button>
          {unit.id !== UNITS[0].id && <button type="button" className="rs-btn" onClick={() => { onSave({ ...placed, currentLessonId: UNITS[0].lessons[0].id, updatedAt: Date.now() }); onStartLesson(UNITS[0].lessons[0].id); }}>Start from the beginning</button>}
        </div>
      </div>
    </section>;
  }

  const between = runs.length > index;
  return <PracticeSession
    settings={settings} onKeyPress={onKeyPress} onUpdateSetting={onUpdateSetting}
    eyebrow={`Placement · Passage ${index + 1} of ${PLACEMENT_PASSAGES.length}`}
    title="Find your starting point"
    subtitle={passage.title}
    text={passage.text}
    sessionKey={`placement:${index}`}
    focusKeys={[]}
    steps={PLACEMENT_PASSAGES.map((_, item) => (item < index ? 'done' : item === index ? 'current' : 'todo'))}
    onBack={onExit}
    onComplete={complete}
    summary={between ? <Summary eyebrow={`Passage ${index + 1} done`} stats={runs[index].stats} actions={<button type="button" className="rs-btn is-primary" onClick={() => setIndex(value => value + 1)}>Next passage<ArrowRight aria-hidden="true" /></button>}>Take a breath. The next passage is a little harder.</Summary> : null}
  />;
}
