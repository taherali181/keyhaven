'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import confetti from 'canvas-confetti';
import { RotateCcw, ArrowRight, Award, Zap, Target, Flame, Activity } from 'lucide-react';
import { TypingStats } from '@/types';

interface TestResultsModalProps {
  stats: TypingStats | null;
  isOpen: boolean;
  title?: string;
  onRetry: () => void;
  onNext?: () => void;
}

export const TestResultsModal: React.FC<TestResultsModalProps> = ({
  stats,
  isOpen,
  title = 'Test Complete',
  onRetry,
  onNext
}) => {
  useEffect(() => {
    if (isOpen && stats && stats.wpm >= 60) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  }, [isOpen, stats]);

  if (!isOpen || !stats) return null;

  const chartData = stats.history.map(point => ({
    time: `${point.second}s`,
    wpm: point.wpm,
    rawWpm: point.rawWpm,
    errors: point.errors
  }));

  // If test was too fast for history points, generate baseline
  if (chartData.length === 0) {
    chartData.push(
      { time: '0s', wpm: 0, rawWpm: 0, errors: 0 },
      { time: `${stats.timeElapsed}s`, wpm: stats.wpm, rawWpm: stats.rawWpm, errors: stats.incorrectChars }
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-3xl rounded-3xl p-6 md:p-8 border shadow-2xl relative overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--color-border)',
            color: 'var(--text-primary)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-[var(--color-border)]">
            <div>
              <span className="text-xs uppercase tracking-widest text-[var(--color-accent)] font-bold">
                Result Summary
              </span>
              <h2 className="text-2xl font-bold mt-1 text-[var(--text-primary)]">
                {title}
              </h2>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--color-border)] text-xs text-[var(--text-secondary)]">
              <Activity className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Time: {stats.timeElapsed}s</span>
            </div>
          </div>

          {/* Core Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                <Zap className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>WPM</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-[var(--color-accent)]">
                {stats.wpm}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                <Target className="w-3.5 h-3.5 text-[var(--color-correct)]" />
                <span>Accuracy</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-[var(--color-correct)]">
                {stats.accuracy}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                <Flame className="w-3.5 h-3.5 text-[var(--color-accent-secondary)]" />
                <span>Consistency</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-[var(--text-primary)]">
                {stats.consistency}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                <Award className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Raw WPM</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-[var(--text-secondary)]">
                {stats.rawWpm}
              </div>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="my-6 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--color-border)]">
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-3 flex items-center justify-between">
              <span>WPM Progression Over Time</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-[11px] text-[var(--color-accent)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] inline-block" /> Net WPM
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] inline-block" /> Raw WPM
                </span>
              </div>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--color-border)',
                      borderRadius: '0.75rem',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="wpm"
                    stroke="var(--color-accent)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'var(--color-accent)' }}
                    name="Net WPM"
                  />
                  <Line
                    type="monotone"
                    dataKey="rawWpm"
                    stroke="var(--text-muted)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Raw WPM"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Character Breakdown */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)] text-xs text-[var(--text-secondary)] mb-6">
            <div className="flex items-center gap-6">
              <span>
                Characters:{' '}
                <strong className="text-[var(--text-primary)] font-mono">
                  {stats.totalChars}
                </strong>
              </span>
              <span>
                Correct:{' '}
                <strong className="text-[var(--color-correct)] font-mono">
                  {stats.correctChars}
                </strong>
              </span>
              <span>
                Incorrect:{' '}
                <strong className="text-[var(--color-incorrect)] font-mono">
                  {stats.incorrectChars}
                </strong>
              </span>
              <span>
                Missed:{' '}
                <strong className="text-[var(--text-muted)] font-mono">
                  {stats.missedChars}
                </strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] border border-[var(--color-border)] transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again (Tab + Enter)</span>
            </button>

            {onNext && (
              <button
                onClick={onNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-[var(--color-accent)] hover:opacity-90 transition-all shadow-md cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
