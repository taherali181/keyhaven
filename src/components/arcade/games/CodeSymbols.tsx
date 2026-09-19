'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { TypingStats } from '@/types';
import { createClientId, db } from '@/lib/db';
import { createRandom } from '@/lib/academy/generate';
import { snippetRound } from '@/lib/arcade';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { Metric, type GameProps } from '../ArcadeBits';

/** Score for a round: speed weighted by accuracy, so a clean round beats a fast, sloppy one. */
const roundScore = (stats: TypingStats) => Math.round(stats.wpm * stats.accuracy);

/** Code Symbols: short lines of code, full of the brackets, operators and quotes that slow everyone down. */
export function CodeSymbols({ settings, onKeyPress, onRecorded, seed }: GameProps) {
  const [round, setRound] = useState(0);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<{ score: number; stats: TypingStats } | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const bestRef = useRef<number | null>(null);
  const text = useMemo(() => snippetRound(createRandom(`${seed}:code:${round}`)), [seed, round]);

  useEffect(() => {
    void db.arcadeScores.where('game').equals('code-symbols').toArray().then(scores => {
      if (!scores.length) return;
      bestRef.current = Math.max(...scores.map(score => score.score));
      setBest(bestRef.current);
    }).catch(() => {});
  }, []);

  const complete = useCallback((stats: TypingStats) => {
    const score = roundScore(stats);
    setResult({ score, stats });
    const previous = bestRef.current;
    if (previous === null || score > previous) {
      if (previous !== null) confetti({ particleCount: 55, spread: 65 });
      bestRef.current = score;
      setBest(score);
    }
    void db.arcadeScores.add({ clientId: createClientId(), game: 'code-symbols', score, wpm: stats.wpm, accuracy: stats.accuracy, timeMs: Math.round(stats.timeElapsed * 1000), timestamp: Date.now() }).then(onRecorded).catch(() => {});
  }, [onRecorded]);

  const engine = useTypingEngine({ targetText: text, sessionKey: `code-${seed}-${round}`, onComplete: complete, onKeyPress });
  const next = () => { setResult(null); setRound(value => value + 1); setStarted(true); };

  return <div className="arc-stage arc-code">
    <div className="arc-metrics">
      <Metric label="Speed" value={`${engine.wpm} wpm`} />
      <Metric label="Accuracy" value={`${engine.accuracy}%`} />
      <Metric label="Best score" value={best === null ? '—' : String(best)} />
    </div>
    {!started
      ? <div className="arc-race-start"><button type="button" className="rs-btn is-primary" onClick={() => setStarted(true)}><Play aria-hidden="true" />Start coding</button></div>
      : <TypingArea targetText={text} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font="jetbrains" fontSize={settings.fontSize} wrapMode="whole-word" onKeyDown={result ? event => event.preventDefault() : engine.handleKeyDown} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={engine.handleCompositionEnd} onReset={() => engine.reset()} />}
    {result && <div className="arc-result" data-result="won" role="status">
      <p>Round score <strong>{result.score}</strong> · {result.stats.wpm} wpm at {result.stats.accuracy}%</p>
      <button type="button" className="rs-btn" onClick={next}>Next round<ArrowRight aria-hidden="true" /></button>
    </div>}
    <p className="arc-rules">Score is speed × accuracy. Mistakes stay on the page, so aim clean.</p>
  </div>;
}
