'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Minus, RotateCcw, Sparkles, Target, Trophy, X } from 'lucide-react';
import type { TestResultRecord, TypingMode, TypingStats } from '@/types';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Segmented } from '@/components/ui/Segmented';
import { SpeedChart } from '@/components/typing/SpeedChart';
import { VirtualKeyboardHeatmap } from '@/components/typing/VirtualKeyboardHeatmap';
import { Sparkline } from '@/components/reader/results/ResultBits';
import { loadResults, summariseAttempt } from '@/lib/result-history';
import type { KeyTrend, RunAnalysis } from '@/lib/academy/feedback';
import { ease, spring } from '@/lib/motion';

interface TestResultsModalProps {
  stats: TypingStats | null;
  isOpen: boolean;
  title?: string;
  eyebrow?: string;
  /** The saved result, compared with earlier results of the same `modes` that `match`. */
  record?: TestResultRecord | null;
  modes?: TypingMode[];
  match?: (record: TestResultRecord) => boolean;
  /** Key, finger and lesson feedback from the Academy's history. */
  analysis?: RunAnalysis | null;
  onRetry: () => void;
  onNext?: () => void;
  nextLabel?: string;
  /** Clicking outside, Escape and the close button. */
  onClose: () => void;
  onPractise?: (keys: string[]) => void;
  onOpenLesson?: (lessonId: string) => void;
}

const TREND: Record<KeyTrend, { label: string; icon: React.ReactNode }> = {
  better: { label: 'Better than usual', icon: <ArrowUpRight aria-hidden="true" /> },
  worse: { label: 'Worse than usual', icon: <ArrowDownRight aria-hidden="true" /> },
  steady: { label: 'About usual', icon: <Minus aria-hidden="true" /> },
  new: { label: 'Not enough history yet', icon: <Sparkles aria-hidden="true" /> }
};

