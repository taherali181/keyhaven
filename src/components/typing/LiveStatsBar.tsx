'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { formatTime } from '@/lib/metrics';
import type { LiveStatsPosition } from '@/types';

interface LiveStatsBarProps {
  wpm: number;
  accuracy: number;
  timeRemaining?: number;
  timeElapsed?: number;
  isTimed?: boolean;
  onReset: () => void;
  showLiveWpm?: boolean;
  showLiveAccuracy?: boolean;
  showTime?: boolean;
  showProgress?: boolean;
  /** 'top': a glass bar under the section header. 'corner': the small fixed pill at the bottom right. */
  position?: LiveStatsPosition;
  /** 0–1 through the run; undefined draws no progress line (Zen). */
  progress?: number;
}

export const LiveStatsBar: React.FC<LiveStatsBarProps> = ({
  wpm,
  accuracy,
  timeRemaining,
  timeElapsed = 0,
  isTimed = false,
  onReset,
  showLiveWpm = true,
  showLiveAccuracy = true,
  showTime = true,
  showProgress = true,
  position = 'top',
  progress
}) => {
  const time = isTimed && timeRemaining !== undefined ? `${timeRemaining}s` : formatTime(timeElapsed);
  if (position === 'corner') return <div className="micro-stats" aria-label="Live typing statistics">
    {showLiveWpm && <span><strong>{wpm}</strong> wpm</span>}
    {showLiveAccuracy && <span><strong>{accuracy}</strong>%</span>}
    {showTime && <span><strong>{isTimed && timeRemaining !== undefined ? timeRemaining : formatTime(timeElapsed)}</strong>{isTimed ? ' s' : ''}</span>}
    <button onClick={onReset} title="Restart (Escape)"><RotateCcw /></button>
  </div>;

  const line = showProgress && progress !== undefined ? Math.min(1, Math.max(0, progress)) : null;
  return <div className="live-bar glass" aria-label="Live typing statistics">
    <dl className="live-bar-figures">
      {showLiveWpm && <div><dt>WPM</dt><dd>{wpm}</dd></div>}
      {showLiveAccuracy && <div><dt>Accuracy</dt><dd>{accuracy}%</dd></div>}
      {showTime && <div><dt>{isTimed ? 'Left' : 'Time'}</dt><dd>{time}</dd></div>}
    </dl>
    <button type="button" className="live-bar-reset" onClick={onReset} title="Restart (Escape)" aria-label="Restart"><RotateCcw aria-hidden="true" /></button>
    {line !== null && <span className="live-bar-progress" style={{ transform: `scaleX(${line})` }} aria-hidden="true" />}
  </div>;
};
