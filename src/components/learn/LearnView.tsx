'use client';

import React, { useState, useEffect } from 'react';
import { GraduationCap, Sparkles, CheckCircle2, ChevronRight, Target, Dumbbell } from 'lucide-react';
import { LESSONS } from '@/data/lessons';
import { Lesson, UserSettings, TypingStats } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LiveStatsBar } from '@/components/typing/LiveStatsBar';
import { VirtualKeyboardHeatmap } from '@/components/typing/VirtualKeyboardHeatmap';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { db } from '@/lib/db';

interface LearnViewProps {
  settings: UserSettings;
  onKeyPress: (key: string) => void;
}

export const LearnView: React.FC<LearnViewProps> = ({
  settings,
  onKeyPress
}) => {
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [completedStats, setCompletedStats] = useState<TypingStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [weakKeysList, setWeakKeysList] = useState<string[]>([]);
  const [isCustomDrill, setIsCustomDrill] = useState(false);
  const [customDrillText, setCustomDrillText] = useState('');

  // Extract user's most error-prone keys from DB
  useEffect(() => {
    db.testResults.toArray().then(records => {
      const errorCounts: Record<string, number> = {};
      records.forEach(r => {
        if (r.errorKeys) {
          Object.entries(r.errorKeys).forEach(([k, count]) => {
            errorCounts[k] = (errorCounts[k] || 0) + count;
          });
        }
      });

      const sorted = Object.entries(errorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);

      setWeakKeysList(sorted);
    }).catch(() => {});
  }, []);

  const activeLesson: Lesson = LESSONS[activeLessonIdx] || LESSONS[0];
  const activeExerciseText = isCustomDrill 
    ? customDrillText 
    : activeLesson.exercises[activeExerciseIdx] || activeLesson.exercises[0];

  const handleExerciseComplete = (stats: TypingStats) => {
    setCompletedStats(stats);
    setIsModalOpen(true);

    db.testResults.add({
      mode: 'learn',
      subMode: isCustomDrill ? 'Weak Key Drill' : activeLesson.title,
      title: isCustomDrill ? 'Custom Weak-Key Practice' : `${activeLesson.title} - Ex ${activeExerciseIdx + 1}`,
      wpm: stats.wpm,
      rawWpm: stats.rawWpm,
      accuracy: stats.accuracy,
      consistency: stats.consistency,
      duration: stats.timeElapsed,
      timestamp: Date.now(),
      errors: stats.incorrectChars,
      errorKeys: stats.errorHeatmap
    }).catch(() => {});
  };

  const {
    typed,
    wpm,
    accuracy,
    isFinished,
    handleKeyDown,
    reset
  } = useTypingEngine({
    targetText: activeExerciseText,
    strictMode: settings.strictMode,
    onComplete: handleExerciseComplete,
    onKeyPress
  });

  const nextChar = activeExerciseText[typed.length] || '';

  const generateWeakKeyDrill = () => {
    const keys = weakKeysList.length > 0 ? weakKeysList : ['f', 'j', 'd', 'k', 'e', 'r'];
    const words: string[] = [];
    for (let i = 0; i < 15; i++) {
      let word = '';
      for (let j = 0; j < 4; j++) {
        word += keys[Math.floor(Math.random() * keys.length)];
      }
      words.push(word);
    }
    const drill = words.join(' ');
    setCustomDrillText(drill);
    setIsCustomDrill(true);
    setIsModalOpen(false);
    reset();
  };

  const handleNextExercise = () => {
    setIsModalOpen(false);
    if (isCustomDrill) {
      generateWeakKeyDrill();
      return;
    }

    if (activeExerciseIdx < activeLesson.exercises.length - 1) {
      setActiveExerciseIdx(prev => prev + 1);
    } else {
      setActiveLessonIdx(prev => (prev + 1) % LESSONS.length);
      setActiveExerciseIdx(0);
    }
    reset();
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--color-border)] mb-8">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-accent)]">
              Touch Typing Academy
            </span>
            <h2 className="text-2xl font-serif font-bold text-[var(--text-primary)]">
              {isCustomDrill ? 'Targeted Weak-Key Drill' : activeLesson.title}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isCustomDrill ? `Focusing on keys: ${weakKeysList.join(', ').toUpperCase()}` : activeLesson.description}
            </p>
          </div>
        </div>

        {/* Dynamic Drill Generator Button */}
        <button
          onClick={generateWeakKeyDrill}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all cursor-pointer shrink-0 shadow-xs"
        >
          <Dumbbell className="w-4 h-4 text-[var(--color-accent)]" />
          <span>Generate Weak-Key Drill</span>
        </button>
      </div>

      {/* Lesson Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
        {LESSONS.map((lesson, idx) => (
          <button
            key={lesson.id}
            onClick={() => {
              setIsCustomDrill(false);
              setActiveLessonIdx(idx);
              setActiveExerciseIdx(0);
              reset();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
              !isCustomDrill && activeLessonIdx === idx
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--color-border)] hover:text-[var(--text-primary)]'
            }`}
          >
            Tier {lesson.tier}: {lesson.title}
          </button>
        ))}
      </div>

      {/* Live Stats */}
      <LiveStatsBar
        wpm={wpm}
        accuracy={accuracy}
        timeElapsed={0}
        onReset={() => reset()}
        showLiveWpm={settings.showLiveWpm}
        showLiveAccuracy={settings.showLiveAccuracy}
      />

      {/* Typing Canvas */}
      <TypingArea
        targetText={activeExerciseText}
        typed={typed}
        isFinished={isFinished}
        caretStyle={settings.caretStyle}
        font="jetbrains"
        fontSize="lg"
        onKeyDown={handleKeyDown}
      />

      {/* Interactive Visual Keyboard Heatmap */}
      <div className="mt-8">
        <VirtualKeyboardHeatmap
          activeKey={nextChar}
          highlightKeys={!isCustomDrill ? activeLesson.targetKeys : weakKeysList}
          showFingers={true}
        />
      </div>

      {/* Results Modal */}
      <TestResultsModal
        stats={completedStats}
        isOpen={isModalOpen}
        title={isCustomDrill ? 'Weak-Key Drill Complete' : `Lesson Finished: ${activeLesson.title}`}
        onRetry={() => {
          setIsModalOpen(false);
          reset();
        }}
        onNext={handleNextExercise}
      />
    </div>
  );
};
