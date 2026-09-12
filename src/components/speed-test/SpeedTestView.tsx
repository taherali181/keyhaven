'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Zap, Clock, Type, Hash, ShieldAlert } from 'lucide-react';
import { generateRandomWords } from '@/data/word-lists';
import { UserSettings, TypingStats } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LiveStatsBar } from '@/components/typing/LiveStatsBar';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { db } from '@/lib/db';

interface SpeedTestViewProps {
  settings: UserSettings;
  onKeyPress: (key: string) => void;
}

type TestType = 'time' | 'words';

export const SpeedTestView: React.FC<SpeedTestViewProps> = ({
  settings,
  onKeyPress
}) => {
  const [testType, setTestType] = useState<TestType>('time');
  const [timeConfig, setTimeConfig] = useState<number>(30); // 15, 30, 60, 120
  const [wordConfig, setWordConfig] = useState<number>(25); // 10, 25, 50, 100
  const [withPunctuation, setWithPunctuation] = useState<boolean>(false);
  const [withNumbers, setWithNumbers] = useState<boolean>(false);

  const [generatedText, setGeneratedText] = useState<string>('');
  const [completedStats, setCompletedStats] = useState<TypingStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Regenerate test text whenever configs change
  const refreshText = useMemo(() => {
    return () => {
      const count = testType === 'time' ? Math.max(50, timeConfig * 3) : wordConfig;
      return generateRandomWords(count, withPunctuation, withNumbers);
    };
  }, [testType, timeConfig, wordConfig, withPunctuation, withNumbers]);

  useEffect(() => {
    setGeneratedText(refreshText());
  }, [refreshText]);

  const handleTestComplete = (stats: TypingStats) => {
    setCompletedStats(stats);
    setIsModalOpen(true);

    const subMode = testType === 'time' ? `${timeConfig}s` : `${wordConfig} words`;
    db.testResults.add({
      mode: 'speed-test',
      subMode,
      title: `Speed Test (${subMode})`,
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

  const isTimed = testType === 'time';

  const {
    typed,
    wpm,
    accuracy,
    timeRemaining,
    isFinished,
    handleKeyDown,
    reset
  } = useTypingEngine({
    targetText: generatedText,
    isTimed,
    timeLimit: timeConfig,
    strictMode: settings.strictMode,
    onComplete: handleTestComplete,
    onKeyPress
  });

  const handleRestart = () => {
    setIsModalOpen(false);
    setGeneratedText(refreshText());
    reset(timeConfig);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-300">
      {/* Top Config Pills (Monkeytype Style) */}
      <div className="flex flex-wrap items-center justify-center gap-4 p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-border)] mb-8 text-xs font-medium">
        {/* Type selector */}
        <div className="flex items-center gap-1 bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--color-border)]">
          <button
            onClick={() => {
              setTestType('time');
              reset(timeConfig);
            }}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all cursor-pointer ${
              testType === 'time'
                ? 'bg-[var(--color-accent)] text-white font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Time</span>
          </button>
          <button
            onClick={() => {
              setTestType('words');
              reset();
            }}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all cursor-pointer ${
              testType === 'words'
                ? 'bg-[var(--color-accent)] text-white font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Words</span>
          </button>
        </div>

        {/* Quantities */}
        <div className="flex items-center gap-1 bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--color-border)]">
          {testType === 'time' ? (
            [15, 30, 60, 120].map(t => (
              <button
                key={t}
                onClick={() => {
                  setTimeConfig(t);
                  reset(t);
                }}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  timeConfig === t
                    ? 'text-[var(--color-accent)] font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t}s
              </button>
            ))
          ) : (
            [10, 25, 50, 100].map(w => (
              <button
                key={w}
                onClick={() => {
                  setWordConfig(w);
                  reset();
                }}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  wordConfig === w
                    ? 'text-[var(--color-accent)] font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {w}
              </button>
            ))
          )}
        </div>

        {/* Modifiers */}
        <div className="flex items-center gap-1 bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--color-border)]">
          <button
            onClick={() => setWithPunctuation(!withPunctuation)}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              withPunctuation
                ? 'text-[var(--color-accent)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle Punctuation"
          >
            @ punctuation
          </button>
          <button
            onClick={() => setWithNumbers(!withNumbers)}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              withNumbers
                ? 'text-[var(--color-accent)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle Numbers"
          >
            # numbers
          </button>
        </div>
      </div>

      {/* Live Stats Header */}
      <LiveStatsBar
        wpm={wpm}
        accuracy={accuracy}
        timeRemaining={timeRemaining}
        isTimed={isTimed}
        onReset={handleRestart}
        showLiveWpm={settings.showLiveWpm}
        showLiveAccuracy={settings.showLiveAccuracy}
      />

      {/* Typing Canvas */}
      <TypingArea
        targetText={generatedText}
        typed={typed}
        isFinished={isFinished}
        caretStyle={settings.caretStyle}
        font="jetbrains"
        fontSize={settings.fontSize}
        onKeyDown={handleKeyDown}
      />

      {/* Test Results Modal */}
      <TestResultsModal
        stats={completedStats}
        isOpen={isModalOpen}
        title={`Speed Test (${isTimed ? `${timeConfig}s` : `${wordConfig} words`})`}
        onRetry={handleRestart}
      />
    </div>
  );
};
