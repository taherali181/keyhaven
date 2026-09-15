'use client';

import React, { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Keyboard, Timer } from 'lucide-react';
import type { TestResultRecord, TypingMode } from '@/types';
import { VirtualKeyboardHeatmap } from '@/components/typing/VirtualKeyboardHeatmap';
import { compactNumber, formatMinutes, lifetimeErrors, MODE_LABELS, modeBreakdown, personalBests, problemKeys, typingSummary, wpmTrend, type TrendPoint } from '@/lib/profile-stats';
import { Card, Empty, Meter, Stat } from './ProfileBits';

const PAGE = 8;

function TrendTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: TrendPoint }> }) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return <div className="profile-tooltip">
    <strong>{point.wpm} wpm · {point.accuracy}%</strong>
    <span>{point.title}</span>
    <small>{new Date(point.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · 5-session average {point.average}</small>
  </div>;
}

export function TypingSection({ results, onNavigate }: { results: TestResultRecord[]; onNavigate: (mode: TypingMode) => void }) {
  const summary = useMemo(() => typingSummary(results), [results]);
  const trend = useMemo(() => wpmTrend(results), [results]);
  const bests = useMemo(() => personalBests(results), [results]);
  const modes = useMemo(() => modeBreakdown(results), [results]);
  const errors = useMemo(() => lifetimeErrors(results), [results]);
  const recent = useMemo(() => [...results].sort((a, b) => b.timestamp - a.timestamp), [results]);
  const [filter, setFilter] = useState<TypingMode | 'all'>('all');
  const [shown, setShown] = useState(PAGE);

  if (!results.length) {
    return <Card id="profile-typing" eyebrow="Typing" title="Your typing">
      <Empty icon={<Keyboard aria-hidden="true" />} title="No typing yet" action={<button type="button" className="rs-btn is-primary" onClick={() => onNavigate('speed-test')}><Timer aria-hidden="true" />Take a speed test</button>}>
        Finish a speed test, a quote or a story part, and your speed, accuracy and trends appear here.
      </Empty>
    </Card>;
  }

  const problems = problemKeys(errors);
  const change = summary.recentWpm !== null && summary.previousWpm !== null ? summary.recentWpm - summary.previousWpm : null;
  const longest = Math.max(...modes.map(mode => mode.minutes), 1 / 60);
  const presentModes = [...new Set(recent.map(result => result.mode))];
  const filtered = filter === 'all' ? recent : recent.filter(result => result.mode === filter);

  return <>
    <Card id="profile-typing" eyebrow="Typing" title="Your typing">
      <div className="profile-stats">
        <Stat label="Best speed" value={summary.bestWpm} sub="words per minute" accent />
        <Stat label="Average" value={summary.averageWpm} sub={change === null ? 'words per minute' : `${change >= 0 ? '+' : '−'}${Math.abs(change)} wpm vs 10 before`} />
        <Stat label="Accuracy" value={`${summary.averageAccuracy}%`} sub="average" />
        <Stat label="Consistency" value={`${summary.averageConsistency}%`} sub="average" />
        <Stat label="Time typing" value={formatMinutes(summary.minutes)} sub={`${summary.sessions} ${summary.sessions === 1 ? 'session' : 'sessions'}`} />
        <Stat label="Words typed" value={compactNumber(summary.wordsTyped)} />
      </div>
      {trend.length > 1 && <div className="profile-chart" role="img" aria-label={`Typing speed over your last ${trend.length} sessions, most recently ${trend[trend.length - 1].wpm} words per minute`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="profile-wpm-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--glass-border)" />
            <XAxis dataKey="index" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'var(--glass-border)' }} />
            <Area type="monotone" dataKey="wpm" stroke="var(--color-accent)" strokeOpacity={0.4} strokeWidth={1.25} fill="url(#profile-wpm-fill)" isAnimationActive={false} />
            <Area type="monotone" dataKey="average" stroke="var(--color-accent)" strokeWidth={2.25} fill="none" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>}
    </Card>

    <div className="profile-pair">
      <Card id="profile-bests" eyebrow="Speed" title="Personal bests">
        <table className="profile-table" aria-label="Personal bests">
          <thead><tr><th scope="col">Test</th><th scope="col">Best</th><th scope="col">Accuracy</th><th scope="col">Runs</th></tr></thead>
          <tbody>
            {bests.map(row => <tr key={row.config}>
              <th scope="row">{row.config}</th>
              <td className={row.best ? '' : 'is-empty'}>{row.best ? `${row.best.wpm} wpm` : '—'}</td>
              <td className={row.best ? '' : 'is-empty'}>{row.best ? `${row.best.accuracy}%` : '—'}</td>
              <td className={row.attempts ? '' : 'is-empty'}>{row.attempts}</td>
            </tr>)}
          </tbody>
        </table>
      </Card>
      <Card id="profile-modes" eyebrow="Where you type" title="By section">
        <div className="profile-bars">
          {modes.map(mode => <div key={mode.mode} className="profile-bar">
            <span>{mode.label}</span>
            <Meter value={mode.minutes / longest} />
            <output>{formatMinutes(mode.minutes)} · {mode.averageWpm} wpm</output>
          </div>)}
        </div>
      </Card>
    </div>

    <Card id="profile-keys" eyebrow="Accuracy" title="Keys that trip you up">
      {problems.length
        ? <div className="profile-keys">{problems.map(item => <span key={item.key} className="profile-key"><kbd>{item.key}</kbd><small>{item.count} {item.count === 1 ? 'miss' : 'misses'}</small></span>)}</div>
        : <p className="profile-note">No mistakes recorded yet.</p>}
      <div className="profile-keyboard"><VirtualKeyboardHeatmap errorHeatmap={errors} showFingers={false} /></div>
    </Card>

    <Card id="profile-sessions" eyebrow="History" title="Recent sessions" actions={presentModes.length > 1 && <div className="profile-chips" role="group" aria-label="Show sessions from">
      {(['all', ...presentModes] as Array<TypingMode | 'all'>).map(mode => <button key={mode} type="button" aria-pressed={filter === mode} onClick={() => { setFilter(mode); setShown(PAGE); }}>{mode === 'all' ? 'All' : MODE_LABELS[mode] ?? mode}</button>)}
    </div>}>
      <ul className="profile-list">
        {filtered.slice(0, shown).map(result => <li key={result.clientId}>
          <div className="profile-list-main">
            <strong>{result.title ?? result.subMode}</strong>
            <small>{MODE_LABELS[result.mode] ?? result.mode} · {new Date(result.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small>
          </div>
          <div className="profile-list-side"><span>{result.wpm} wpm</span><span>{result.accuracy}%</span></div>
        </li>)}
      </ul>
      {filtered.length > shown && <button type="button" className="rs-btn is-small profile-more" onClick={() => setShown(current => current + PAGE * 2)}>Show more</button>}
    </Card>
  </>;
}
