'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { createClientId, db } from '@/lib/db';
import { Metric, type GameProps } from '../ArcadeBits';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

export function AlphabetSprint({ onKeyPress, onRecorded }: GameProps) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    surfaceRef.current?.focus({ preventScroll: true });
    void db.arcadeScores.where('game').equals('alphabet-sprint').toArray().then(scores => {
      if (scores.length) setBest(Math.min(...scores.map(score => score.timeMs)));
    });
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, []);

  const restart = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    startRef.current = null;
    setIndex(0); setElapsed(0); setMistakes(0); setFinished(false);
    requestAnimationFrame(() => surfaceRef.current?.focus({ preventScroll: true }));
  };

  const handleKey = (event: React.KeyboardEvent) => {
    if (finished || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    const key = event.key.toLowerCase();
    event.preventDefault(); onKeyPress(key);
    if (key !== ALPHABET[index]) { setMistakes(value => value + 1); return; }
    const now = performance.now();
    if (startRef.current === null) {
      startRef.current = now;
      intervalRef.current = window.setInterval(() => setElapsed(performance.now() - (startRef.current ?? performance.now())), 16);
    }
    if (index < ALPHABET.length - 1) { setIndex(value => value + 1); return; }
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    const finalTime = now - (startRef.current ?? now);
    const accuracy = Math.round((26 / (26 + mistakes)) * 1000) / 10;
    setElapsed(finalTime); setFinished(true);
    void db.arcadeScores.add({
      clientId: createClientId(), game: 'alphabet-sprint', score: Math.round(100000 / Math.max(1, finalTime)),
      wpm: Math.round((26 / 5) / (finalTime / 60000)), accuracy, timeMs: Math.round(finalTime), timestamp: Date.now()
    }).then(onRecorded).catch(() => {});
    if (!best || finalTime < best) { setBest(finalTime); confetti({ particleCount: 60, spread: 70 }); }
  };

  return (
    <div ref={surfaceRef} tabIndex={0} onKeyDown={handleKey} className="arc-stage arc-sprint" role="group" aria-label="Alphabet Sprint">
      <div className="arc-metrics"><Metric label="Time" value={`${(elapsed / 1000).toFixed(2)}s`} /><Metric label="Mistakes" value={String(mistakes)} /><Metric label="Personal best" value={best ? `${(best / 1000).toFixed(2)}s` : '—'} /></div>
      <p className="eyebrow arc-prompt">{finished ? 'Sprint complete' : 'Next letter'}</p>
      <div className="arc-letter" data-finished={finished || undefined}>{finished ? <Check aria-label="Complete" /> : ALPHABET[index].toUpperCase()}</div>
      <div className="arc-strip">{ALPHABET.map((letter, letterIndex) => <span key={letter} data-state={letterIndex < index || finished ? 'done' : letterIndex === index ? 'current' : undefined}>{letter.toUpperCase()}</span>)}</div>
      <p className="arc-focus-hint">Click here, then type the alphabet</p>
      <button type="button" onClick={restart} className="rs-btn"><RotateCcw aria-hidden="true" />Reset sprint</button>
    </div>
  );
}
