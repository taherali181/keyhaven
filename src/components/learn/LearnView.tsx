'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, ChevronRight, Keyboard, Target } from 'lucide-react';
import { LESSONS } from '@/data/lessons';
import { AcademyStateRecord, Lesson, TypingStats, UserSettings } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LiveStatsBar } from '@/components/typing/LiveStatsBar';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { VirtualKeyboardHeatmap } from '@/components/typing/VirtualKeyboardHeatmap';
import { createClientId, db } from '@/lib/db';

const placementText = 'Calm hands create steady rhythm. Accuracy comes first, then confidence, then speed. Keep your eyes on the words and let each finger return home.';
const initialState: AcademyStateRecord = { id: 'academy', placementComplete: false, currentLessonId: LESSONS[0].id, completedExercises: [], mastery: {}, dailyGoalMinutes: 10, weeklyGoalMinutes: 60, practiceDates: [], totalMinutes: 0, updatedAt: 0 };

export const LearnView = ({ settings, onKeyPress }: { settings: UserSettings; onKeyPress: (key: string) => void }) => {
  const [academy, setAcademy] = useState(initialState);
  const [screen, setScreen] = useState<'plan' | 'course' | 'practice'>('plan');
  const [lessonId, setLessonId] = useState(LESSONS[0].id);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [placement, setPlacement] = useState(false);
  const [weakKeys, setWeakKeys] = useState<string[]>([]);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [result, setResult] = useState<TypingStats | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  useEffect(() => { void Promise.all([db.academyState.get('academy'), db.testResults.toArray()]).then(([saved, records]) => {
    if (saved) { setAcademy(saved); setLessonId(saved.currentLessonId); }
    const errors: Record<string, number> = {}; records.forEach(record => Object.entries(record.errorKeys ?? {}).forEach(([key, count]) => { errors[key] = (errors[key] ?? 0) + count; }));
    setWeakKeys(Object.entries(errors).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([key]) => key));
  }); }, []);

  const lesson = LESSONS.find(item => item.id === lessonId) ?? LESSONS[0];
  const drill = useMemo(() => {
    const keys = weakKeys.length ? weakKeys : lesson.targetKeys;
    return Array.from({ length: 18 }, () => Array.from({ length: 4 }, () => keys[Math.floor(Math.random() * keys.length)] ?? 'f').join('')).join(' ');
  }, [lesson, weakKeys]);
  const targetText = placement ? placementText : exerciseIndex === -1 ? drill : lesson.exercises[exerciseIndex] ?? lesson.exercises[0];
  const today = new Date().toISOString().slice(0, 10);
  const streak = useMemo(() => {
    const days = new Set(academy.practiceDates); let count = 0; const cursor = new Date();
    while (days.has(cursor.toISOString().slice(0, 10))) { count += 1; cursor.setDate(cursor.getDate() - 1); }
    return count;
  }, [academy.practiceDates]);
  const suggestedIndex = Math.max(0, LESSONS.findIndex(item => (academy.mastery[item.id] ?? 0) < 82));
  const suggested = LESSONS[suggestedIndex] ?? LESSONS[LESSONS.length - 1];

  const saveAcademy = (next: AcademyStateRecord) => { setAcademy(next); void db.academyState.put(next).then(() => window.dispatchEvent(new Event('keyhaven:sync'))); };
  const complete = (stats: TypingStats) => {
    setResult(stats); setResultOpen(true);
    const mastery = Math.min(100, Math.round(stats.accuracy * .7 + Math.min(80, stats.wpm) / 80 * 30));
    const exerciseKey = placement ? 'placement' : `${lesson.id}:${exerciseIndex}`;
    const next: AcademyStateRecord = { ...academy, placementComplete: academy.placementComplete || placement, currentLessonId: placement ? (stats.wpm >= 45 && stats.accuracy >= 94 ? LESSONS[Math.min(5, LESSONS.length - 1)].id : LESSONS[Math.min(2, LESSONS.length - 1)].id) : lesson.id, completedExercises: [...new Set([...academy.completedExercises, exerciseKey])], mastery: placement ? academy.mastery : { ...academy.mastery, [lesson.id]: Math.max(academy.mastery[lesson.id] ?? 0, mastery) }, practiceDates: [...new Set([...academy.practiceDates, today])], totalMinutes: academy.totalMinutes + stats.timeElapsed / 60, updatedAt: Date.now() };
    saveAcademy(next);
    void db.testResults.add({ clientId: createClientId(), mode: 'learn', subMode: placement ? 'Placement' : lesson.title, title: placement ? 'Academy placement' : `${lesson.title} · ${exerciseIndex === -1 ? 'Adaptive drill' : `Exercise ${exerciseIndex + 1}`}`, wpm: stats.wpm, rawWpm: stats.rawWpm, accuracy: stats.accuracy, consistency: stats.consistency, duration: stats.timeElapsed, timestamp: Date.now(), errors: stats.incorrectChars, errorKeys: stats.errorHeatmap, totalChars: stats.totalChars, correctChars: stats.correctChars, incorrectChars: stats.incorrectChars });
  };
  const engine = useTypingEngine({ targetText, sessionKey: `${placement}-${lesson.id}-${exerciseIndex}-${targetText}`, strictMode: settings.strictMode, onComplete: complete, onKeyPress });
  const start = (nextLesson: Lesson, index = 0) => { setLessonId(nextLesson.id); setExerciseIndex(index); setPlacement(false); setScreen('practice'); setResultOpen(false); engine.reset(); };

  if (screen === 'practice') return <section className="academy-shell practice"><header className="practice-header"><button onClick={() => { setScreen('plan'); setResultOpen(false); }}><ArrowLeft />Academy</button><div><p className="eyebrow">{placement ? 'Placement assessment' : exerciseIndex === -1 ? 'Adaptive weak-key drill' : `Lesson ${lesson.tier}`}</p><h1>{placement ? 'Find your starting point' : exerciseIndex === -1 ? 'Strengthen weak keys' : lesson.title}</h1></div><button onClick={() => setKeyboardOpen(value => !value)}><Keyboard />Guide</button></header>
    <TypingArea targetText={targetText} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font="jetbrains" fontSize="lg" wrapMode="whole-word" viewportLines={3} lineHeight={1.8} onKeyDown={engine.handleKeyDown} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={engine.handleCompositionEnd} onReset={() => engine.reset()} />
    {keyboardOpen && !engine.isActive && <div className="academy-keyboard"><VirtualKeyboardHeatmap activeKey={targetText[engine.typed.length] ?? ''} highlightKeys={placement ? [] : exerciseIndex === -1 ? weakKeys : lesson.targetKeys} showFingers /></div>}
    <LiveStatsBar wpm={engine.wpm} accuracy={engine.accuracy} timeElapsed={engine.timeElapsed} onReset={() => engine.reset()} showLiveWpm={settings.showLiveWpm} showLiveAccuracy={settings.showLiveAccuracy} />
    <TestResultsModal stats={result} isOpen={resultOpen} title={placement ? 'Placement complete' : lesson.title} onRetry={() => { setResultOpen(false); engine.reset(); }} onNext={() => { setResultOpen(false); setScreen('plan'); }} />
  </section>;

  return <section className="academy-shell"><header className="section-header academy-title"><div><p className="eyebrow">A calmer way to improve</p><h1>Academy</h1></div><nav><button className={screen === 'plan' ? 'active' : ''} onClick={() => setScreen('plan')}>Today</button><button className={screen === 'course' ? 'active' : ''} onClick={() => setScreen('course')}>Course</button></nav></header>
    {!academy.placementComplete && <button className="placement-callout" onClick={() => { setPlacement(true); setScreen('practice'); engine.reset(); }}><span><small>Begin here</small><strong>Take the placement assessment</strong><em>A short passage sets your starting point.</em></span><ChevronRight /></button>}
    {screen === 'plan' ? <div className="academy-plan"><div className="academy-summary"><div><CalendarDays /><span><strong>{streak}</strong><small>day streak</small></span></div><div><Target /><span><strong>{academy.dailyGoalMinutes}m</strong><small>daily goal</small></span></div><div><Check /><span><strong>{academy.completedExercises.length}</strong><small>sessions</small></span></div></div>
      <div className="daily-plan"><header><div><p className="eyebrow">Today</p><h2>Your practice plan</h2></div><span>About {academy.dailyGoalMinutes} minutes</span></header><button onClick={() => start(suggested)}><span><small>Continue learning</small><strong>{suggested.title}</strong><em>{suggested.description}</em></span><ChevronRight /></button><button onClick={() => start(lesson, -1)}><span><small>Adaptive review</small><strong>{weakKeys.length ? `Focus on ${weakKeys.join(' · ').toUpperCase()}` : 'Build reliable rhythm'}</strong><em>Generated from your recent accuracy patterns.</em></span><ChevronRight /></button></div>
    </div> : <div className="course-list">{LESSONS.map((item, index) => { const mastery = academy.mastery[item.id] ?? 0; const unlocked = index === 0 || academy.placementComplete || (academy.mastery[LESSONS[index - 1].id] ?? 0) >= 70; return <button key={item.id} disabled={!unlocked} onClick={() => start(item)}><span className="course-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><em>{unlocked ? `${mastery}%` : 'Locked'}</em></button>; })}</div>}
  </section>;
};
