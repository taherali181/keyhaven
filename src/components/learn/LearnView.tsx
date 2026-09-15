'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { TestResultRecord, UserSettings } from '@/types';
import { createClientId, db } from '@/lib/db';
import { findLesson } from '@/data/academy/units';
import { recentErrorKeys, weakKeys } from '@/lib/academy/adaptive';
import { dailyPlan, migrateAcademy, type AcademyState } from '@/lib/academy/progress';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AcademyHome } from './AcademyHome';
import { CourseMap } from './CourseMap';
import { LessonIntro } from './LessonIntro';
import { LessonRun, PlacementRun, ReviewRun, type SavedResult } from './AcademySessions';

type UpdateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
type Screen =
  | { name: 'home' } | { name: 'course' }
  | { name: 'intro'; lessonId: string } | { name: 'lesson'; lessonId: string }
  | { name: 'review'; keys: string[] } | { name: 'placement' };

/** The Academy: today's plan and the course, guided lessons, adaptive reviews and the placement assessment. */
export const LearnView = ({ settings, onKeyPress, onUpdateSetting }: { settings: UserSettings; onKeyPress: (key: string) => void; onUpdateSetting: UpdateSetting }) => {
  const [academy, setAcademy] = useState<AcademyState | null>(null);
  const [results, setResults] = useState<TestResultRecord[]>([]);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [now, setNow] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([db.academyState.get('academy'), db.testResults.where('mode').anyOf(['learn', 'speed-test']).toArray()])
      .then(([saved, rows]) => { if (!cancelled) { setAcademy(migrateAcademy(saved)); setResults(rows); } })
      .catch(() => { if (!cancelled) setAcademy(migrateAcademy(null)); });
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 60_000);
    return () => { cancelled = true; window.clearTimeout(first); window.clearInterval(timer); };
  }, []);

  const weak = useMemo(() => (academy && now ? weakKeys(academy.keyStats, recentErrorKeys(results, now)) : []), [academy, results, now]);
  const plan = useMemo(() => (academy ? dailyPlan(academy, weak) : []), [academy, weak]);

  const save = (next: AcademyState, result?: SavedResult) => {
    setAcademy(next);
    void db.academyState.put(next);
    if (!result) return;
    const { stats } = result;
    const record: TestResultRecord = {
      clientId: createClientId(), mode: 'learn', subMode: result.subMode, title: result.title, wpm: stats.wpm, rawWpm: stats.rawWpm,
      accuracy: stats.accuracy, consistency: stats.consistency, duration: stats.timeElapsed, timestamp: Date.now(), errors: stats.incorrectChars,
      errorKeys: stats.errorHeatmap, totalChars: stats.totalChars, correctChars: stats.correctChars, incorrectChars: stats.incorrectChars
    };
    setResults(current => [...current, record]);
    void db.testResults.add(record);
  };

  if (!academy) return <section className="ac-shell" aria-busy="true" aria-label="Loading the Academy"><div className="skeleton ac-skeleton" /></section>;

  const session = { academy, settings, onKeyPress, onUpdateSetting, onSave: save, onExit: () => setScreen({ name: 'home' }) };
  const openIntro = (lessonId: string) => setScreen({ name: 'intro', lessonId });

  if (screen.name === 'intro' || screen.name === 'lesson') {
    const lesson = findLesson(screen.lessonId);
    if (lesson && screen.name === 'intro') return <LessonIntro lesson={lesson} academy={academy} onBack={() => setScreen({ name: 'course' })} onStart={() => setScreen({ name: 'lesson', lessonId: lesson.id })} />;
    if (lesson) return <LessonRun key={lesson.id} lesson={lesson} {...session} onOpenLesson={openIntro} />;
  }
  if (screen.name === 'review') return <ReviewRun keys={screen.keys} {...session} />;
  if (screen.name === 'placement') return <PlacementRun {...session} onStartLesson={openIntro} />;

  const tab = screen.name === 'course' ? 'course' : 'home';
  return <section className="ac-shell">
    <SectionHeader
      eyebrow="A calmer way to improve"
      title="Academy"
      tabs={[{ id: 'home', label: 'Today' }, { id: 'course', label: 'Course' }]}
      active={tab}
      onChange={id => setScreen(id === 'course' ? { name: 'course' } : { name: 'home' })}
      layoutId="academy-tab"
    />
    {tab === 'home'
      ? <AcademyHome
        academy={academy}
        plan={plan}
        now={now}
        onStartPlacement={() => setScreen({ name: 'placement' })}
        onPlan={item => (item.id === 'review' ? setScreen({ name: 'review', keys: item.keys ?? [] }) : item.lessonId && openIntro(item.lessonId))}
        onUpdateGoal={minutes => save({ ...academy, dailyGoalMinutes: minutes, updatedAt: Date.now() })}
      />
      : <CourseMap academy={academy} onOpenLesson={openIntro} />}
  </section>;
};
