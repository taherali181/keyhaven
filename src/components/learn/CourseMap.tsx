'use client';

import React from 'react';
import { Lock, Star } from 'lucide-react';
import { UNITS } from '@/data/academy/units';
import { isPassed, isUnlocked, type AcademyState } from '@/lib/academy/progress';

function Stars({ count }: { count: number }) {
  return <span className="ac-stars" aria-label={`${count} of 3 stars`}>
    {[0, 1, 2].map(index => <Star key={index} aria-hidden="true" data-earned={index < count || undefined} />)}
  </span>;
}

export function CourseMap({ academy, onOpenLesson }: { academy: AcademyState; onOpenLesson: (id: string) => void }) {
  return <div className="ac-course">
    {UNITS.map((unit, unitIndex) => {
      const passedCount = unit.lessons.filter(lesson => isPassed(academy, lesson.id)).length;
      return <section key={unit.id} className="ac-unit" aria-labelledby={`ac-unit-${unit.id}`}>
        <header className="ac-unit-header">
          <span className="ac-unit-number" aria-hidden="true">{String(unitIndex + 1).padStart(2, '0')}</span>
          <div><h2 id={`ac-unit-${unit.id}`}>{unit.title}</h2><p>{unit.summary}</p></div>
          <span className="ac-unit-progress">{passedCount}/{unit.lessons.length} passed</span>
        </header>
        <div className="ac-lessons">
          {unit.lessons.map(lesson => {
            const unlocked = isUnlocked(academy, lesson.id);
            const progress = academy.lessons[lesson.id];
            const passed = Boolean(progress?.passedAt);
            const started = !passed && (progress?.stepIndex ?? 0) > 0;
            const status = passed
              ? `Passed · best ${progress?.bestWpm ?? 0} wpm`
              : started ? `Step ${(progress?.stepIndex ?? 0) + 1} of ${lesson.steps.length}`
              : unlocked ? `${lesson.steps.length} steps · checkpoint ${lesson.checkpoint.wpm} wpm`
              : 'Pass the previous checkpoint to unlock';
            return <button key={lesson.id} type="button" className="ac-lesson" data-state={passed ? 'passed' : started ? 'started' : unlocked ? 'open' : 'locked'} disabled={!unlocked} onClick={() => onOpenLesson(lesson.id)}>
              <span className="ac-lesson-top"><strong>{lesson.title}</strong>{unlocked ? <Stars count={progress?.stars ?? 0} /> : <Lock aria-hidden="true" />}</span>
              <small>{lesson.goal}</small>
              <span className="ac-lesson-status">{status}</span>
            </button>;
          })}
        </div>
      </section>;
    })}
  </div>;
}