/** A finished test or checkpoint: how it went, how it compares, and what to practise next. */
export const TestResultsModal: React.FC<TestResultsModalProps> = ({
  stats, isOpen, title = 'Test complete', eyebrow = 'Result summary', record = null, modes, match, analysis = null,
  onRetry, onNext, nextLabel = 'Continue', onClose, onPractise, onOpenLesson
}) => {
  const titleId = useId();
  const reduce = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  const [pane, setPane] = useState<'feedback' | 'details'>('feedback');
  const [records, setRecords] = useState<TestResultRecord[] | null>(null);
  const modeKey = modes?.join() ?? '';

  useEffect(() => {
    if (isOpen && stats && stats.wpm >= 60 && !reduce) confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  }, [isOpen, stats, reduce]);

  useEffect(() => {
    if (!isOpen || !modeKey) return;
    let live = true;
    void loadResults(modeKey.split(',') as TypingMode[]).then(items => { if (live) setRecords(items); }).catch(() => { if (live) setRecords([]); });
    return () => { live = false; };
  }, [isOpen, modeKey, record]);

  // Focus starts on Try again (Enter retries), Tab stays inside, and Escape closes.
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    queueMicrotask(() => dialog?.querySelector<HTMLElement>('.results-retry')?.focus());
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
  }, [isOpen]);

  const summary = useMemo(() => {
    if (!record || !records) return null;
    return summariseAttempt(record, records.filter(item => match?.(item) ?? true));
  }, [record, records, match]);

  if (!isOpen || !stats || typeof document === 'undefined') return null;

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
  const weakKeys = analysis?.weak.map(item => item.key) ?? [];
  const delta = summary?.deltaWpm ?? null;
  const chip = !summary ? null
    : summary.isPersonalBest ? <span className="rr-compare is-best"><Trophy aria-hidden="true" />New best</span>
      : delta === null ? <span className="rr-compare">First attempt</span>
        : <span className={`rr-compare ${delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : ''}`}>{delta > 0 ? '+' : ''}{delta} vs average</span>;

  return createPortal(
    <div className="results-scrim" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="results-modal"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: spring.soft }}
      >
        <header className="results-head">
          <div><p className="eyebrow">{eyebrow}</p><h2 id={titleId}>{title}</h2></div>
          <div className="rr-dialog-head-side">
            <span className="results-time">{stats.timeElapsed}s</span>
            <button type="button" className="rr-icon" aria-label="Close results" onClick={onClose}><X aria-hidden="true" /></button>
          </div>
        </header>

        <div className="results-hero">
          <div className="results-wpm-block">
            <div className="results-wpm"><AnimatedNumber value={stats.wpm} className="results-wpm-value" /><span className="results-wpm-unit">wpm</span></div>
            {chip}
          </div>
          <div className="results-stats">
            {figures.map((item, index) => <motion.div key={item.label} className="results-stat" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 * index, duration: 0.24, ease: ease.outExpo } }}>
              <small>{item.label}</small><strong>{item.value}</strong>
            </motion.div>)}
          </div>
        </div>

        <div className="results-tabs">
          <Segmented label="Show" layoutId="results-pane" value={pane} options={[{ value: 'feedback', label: 'Feedback' }, { value: 'details', label: 'This run' }]} onChange={value => setPane(value as 'feedback' | 'details')} />
        </div>

        {pane === 'feedback'
          ? <div className="results-feedback">
            <p className="results-advice"><Target aria-hidden="true" />{analysis?.advice ?? (stats.accuracy < 92 ? 'Slow down a little: clean keystrokes build speed faster than corrections.' : 'A steady run. Keep the same easy rhythm.')}</p>
            <div className="results-feedback-grid">
              <section className="results-panel" aria-labelledby={`${titleId}-keys`}>
                <h3 id={`${titleId}-keys`}>Keys to work on</h3>
                {analysis && analysis.weak.length
                  ? <ul className="results-keylist">{analysis.weak.map(item => <li key={item.key}>
                    <kbd>{item.key.toUpperCase()}</kbd>
                    <span className="results-keylist-figures">
                      <strong>{item.misses ? `${item.misses} of ${item.attempts} missed` : `${item.attempts} presses`}</strong>
                      {item.avgMs > 0 && <small>{item.avgMs} ms a press</small>}
                    </span>
                    <span className={`results-trend is-${item.trend}`} title={TREND[item.trend].label}>{TREND[item.trend].icon}<span>{TREND[item.trend].label}</span></span>
                  </li>)}</ul>
                  : <p className="results-clean">No key stood out. A clean, even run.</p>}
                {analysis?.finger && <p className="results-finger">Weakest finger: <strong>{analysis.finger.finger}</strong>{analysis.finger.misses ? ` · ${analysis.finger.misses} ${analysis.finger.misses === 1 ? 'miss' : 'misses'}` : ''}{analysis.finger.avgMs ? ` · ${analysis.finger.avgMs} ms` : ''}</p>}
              </section>
              <section className="results-panel" aria-labelledby={`${titleId}-compare`}>
                <h3 id={`${titleId}-compare`}>Compared with your runs</h3>
                {summary
                  ? <>
                    <dl className="results-compare">
                      <div><dt>Best</dt><dd>{summary.bestWpm}<small>wpm</small></dd></div>
                      <div><dt>Average</dt><dd>{summary.averageWpm ?? '—'}<small>{summary.averageAccuracy === null ? 'last 10' : `wpm · ${summary.averageAccuracy}%`}</small></dd></div>
                      <div><dt>Runs</dt><dd>{summary.attempts}<small>#{summary.rank} fastest</small></dd></div>
                    </dl>
                    {summary.trend.length > 1 ? <Sparkline values={summary.trend} className="rr-spark is-wide" label="Speed across your recent runs" /> : <p className="results-clean">Your trend appears after a second run.</p>}
                  </>
                  : <p className="results-clean">{record ? 'Loading your history…' : 'Your history appears here once results are saved.'}</p>}
              </section>
            </div>
          </div>
          : <div className="results-details">
            <SpeedChart stats={stats} />
            <dl className="results-chars">
              {characters.map(item => <div key={item.label} className={item.tone}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
            </dl>
            {hasErrors
              ? <VirtualKeyboardHeatmap errorHeatmap={stats.errorHeatmap} showFingers={false} label="Keys missed in this run" />
              : <p className="results-clean">No missed keys. A clean run.</p>}
          </div>}

        <div className="results-actions">
          <button type="button" className="rs-btn results-retry" onClick={onRetry}><RotateCcw aria-hidden="true" />Try again<span className="results-keys" aria-hidden="true"><kbd>Enter</kbd></span></button>
          {onPractise && weakKeys.length > 0 && <button type="button" className="rs-btn" onClick={() => onPractise(weakKeys)}><Target aria-hidden="true" />Practise {weakKeys.map(key => key.toUpperCase()).join(' ')}</button>}
          {onOpenLesson && analysis?.lesson && <button type="button" className="rs-btn" onClick={() => onOpenLesson(analysis.lesson!.id)}><BookOpen aria-hidden="true" />Lesson: {analysis.lesson.title}</button>}
          {onNext && <button type="button" className="rs-btn is-primary" onClick={onNext}>{nextLabel}<ArrowRight aria-hidden="true" /></button>}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
