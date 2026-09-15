'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, ChevronUp, Maximize2, RotateCcw, X } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { describeKey } from '@/components/typing/VirtualKeyboardHeatmap';
import { spring } from '@/lib/motion';
import { ComparisonChip, missedKeys, Sparkline } from './ResultBits';
import { ResultDialog } from './ResultDialog';
import { focusTyping, type ReaderResult, type ResultPopupState } from './useResultPopup';

/** How long an untouched result stays open before tucking into the chip. */
const IDLE_MS = 15_000;

function ResultToast({ result, onNext, onRetry, onDetails, onDismiss }: { result: ReaderResult; onNext: () => void; onRetry: () => void; onDetails: () => void; onDismiss: () => void }) {
  const reduce = useReducedMotion();
  const headingId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; });

  // Left alone, the result tucks itself away; hovering or focusing it holds it open.
  const paused = hovered || focused || expanded;
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => dismissRef.current(), IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [paused, result]);

  const { stats, summary } = result;
  const misses = missedKeys(stats.errorHeatmap);
  const details = [
    { label: 'Raw', value: `${stats.rawWpm}`, unit: 'wpm' },
    { label: 'Consistency', value: `${stats.consistency}`, unit: '%' },
    { label: 'Time', value: `${stats.timeElapsed}`, unit: 's' },
    { label: 'Errors', value: `${stats.incorrectChars}`, unit: stats.missedChars ? `+${stats.missedChars} missed` : '' }
  ];

  return <motion.div
    className="rr-toast theme-chrome"
    role="group"
    aria-labelledby={headingId}
    data-expanded={expanded ? 'true' : undefined}
    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1, transition: spring.soft }}
    exit={reduce ? { opacity: 0, transition: { duration: 0.12 } } : { opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.14 } }}
    onPointerEnter={() => setHovered(true)}
    onPointerLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
    onClick={event => { if (!(event.target as HTMLElement).closest('button')) onDetails(); }}
  >
    <p className="sr-only" role="status">{`${result.heading}. ${stats.wpm} words per minute, ${stats.accuracy}% accuracy.`}</p>
    <div className="rr-toast-head">
      <span className="rr-toast-check" aria-hidden="true"><Check /></span>
      <div className="rr-toast-title">
        <strong id={headingId}>{result.heading}</strong>
        <small>{result.title}</small>
      </div>
      <button type="button" className="rr-icon" aria-label={expanded ? 'Show less' : 'Show more'} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}><ChevronUp aria-hidden="true" /></button>
      <button type="button" className="rr-icon" aria-label="Dismiss result" onClick={() => { onDismiss(); focusTyping(); }}><X aria-hidden="true" /></button>
    </div>

    {/* The extra detail sits above the headline figures, so the card grows upward from the bar. */}
    <div className="rr-toast-more">
      <div className="rr-toast-more-inner">
        <dl className="rr-toast-grid">
          {details.map(item => <div key={item.label}><dt>{item.label}</dt><dd><strong>{item.value}</strong>{item.unit && <small>{item.unit}</small>}</dd></div>)}
        </dl>
        <div className="rr-toast-extra">
          <div className="rr-toast-misses">
            <small>Missed keys</small>
            {misses.length
              ? <span>{misses.map(([key, count]) => <kbd key={key} title={`${describeKey(key)}: ${count}`}>{key === ' ' ? '␣' : key}<i>{count}</i></kbd>)}</span>
              : <span className="rr-muted">None, clean run</span>}
          </div>
          <div className="rr-toast-trend">
            <small>{summary.attempts > 1 ? `Last ${Math.min(summary.trend.length, summary.attempts)} attempts` : 'Your trend starts here'}</small>
            <Sparkline values={summary.trend} label={summary.trend.length > 1 ? `Recent speeds: ${summary.trend.join(', ')} wpm` : undefined} />
          </div>
        </div>
      </div>
    </div>

    <div className="rr-toast-figures">
      <span className="rr-figure is-hero"><AnimatedNumber value={stats.wpm} /><small>wpm</small></span>
      <span className="rr-figure"><strong>{stats.accuracy}%</strong><small>accuracy</small></span>
      <ComparisonChip result={result} />
    </div>

    <div className="rr-toast-actions">
      <button type="button" className="rr-link" onClick={onDetails}><Maximize2 aria-hidden="true" />Details</button>
      <span className="rr-spacer" />
      <button type="button" className="rs-btn" onClick={onRetry} title="Retry (Tab, Enter)"><RotateCcw aria-hidden="true" />Retry</button>
      <button type="button" className="rs-btn is-primary" onClick={onNext}>{result.nextLabel}<kbd aria-hidden="true">Enter</kbd><ArrowRight aria-hidden="true" /></button>
    </div>
  </motion.div>;
}

/**
 * Everything the bottom bar shows about a finished part: the result card above the bar, the chip it tucks into,
 * and the full dialog. Rendered inside the bar's dock.
 */
export function ResultPopup({ popup, onNext, onRetry }: { popup: ResultPopupState; onNext: () => void; onRetry: () => void }) {
  const { result, view } = popup;
  const next = () => { onNext(); requestAnimationFrame(focusTyping); };
  const retry = () => { onRetry(); requestAnimationFrame(focusTyping); };
  return <>
    <AnimatePresence>
      {result && view === 'toast' && <ResultToast key={result.record.clientId} result={result} onNext={next} onRetry={retry} onDetails={popup.openDetails} onDismiss={popup.collapse} />}
    </AnimatePresence>
    <AnimatePresence>
      {result && view === 'chip' && <motion.button
        key="chip"
        type="button"
        className="rr-chip glass"
        onClick={popup.reopen}
        aria-label={`Last result: ${result.stats.wpm} wpm, ${result.stats.accuracy}% accuracy`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, transition: spring.snappy }}
        exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
      >
        <Check aria-hidden="true" /><span>Last result</span><strong>{result.stats.wpm}</strong><small>wpm</small>
      </motion.button>}
    </AnimatePresence>
    {result && <ResultDialog open={popup.detailsOpen} result={result} onClose={popup.closeDetails} onNext={() => { popup.closeDetails(); next(); }} onRetry={() => { popup.closeDetails(); retry(); }} />}
  </>;
}
