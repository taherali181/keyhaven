'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { TypingStats } from '@/types';
import { createClientId, db } from '@/lib/db';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { GlassSelect } from '@/components/ui/GlassSelect';
import type { GameProps } from '../ArcadeBits';

const RACE_TEXT = 'In the middle of difficulty lies opportunity. Keep typing steadily and conquer the ghost.';

export function GhostRacer({ settings, onKeyPress, onRecorded }: GameProps) {
  const [ghostWpm, setGhostWpm] = useState(60);
  const [racing, setRacing] = useState(false);
  const [ghostProgress, setGhostProgress] = useState(0);
  const [result, setResult] = useState<'won' | 'lost' | null>(null);
  const ghostRef = useRef(0);
  const raceStartRef = useRef(0);

  const complete = useCallback((stats: TypingStats) => {
    const won = ghostRef.current < 100 && stats.missedChars === 0;
    setRacing(false); setResult(won ? 'won' : 'lost');
    if (won) confetti({ particleCount: 55, spread: 65 });
    void db.arcadeScores.add({ clientId: createClientId(), game: 'ghost-racer', score: won ? Math.round(stats.wpm * stats.accuracy) : 0, wpm: stats.wpm, accuracy: stats.accuracy, timeMs: Math.round(stats.timeElapsed * 1000), timestamp: Date.now() }).then(onRecorded).catch(() => {});
  }, [onRecorded]);

  const engine = useTypingEngine({ targetText: RACE_TEXT, strictMode: true, sessionKey: `ghost-${ghostWpm}`, onComplete: complete, onKeyPress });
  const finishRace = engine.finishTest;

  useEffect(() => {
    if (!racing) return;
    const wordCount = RACE_TEXT.split(/\s+/).length;
    const duration = (wordCount / ghostWpm) * 60_000;
    const interval = window.setInterval(() => {
      const progress = Math.min(100, ((performance.now() - raceStartRef.current) / duration) * 100);
      ghostRef.current = progress; setGhostProgress(progress);
      if (progress >= 100) { window.clearInterval(interval); finishRace(); }
    }, 50);
    return () => window.clearInterval(interval);
  }, [finishRace, ghostWpm, racing]);

  const start = () => {
    engine.reset(); ghostRef.current = 0; raceStartRef.current = performance.now();
    setGhostProgress(0); setResult(null); setRacing(true);
  };
  const userProgress = Math.min(100, (engine.typed.length / RACE_TEXT.length) * 100);
  return (
    <div className="arc-stage arc-race">
      <header className="arc-race-head">
        <div><p className="eyebrow">Head to head</p><h2>Ghost Racer</h2></div>
        <div className="arc-pace">
          <span>Rival pace</span>
          <GlassSelect value={ghostWpm} align="right" disabled={racing} ariaLabel="Rival pace" onChange={value => setGhostWpm(Number(value))} options={[40, 60, 80, 100, 120].map(wpm => ({ value: wpm, label: `${wpm} wpm` }))} />
        </div>
      </header>
      <div className="arc-lanes">
        <RaceLane label="You" progress={userProgress} accent />
        <RaceLane label={`Ghost · ${ghostWpm} wpm`} progress={ghostProgress} />
      </div>
      {!racing && !result && <div className="arc-race-start"><button type="button" onClick={start} className="rs-btn is-primary"><Play aria-hidden="true" />Start race</button></div>}
      {(racing || result) && <TypingArea targetText={RACE_TEXT} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font={settings.font} fontSize={settings.fontSize} wrapMode="whole-word" onKeyDown={racing ? engine.handleKeyDown : event => event.preventDefault()} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={racing ? engine.handleCompositionEnd : undefined} onReset={start} />}
      {result && <div className="arc-result" data-result={result} role="status"><p>{result === 'won' ? 'You outran the ghost.' : 'The ghost reached the line first.'}</p><button type="button" onClick={start} className="rs-btn"><RotateCcw aria-hidden="true" />Race again</button></div>}
    </div>
  );
}

function RaceLane({ label, progress, accent = false }: { label: string; progress: number; accent?: boolean }) {
  return <div className="arc-lane">
    <div className="arc-lane-label"><span>{label}</span><span>{Math.round(progress)}%</span></div>
    <div className="arc-lane-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><i data-accent={accent || undefined} style={{ transform: `scaleX(${progress / 100})` }} /></div>
  </div>;
}
