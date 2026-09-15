'use client';

import React, { useMemo } from 'react';
import { ChevronRight, Compass, Flame, Minus, Plus, Trophy } from 'lucide-react';
import { VirtualKeyboardHeatmap } from '@/components/typing/VirtualKeyboardHeatmap';
import { Ring, Stat } from '@/components/profile/ProfileBits';
import { ALL_LESSONS } from '@/data/academy/units';
import { confidenceMap } from '@/lib/academy/adaptive';
import { academyStreak, isPassed, minutesToday, type AcademyState, type PlanItem } from '@/lib/academy/progress';

const GOAL_STEP = 5;
const GOAL_MAX = 120;

export function AcademyHome({ academy, plan, now, onStartPlacement, onPlan, onUpdateGoal }: {
  academy: AcademyState;
  plan: PlanItem[];
  now: number;
  onStartPlacement: () => void;
  onPlan: (item: PlanItem) => void;
  onUpdateGoal: (minutes: number) => void;
}) {
  const confidence = useMemo(() => confidenceMap(academy.keyStats), [academy.keyStats]);
  const streak = academyStreak(academy, now);
  const today = minutesToday(academy, now);
  const passed = ALL_LESSONS.filter(lesson => isPassed(academy, lesson.id)).length;
  const goal = academy.dailyGoalMinutes;

  return <div className="ac-home">
    {!academy.placementComplete && <button type="button" className="ac-callout" onClick={onStartPlacement}>
      <span className="ac-callout-icon" aria-hidden="true"><Compass /></span>
      <span><small>Begin here</small><strong>Take the placement assessment</strong><em>Three short passages find the right starting point. About two minutes.</em></span>
      <ChevronRight aria-hidden="true" />
    </button>}

    <div className="ac-home-grid">
      <section className="ac-card ac-plan" aria-labelledby="ac-plan-title">
        <header><p className="eyebrow">Today</p><h2 id="ac-plan-title">Your practice plan</h2><span>About {goal} minutes</span></header>
        <ol className="ac-plan-list">
          {plan.map((item, index) => <li key={item.id}>
            <button type="button" className="ac-plan-item" onClick={() => onPlan(item)}>
              <span className="ac-plan-index" aria-hidden="true">{index + 1}</span>
              <span className="ac-plan-text"><small>{item.label}</small><strong>{item.title}</strong><em>{item.detail}</em></span>
              <ChevronRight aria-hidden="true" />
            </button>
          </li>)}
        </ol>
      </section>

      <section className="ac-card ac-today" aria-labelledby="ac-today-title">
        <header><p className="eyebrow">Progress</p><h2 id="ac-today-title">Today</h2></header>
        <Ring value={today} goal={goal} label="Practice" />
        <div className="profile-stepper" role="group" aria-label="Daily goal">
          <button type="button" aria-label="Lower the daily goal" disabled={goal <= GOAL_STEP} onClick={() => onUpdateGoal(goal - GOAL_STEP)}><Minus aria-hidden="true" /></button>
          <output>{goal} min goal</output>
          <button type="button" aria-label="Raise the daily goal" disabled={goal >= GOAL_MAX} onClick={() => onUpdateGoal(goal + GOAL_STEP)}><Plus aria-hidden="true" /></button>
        </div>
        <div className="ac-today-stats">
          <Stat icon={<Flame aria-hidden="true" />} label="Streak" value={streak.current} sub={`Longest ${streak.longest}`} />
          <Stat icon={<Trophy aria-hidden="true" />} label="Passed" value={`${passed}/${ALL_LESSONS.length}`} sub="lessons" />
        </div>
      </section>
    </div>

    <section className="ac-card ac-confidence" aria-labelledby="ac-confidence-title">
      <header><p className="eyebrow">Key confidence</p><h2 id="ac-confidence-title">How each key feels</h2><span>{Object.keys(confidence).length ? 'Brighter keys are quicker and more accurate' : 'Keys light up as you practise'}</span></header>
      <VirtualKeyboardHeatmap confidence={confidence} showFingers={false} label="Key confidence keyboard" />
    </section>
  </div>;
}
