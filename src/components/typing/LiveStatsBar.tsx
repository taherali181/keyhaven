'use client';

import React from 'react';
import { RotateCcw, Zap, Target, Clock } from 'lucide-react';
import { formatTime } from '@/lib/metrics';

interface LiveStatsBarProps {
  wpm: number;
  accuracy: number;
  timeRemaining?: number;
  timeElapsed?: number;
  isTimed?: boolean;
  onReset: () => void;
  showLiveWpm?: boolean;
  showLiveAccuracy?: boolean;
}

export const LiveStatsBar: React.FC<LiveStatsBarProps> = ({
  wpm,
  accuracy,
  timeRemaining,
  timeElapsed = 0,
  isTimed = false,
  onReset,
  showLiveWpm = true,
  showLiveAccuracy = true
}) => {
  return (
    <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)] text-sm mb-4 overflow-hidden">
      <div className="flex min-w-0 items-center gap-3 sm:gap-6">
        {showLiveWpm && (
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--color-accent)]" />
            <span className="font-mono font-bold text-[var(--text-primary)] text-lg">
              {wpm}
            </span>
            <span className="hidden sm:inline text-xs text-[var(--text-muted)] uppercase tracking-wider">
              wpm
            </span>
          </div>
        )}

        {showLiveAccuracy && (
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--color-correct)]" />
            <span className="font-mono font-bold text-[var(--text-primary)] text-lg">
              {accuracy}%
            </span>
            <span className="hidden sm:inline text-xs text-[var(--text-muted)] uppercase tracking-wider">
              acc
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="font-mono font-bold text-[var(--text-primary)] text-lg">
            {isTimed && timeRemaining !== undefined ? timeRemaining : formatTime(timeElapsed)}
          </span>
          {isTimed && (
            <span className="hidden sm:inline text-xs text-[var(--text-muted)] uppercase tracking-wider">
              sec
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onReset}
        title="Restart (Tab + Enter or Esc)"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--color-border)] transition-all cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Restart</span>
      </button>
    </div>
  );
};
