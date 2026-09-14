'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Dices, RotateCcw } from 'lucide-react';
import type { ReaderBarStyle } from '@/types';
import type { ResolvedReaderStat } from '@/lib/reader-stats';

/** More parts than this and the bar shows one continuous progress line instead of segments. */
const MAX_SEGMENTS = 24;

interface ReaderBottomBarProps {
  /** The title bar is auto-hiding: show a quiet, translucent strip with only the chosen stats. */
  compact: boolean;
  navLabel: string;
  /** Where you are; omitted where position isn't meaningful (quotes). */
  progress?: { label: string; percent: number; valueText: string; fills: number[]; partLabel?: React.ReactNode };
  previous: { disabled: boolean; onClick: () => void };
  next: { disabled: boolean; label: string; onClick: () => void };
  onRandomStory: () => void;
  /** Text for the separate random button beside the bar (quotes shuffle instead of opening a story). */
  randomLabel?: string;
  randomIcon?: React.ReactNode;
  /** Typing mode: restart the current part. */
  onReset?: () => void;
  stats: ResolvedReaderStat[];
  barStyle: ReaderBarStyle;
}

function Segments({ fills }: { fills: number[] }) {
  if (fills.length > MAX_SEGMENTS) {
    const fill = fills.reduce((total, value) => total + value, 0) / Math.max(1, fills.length);
    return <span className="story-segments is-continuous" aria-hidden="true"><i className="is-current"><b style={{ transform: `scaleX(${fill})` }} /></i></span>;
  }
  return <span className="story-segments" aria-hidden="true">
    {fills.map((fill, index) => <i key={index} className={fill >= 1 ? 'is-done' : fill > 0 ? 'is-current' : ''}>{fill > 0 && fill < 1 && <b style={{ transform: `scaleX(${fill})` }} />}</i>)}
  </span>;
}

/** The reader's one bottom bar: moving through the text, where you are, and the stats you chose. */
export function ReaderBottomBar({ compact, navLabel, progress, previous, next, onRandomStory, randomLabel = 'Random story', randomIcon, onReset, stats, barStyle }: ReaderBottomBarProps) {
  // A row of three columns keeps the bar centred on the page while the random button sits just to its left.
  return <div className="reader-bar-dock">
    {/* Hidden title bar: the quiet strip shows no random button. */}
    {!compact && <button type="button" className="reader-random glass" onClick={onRandomStory} title={randomLabel}>
      {randomIcon ?? <Dices aria-hidden="true" />}<span>{randomLabel}</span>
    </button>}
    <div className={`reader-bar glass ${compact ? 'is-compact' : ''}`} data-opacity={barStyle.compactOpacity} data-progress={barStyle.compactProgress ? 'on' : 'off'}>
    <nav className="reader-bar-nav" aria-label={navLabel}>
      <button type="button" className="reader-bar-step" disabled={previous.disabled} onClick={previous.onClick}><ChevronLeft aria-hidden="true" />Previous</button>
      {progress && <div className="pagination-progress" role="progressbar" aria-label={progress.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-valuetext={progress.valueText}>
        <Segments fills={progress.fills} />
        {progress.partLabel && <span className="pagination-part" aria-hidden="true">{progress.partLabel}</span>}
      </div>}
      <button type="button" className="reader-bar-step" disabled={next.disabled} onClick={next.onClick}>{next.label}<ChevronRight aria-hidden="true" /></button>
    </nav>
    {stats.length > 0 && <div className="reader-bar-stats" role="group" aria-label="Reader stats">
      {stats.map(stat => <span key={stat.id} className="reader-bar-stat" data-stat={stat.id} title={stat.label}>
        <strong>{stat.value}</strong>{stat.short && <small>{stat.short}</small>}
      </span>)}
    </div>}
    {onReset && <button type="button" className="reader-bar-icon reader-bar-reset" onClick={onReset} aria-label="Restart part" title="Restart (Escape)"><RotateCcw aria-hidden="true" /></button>}
  </div>
  </div>;
}
