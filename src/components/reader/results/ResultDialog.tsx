'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, RotateCcw, Trophy, X } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Segmented } from '@/components/ui/Segmented';
import { SpeedChart } from '@/components/typing/SpeedChart';
import { VirtualKeyboardHeatmap } from '@/components/typing/VirtualKeyboardHeatmap';
import { beats, loadResults, recentTrend } from '@/lib/result-history';
import { spring } from '@/lib/motion';
import { plural } from '@/lib/profile-stats';
import type { TestResultRecord } from '@/types';
import { ComparisonChip, Sparkline } from './ResultBits';
import type { ReaderResult } from './useResultPopup';

const PAGE = 8;

const dateTime = (timestamp: number) => new Date(timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** The full result: this attempt in detail, and every earlier attempt it can be compared with. */
export function ResultDialog({ open, result, onClose, onNext, onRetry }: { open: boolean; result: ReaderResult; onClose: () => void; onNext: () => void; onRetry: () => void }) {
  const titleId = useId();
  const reduce = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  const [records, setRecords] = useState<TestResultRecord[] | null>(null);
  const [scopeId, setScopeId] = useState(result.scopes[0]?.id ?? 'all');
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void loadResults(result.modes).then(items => { if (live) setRecords(items); }).catch(() => { if (live) setRecords([]); });
    return () => { live = false; };
  }, [open, result]);

  // Focus moves into the dialog, Tab stays inside it, and Escape closes it.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('.rr-dialog-close')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); return; }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  const scope = result.scopes.find(item => item.id === scopeId) ?? result.scopes[0];
  const scoped = useMemo(() => {
    const items = (records ?? []).filter(record => scope?.match(record) ?? true);
    return items.some(record => record.clientId === result.record.clientId) ? items : [result.record, ...items];
  }, [records, scope, result.record]);
  const best = scoped.reduce<TestResultRecord | null>((top, record) => (!top || beats(record, top) ? record : top), null);
  const average = scoped.length ? Math.round(scoped.reduce((total, record) => total + record.wpm, 0) / scoped.length) : 0;
  const averageAccuracy = scoped.length ? Math.round(scoped.reduce((total, record) => total + record.accuracy, 0) / scoped.length) : 0;

  if (!open) return null;
  const { stats } = result;
  const figures = [
    { label: 'Accuracy', value: `${stats.accuracy}%` },
    { label: 'Raw wpm', value: `${stats.rawWpm}` },
    { label: 'Consistency', value: `${stats.consistency}%` }
  ];
  const characters = [
    { label: 'Characters', value: stats.totalChars, tone: '' },
    { label: 'Correct', value: stats.correctChars, tone: 'is-correct' },
    { label: 'Incorrect', value: stats.incorrectChars, tone: 'is-incorrect' },
    { label: 'Missed', value: stats.missedChars, tone: '' }
  ];
  const hasErrors = Object.values(stats.errorHeatmap).some(count => count > 0);

  return createPortal(
    <div className="rr-dialog-scrim" onClick={onClose}>
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="rr-dialog theme-chrome"
        onClick={event => event.stopPropagation()}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: spring.soft }}
      >
        <header className="results-head">
          <div><p className="eyebrow">{result.eyebrow}</p><h2 id={titleId}>{result.title}</h2></div>
          <div className="rr-dialog-head-side">
            <span className="results-time">{dateTime(result.record.timestamp)} · {stats.timeElapsed}s</span>
            <button type="button" className="rr-icon rr-dialog-close" aria-label="Close results" onClick={onClose}><X aria-hidden="true" /></button>
          </div>
        </header>

        <section className="rr-dialog-section" aria-label="This attempt">
          <div className="results-hero">
            <div className="rr-dialog-wpm">
              <div className="results-wpm"><AnimatedNumber value={stats.wpm} className="results-wpm-value" /><span className="results-wpm-unit">wpm</span></div>
              <ComparisonChip result={result} />
            </div>
            <div className="results-stats">
              {figures.map(item => <div key={item.label} className="results-stat"><small>{item.label}</small><strong>{item.value}</strong></div>)}
            </div>
          </div>
          <SpeedChart stats={stats} className="results-chart rr-dialog-chart" />
          <dl className="results-chars">
            {characters.map(item => <div key={item.label} className={item.tone}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
          </dl>
          {hasErrors && <div className="rr-dialog-keys">
            <h3>Missed keys</h3>
            <VirtualKeyboardHeatmap errorHeatmap={stats.errorHeatmap} showFingers={false} label="Keys missed in this attempt" />
          </div>}
        </section>

        <section className="rr-dialog-section" aria-labelledby={`${titleId}-history`}>
          <div className="rr-history-head">
            <h3 id={`${titleId}-history`}>Previous results</h3>
            {result.scopes.length > 1 && <Segmented label="Compare with" layoutId="rr-scope" value={scope?.id ?? ''} options={result.scopes.map(item => ({ value: item.id, label: item.label }))} onChange={value => { setScopeId(value); setShown(PAGE); }} />}
          </div>
          <dl className="rr-history-summary">
            <div><dt>Best</dt><dd><strong>{best?.wpm ?? stats.wpm}</strong><small>wpm</small></dd></div>
            <div><dt>Average</dt><dd><strong>{average}</strong><small>wpm · {averageAccuracy}%</small></dd></div>
            <div><dt>Attempts</dt><dd><strong>{scoped.length}</strong></dd></div>
            <div className="rr-history-trend"><dt>Trend</dt><dd>{scoped.length > 1 ? <Sparkline values={recentTrend(scoped, 20)} className="rr-spark is-wide" label="Speed across recent attempts" /> : <small>Needs two attempts</small>}</dd></div>
          </dl>
          {records === null
            ? <div className="rr-history-loading" aria-hidden="true"><span /><span /><span /></div>
            : <ol className="rr-history">
              {scoped.slice(0, shown).map(record => {
                const current = record.clientId === result.record.clientId;
                return <li key={record.clientId} className={current ? 'is-current' : undefined}>
                  <div className="rr-history-name">
                    <strong>{record.title ?? record.subMode}</strong>
                    <small>{current ? 'This attempt' : dateTime(record.timestamp)}</small>
                  </div>
                  <span className="rr-history-badge">{best && record.clientId === best.clientId && <span className="rr-history-best"><Trophy aria-hidden="true" />Best</span>}</span>
                  <span className="rr-history-figure"><strong>{record.wpm}</strong><small>wpm</small></span>
                  <span className="rr-history-figure"><strong>{record.accuracy}%</strong><small>acc</small></span>
                </li>;
              })}
            </ol>}
          {scoped.length > shown && <button type="button" className="rs-btn rr-history-more" onClick={() => setShown(value => value + PAGE)}>Show more · {plural(scoped.length - shown, 'attempt')} left</button>}
        </section>

        <div className="results-actions">
          <button type="button" className="rs-btn" onClick={onClose}>Close</button>
          <button type="button" className="rs-btn" onClick={onRetry}><RotateCcw aria-hidden="true" />Retry</button>
          <button type="button" className="rs-btn is-primary" onClick={onNext}>{result.nextLabel}<ArrowRight aria-hidden="true" /></button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
