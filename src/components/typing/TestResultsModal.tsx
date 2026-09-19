'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { TypingStats } from '@/types';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { SpeedChart } from '@/components/typing/SpeedChart';
import { ease, spring } from '@/lib/motion';
import { missedKeys } from '@/components/reader/results/ResultBits';
import { describeKey } from '@/components/typing/VirtualKeyboardHeatmap';

interface TestResultsModalProps {
  stats: TypingStats | null;
  isOpen: boolean;
  title?: string;
  onRetry: () => void;
  onNext?: () => void;
}

export const TestResultsModal: React.FC<TestResultsModalProps> = ({ stats, isOpen, title = 'Test complete', onRetry, onNext }) => {
  useEffect(() => {
    if (isOpen && stats && stats.wpm >= 60) confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  }, [isOpen, stats]);

  if (!isOpen || !stats) return null;

  const figures = [
    { label: 'Accuracy', value: `${stats.accuracy}%` },
    { label: 'Raw wpm', value: `${stats.rawWpm}` },
    { label: 'Consistency', value: `${stats.consistency}%` }
  ];
  const misses = missedKeys(stats.errorHeatmap, 8);
  const characters = [
    { label: 'Characters', value: stats.totalChars, tone: '' },
    { label: 'Correct', value: stats.correctChars, tone: 'is-correct' },
    { label: 'Incorrect', value: stats.incorrectChars, tone: 'is-incorrect' },
    { label: 'Missed', value: stats.missedChars, tone: '' }
  ];

  return (
    <div className="results-scrim">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="results-title"
        className="results-modal"
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: spring.soft }}
      >
        <header className="results-head">
          <div><p className="eyebrow">Result Summary</p><h2 id="results-title">{title}</h2></div>
          <span className="results-time">{stats.timeElapsed}s</span>
        </header>

        <div className="results-hero">
          <div className="results-wpm"><AnimatedNumber value={stats.wpm} className="results-wpm-value" /><span className="results-wpm-unit">wpm</span></div>
          <div className="results-stats">
            {figures.map((item, index) => <motion.div key={item.label} className="results-stat" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 * index, duration: 0.24, ease: ease.outExpo } }}>
              <small>{item.label}</small><strong>{item.value}</strong>
            </motion.div>)}
          </div>
        </div>

        <SpeedChart stats={stats} />

        <dl className="results-chars">
          {characters.map(item => <div key={item.label} className={item.tone}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
        </dl>

        <div className="results-misses">
          <small>Most missed keys</small>
          {misses.length
            ? <ul aria-label="Most missed keys">{misses.map(([key, count]) => <li key={key} title={`${describeKey(key)}: ${count} ${count === 1 ? 'miss' : 'misses'}`}><kbd>{key === ' ' ? '␣' : key}</kbd><span>{count}</span></li>)}</ul>
            : <span className="results-clean">None. A clean run.</span>}
        </div>

        <div className="results-actions">
          <button type="button" className="rs-btn" onClick={onRetry}><RotateCcw aria-hidden="true" />Try again<span className="results-keys" aria-hidden="true"><kbd>Tab</kbd><kbd>Enter</kbd></span></button>
          {onNext && <button type="button" className="rs-btn is-primary" onClick={onNext}>Continue<ArrowRight aria-hidden="true" /></button>}
        </div>
      </motion.div>
    </div>
  );
};
