'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
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
  return <div className="micro-stats" aria-label="Live typing statistics">
    {showLiveWpm && <span><strong>{wpm}</strong> wpm</span>}
    {showLiveAccuracy && <span><strong>{accuracy}</strong>%</span>}
    <span><strong>{isTimed && timeRemaining !== undefined ? timeRemaining : formatTime(timeElapsed)}</strong>{isTimed ? ' s' : ''}</span>
    <button onClick={onReset} title="Restart (Escape)"><RotateCcw /></button>
  </div>;
};
