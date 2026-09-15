'use client';

import React, { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TypingStats } from '@/types';

interface ChartPoint { time: string; wpm: number; rawWpm: number }

function ChartTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: ChartPoint }> }) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return <div className="profile-tooltip"><strong>{point.wpm} wpm</strong><span>raw {point.rawWpm}</span><small>at {point.time}</small></div>;
}

/** Speed over one attempt: wpm as an accent area, raw wpm dashed behind it. */
export function SpeedChart({ stats, className = 'results-chart' }: { stats: TypingStats; className?: string }) {
  const fillId = `speed-fill-${useId().replace(/:/g, '')}`;
  const data: ChartPoint[] = stats.history.map(point => ({ time: `${point.second}s`, wpm: point.wpm, rawWpm: point.rawWpm }));
  if (data.length === 0) data.push({ time: '0s', wpm: 0, rawWpm: 0 }, { time: `${stats.timeElapsed}s`, wpm: stats.wpm, rawWpm: stats.rawWpm });
  // A very short attempt has one sample; draw it as a level line rather than a lone dot.
  else if (data.length === 1) data.push({ ...data[0], time: `${stats.timeElapsed}s` });

  return <div className={className} role="img" aria-label={`Speed during the attempt, finishing at ${stats.wpm} words per minute`}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -4, bottom: 0 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--glass-border)" />
        <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} minTickGap={20} />
        <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--glass-border)' }} />
        <Area type="monotone" dataKey="rawWpm" stroke="var(--text-muted)" strokeDasharray="4 4" strokeWidth={1.25} fill="none" isAnimationActive={false} />
        <Area type="monotone" dataKey="wpm" stroke="var(--color-accent)" strokeWidth={2.25} fill={`url(#${fillId})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}
