'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { createClientId, db } from '@/lib/db';
import { createRandom } from '@/lib/academy/generate';
import { generateRandomWords } from '@/data/word-lists';
import { Metric, type GameProps } from '../ArcadeBits';

const WINDOW_BEHIND = 26;
const WINDOW_AHEAD = 44;
const show = (character: string | undefined) => (character === ' ' ? '␣' : character ?? '');

/** Accuracy Streak: type for as long as you can. One wrong key ends the run. */
export function AccuracyStreak({ onKeyPress, onRecorded, seed }: GameProps) {
  const [attempt, setAttempt] = useState(0);
  const [position, setPosition] = useState(0);
  const [status, setStatus] = useState<'ready' | 'playing' | 'over'>('ready');
  const [miss, setMiss] = useState<{ expected: string; typed: string } | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const bestRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const text = useMemo(() => generateRandomWords(600, false, false, createRandom(`${seed}:streak:${attempt}`)), [seed, attempt]);
  const words = (text.slice(0, position).match(/ /g) ?? []).length;

  useEffect(() => {
    surfaceRef.current?.focus({ preventScroll: true });
    void db.arcadeScores.where('game').equals('accuracy-streak').toArray().then(scores => {
      if (!scores.length) return;
      bestRef.current = Math.max(...scores.map(score => score.score));
      setBest(bestRef.current);
    }).catch(() => {});
  }, []);

  const end = (expected: string, typed: string) => {
    setStatus('over');
    setMiss({ expected, typed });
    const elapsed = Math.max(1, performance.now() - startRef.current);
    const previous = bestRef.current;
    if (previous === null || words > previous) {
      if (previous !== null && words > 0) confetti({ particleCount: 55, spread: 65 });
      bestRef.current = words;
      setBest(words);
    }
    void db.arcadeScores.add({
      clientId: createClientId(), game: 'accuracy-streak', score: words, wpm: Math.round((position / 5) / (elapsed / 60_000)),
      accuracy: Math.round((position / (position + 1)) * 1000) / 10, timeMs: Math.round(elapsed), timestamp: Date.now()
    }).then(onRecorded).catch(() => {});
  };

  const handleKey = (event: React.KeyboardEvent) => {
    if (status === 'over' || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    event.preventDefault();
    onKeyPress(event.key);
    const expected = text[position];
    if (event.key !== expected) { end(expected, event.key); return; }
    if (status === 'ready') { startRef.current = performance.now(); setStatus('playing'); }
    setPosition(value => value + 1);
  };

  const restart = () => {
    setAttempt(value => value + 1); setPosition(0); setStatus('ready'); setMiss(null);
    requestAnimationFrame(() => surfaceRef.current?.focus({ preventScroll: true }));
  };

  return <div ref={surfaceRef} tabIndex={0} onKeyDown={handleKey} className="arc-stage arc-streak" role="group" aria-label="Accuracy Streak" data-status={status}>
    <div className="arc-metrics">
      <Metric label="Streak" value={`${words} ${words === 1 ? 'word' : 'words'}`} />
      <Metric label="Best" value={best === null ? '—' : `${best} ${best === 1 ? 'word' : 'words'}`} />
    </div>
    <div className="arc-tape" aria-hidden="true">
      <span className="arc-tape-done"><span>{text.slice(Math.max(0, position - WINDOW_BEHIND), position)}</span></span>
      <span className="arc-tape-current" data-miss={miss ? true : undefined}>{status === 'over' && miss ? show(miss.typed) : text[position] === ' ' ? ' ' : text[position]}</span>
      <span className="arc-tape-next">{text.slice(position + 1, position + 1 + WINDOW_AHEAD)}</span>
    </div>
    {status === 'over' && miss
      ? <div className="arc-result" data-result="lost" role="status">
        <p>The streak ends at <strong>{words} {words === 1 ? 'word' : 'words'}</strong>: <kbd>{show(miss.expected)}</kbd> was next, <kbd>{show(miss.typed)}</kbd> was typed.</p>
        <button type="button" className="rs-btn" onClick={restart}><RotateCcw aria-hidden="true" />Try again</button>
      </div>
      : <p className="arc-focus-hint">{status === 'ready' ? 'Click here, then start typing. One wrong key ends it.' : 'Steady beats fast.'}</p>}
  </div>;
}
