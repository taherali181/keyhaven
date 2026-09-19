'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import type { ReaderResult } from './useResultPopup';
import { describeKey } from '@/components/typing/VirtualKeyboardHeatmap';

/** A tiny line of recent speeds; the newest point is marked. */
export function Sparkline({ values, className = 'rr-spark', label }: { values: number[]; className?: string; label?: string }) {
  if (values.length < 2) return null;
  const width = 120;
  const height = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const points = values.map((value, index) => [(index / (values.length - 1)) * width, height - 3 - ((value - min) / span) * (height - 6)]);
  const [lastX, lastY] = points[points.length - 1];
  return <svg className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <polyline points={points.map(point => point.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    <circle cx={lastX} cy={lastY} r="2.5" fill="var(--color-caret)" />
  </svg>;
}

/** How this attempt compares: a new best, a first attempt, or the difference from the recent average. */
export function ComparisonChip({ result }: { result: ReaderResult }) {
  const { summary } = result;
  if (summary.isPersonalBest) return <span className="rr-compare is-best"><Trophy aria-hidden="true" />New best</span>;
  if (summary.deltaWpm === null) return <span className="rr-compare">First attempt</span>;
  const delta = summary.deltaWpm;
  return <span className={`rr-compare ${delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : ''}`}>{delta > 0 ? '+' : ''}{delta} vs average</span>;
}

/** "E (left middle finger)" for a missed key's tooltip. */
export function missLabel(key: string) {
  const found = describeKey(key);
  return found ? `${found.label} (${found.finger})` : key;
}

export const missedKeys = (errorKeys: Record<string, number>, limit = 3) => Object.entries(errorKeys).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, limit);
