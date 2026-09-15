'use client';

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { describeKey, VirtualKeyboardHeatmap } from '@/components/typing/VirtualKeyboardHeatmap';
import { unitOf } from '@/data/academy/units';
import type { AcademyLesson } from '@/lib/academy/types';
import type { AcademyState } from '@/lib/academy/progress';

export function LessonIntro({ lesson, academy, onStart, onBack }: { lesson: AcademyLesson; academy: AcademyState; onStart: () => void; onBack: () => void }) {
  const unit = unitOf(lesson.id);
  const number = (unit?.lessons.findIndex(item => item.id === lesson.id) ?? 0) + 1;
  const progress = academy.lessons[lesson.id];
  const resume = progress && !progress.passedAt && progress.stepIndex > 0 ? progress.stepIndex : 0;
  const keys = lesson.newKeys.filter(key => key.length === 1);
  const shift = lesson.newKeys.includes('Shift');

  return <section className="ac-shell ac-intro">
    <button type="button" className="ac-back" onClick={onBack}><ArrowLeft aria-hidden="true" />Course</button>
    <div className="ac-intro-head">
      <p className="eyebrow">{unit?.title ?? 'Course'} · Lesson {number}</p>
      <h1>{lesson.title}</h1>
      <p className="ac-intro-goal">{lesson.goal}</p>
    </div>

    {(keys.length > 0 || shift) && <div className="ac-card ac-intro-keys">
      <VirtualKeyboardHeatmap highlightKeys={lesson.newKeys} label={`Keyboard with this lesson's keys highlighted: ${lesson.newKeys.join(', ')}`} />
      <ul className="ac-key-list">
        {keys.map(key => <li key={key}><kbd>{describeKey(key)?.label ?? key}</kbd><span>{describeKey(key)?.finger}</span></li>)}
        {shift && <li><kbd>Shift</kbd><span>pinky of the hand not typing the letter</span></li>}
      </ul>
    </div>}

    <div className="ac-intro-grid">
      <section className="ac-card" aria-labelledby="ac-tips-title">
        <h2 id="ac-tips-title">Before you start</h2>
        <ul className="ac-tips">{lesson.tips.map(tip => <li key={tip}>{tip}</li>)}</ul>
      </section>
      <section className="ac-card" aria-labelledby="ac-steps-title">
        <h2 id="ac-steps-title">Steps</h2>
        <ol className="ac-step-list">
          {lesson.steps.map((step, index) => <li key={index} data-done={index < (progress?.stepIndex ?? 0) || undefined}>
            <span aria-hidden="true">{index + 1}</span>
            <strong>{step.title}</strong>
            {step.kind === 'checkpoint' && <small>{lesson.checkpoint.wpm} wpm at {lesson.checkpoint.accuracy}% accuracy unlocks the next lesson</small>}
          </li>)}
        </ol>
      </section>
    </div>

    <div className="ac-intro-actions">
      <button type="button" className="rs-btn is-primary ac-start" onClick={onStart}>{resume ? `Resume at step ${resume + 1}` : progress?.passedAt ? 'Practise again' : 'Start lesson'}<ArrowRight aria-hidden="true" /></button>
    </div>
  </section>;
}
