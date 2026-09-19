'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, CloudRain, Flag, Heart, Play, RotateCcw, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserSettings, TypingStats } from '@/types';
import { createClientId, db } from '@/lib/db';
import { COMMON_WORDS_200 } from '@/data/word-lists';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LeaderboardView } from '@/components/analytics/LeaderboardView';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { arcadeBests } from '@/lib/profile-stats';

interface ArcadeViewProps { settings: UserSettings; onKeyPress: (key: string) => void; }
type ArcadeGame = 'alphabet' | 'word-rain' | 'ghost-racer';
type ArcadeTab = 'play' | 'daily' | 'leaderboard';

const GAMES: Array<{ id: ArcadeGame; record: string; label: string; description: string; icon: React.ReactNode }> = [
  { id: 'alphabet', record: 'alphabet-sprint', label: 'Alphabet Sprint', description: 'Race from A to Z. Every wrong key costs you time.', icon: <Zap aria-hidden="true" /> },
  { id: 'word-rain', record: 'word-rain', label: 'Word Rain', description: 'Type falling words before they cross the line.', icon: <CloudRain aria-hidden="true" /> },
  { id: 'ghost-racer', record: 'ghost-racer', label: 'Ghost Racer', description: 'Beat a steady rival to the end of a sentence.', icon: <Flag aria-hidden="true" /> }
];

export const ArcadeView: React.FC<ArcadeViewProps> = ({ settings, onKeyPress }) => {
  const [activeGame, setActiveGame] = useState<ArcadeGame>('alphabet');
  const [view, setView] = useState<ArcadeTab>('play');
  const [dailyDate, setDailyDate] = useState('');
  const [version, setVersion] = useState(0);
  const [bests, setBests] = useState(() => arcadeBests([]));

  useEffect(() => {
    let cancelled = false;
    void db.arcadeScores.toArray().then(scores => { if (!cancelled) setBests(arcadeBests(scores)); }).catch(() => {});
    return () => { cancelled = true; };
  }, [version]);

  const recorded = useCallback(() => setVersion(value => value + 1), []);
  const changeView = (next: ArcadeTab) => {
    if (next === 'daily') {
      const today = new Date();
      setDailyDate(today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
      setActiveGame(GAMES[today.getDate() % GAMES.length].id);
    }
    setView(next);
  };
  const game = GAMES.find(item => item.id === activeGame) ?? GAMES[0];

  return (
    <section className="speed-shell arcade-shell">
      <SectionHeader eyebrow="Play with purpose" title="Arcade" tabs={[{ id: 'play', label: 'Play' }, { id: 'daily', label: 'Daily' }, { id: 'leaderboard', label: 'Records' }]} active={view} onChange={changeView} layoutId="arcade-tab" />
      {view === 'leaderboard' ? <LeaderboardView embedded /> : <>
        {view === 'daily'
          ? <div className="arc-daily">
            <span className="arc-daily-icon">{game.icon}</span>
            <div><p className="eyebrow">Today’s challenge · {dailyDate}</p><h2>{game.label}</h2><p>{game.description} One focused round; tomorrow brings a different game.</p></div>
          </div>
          : <div className="arc-games" role="group" aria-label="Choose a game">
            {GAMES.map(item => {
              const best = bests.find(entry => entry.id === item.record)?.best;
              return <button key={item.id} type="button" className="arc-game" aria-pressed={activeGame === item.id} onClick={() => setActiveGame(item.id)}>
                <span className="arc-game-icon">{item.icon}</span>
                <span className="arc-game-text"><strong>{item.label}</strong><small>{item.description}</small></span>
                <span className="arc-game-best">{best ? <>Best <b>{best}</b></> : 'Not played yet'}</span>
              </button>;
            })}
          </div>}
        {activeGame === 'alphabet' && <AlphabetSprint onKeyPress={onKeyPress} onRecorded={recorded} />}
        {activeGame === 'word-rain' && <WordRain onKeyPress={onKeyPress} onRecorded={recorded} />}
        {activeGame === 'ghost-racer' && <GhostRacer settings={settings} onKeyPress={onKeyPress} onRecorded={recorded} />}
      </>}
    </section>
  );
};

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="arc-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function AlphabetSprint({ onKeyPress, onRecorded }: { onKeyPress: (key: string) => void; onRecorded: () => void }) {
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

interface FallingWord { id: number; word: string; x: number; y: number; speed: number; }

function WordRain({ onKeyPress, onRecorded }: { onKeyPress: (key: string) => void; onRecorded: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [input, setInput] = useState('');
  const [words, setWords] = useState<FallingWord[]>([]);
  const idRef = useRef(0);
  const scoreRef = useRef(0);
  const startRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const finish = useCallback((finalScore: number, duration: number) => {
    setPlaying(false);
    void db.arcadeScores.add({ clientId: createClientId(), game: 'word-rain', score: finalScore, wpm: 0, accuracy: 100, timeMs: duration, timestamp: Date.now() }).then(onRecorded).catch(() => {});
  }, [onRecorded]);

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      setWords(previous => {
        const missed = previous.filter(word => word.y + word.speed >= 91).length;
        let next = previous.filter(word => word.y + word.speed < 91).map(word => ({ ...word, y: word.y + word.speed }));
        if (Math.random() < .22 && next.length < 7) next = [...next, { id: idRef.current++, word: COMMON_WORDS_200[Math.floor(Math.random() * COMMON_WORDS_200.length)], x: 5 + Math.random() * 78, y: 0, speed: .65 + Math.random() * .65 }];
        if (missed) queueMicrotask(() => setLives(current => {
          const remaining = Math.max(0, current - missed);
          if (remaining === 0) finish(scoreRef.current, Date.now() - startRef.current);
          return remaining;
        }));
        return next;
      });
    }, 100);
    const visibility = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', visibility);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', visibility); };
  }, [finish, playing]);

  const start = () => {
    scoreRef.current = 0; startRef.current = Date.now();
    setScore(0); setLives(3); setInput(''); setWords([]); setPlaying(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const change = (value: string) => {
    const normalized = value.trim().toLowerCase();
    setInput(normalized);
    const matched = words.find(word => word.word.toLowerCase() === normalized);
    if (!matched) return;
    const nextScore = scoreRef.current + 100;
    scoreRef.current = nextScore; setScore(nextScore); setWords(previous => previous.filter(word => word.id !== matched.id)); setInput('');
  };

  return (
    <div className="arc-stage arc-rain">
      <div className="arc-rain-bar">
        <div className="arc-lives" role="img" aria-label={`${lives} of 3 lives left`}>{[0, 1, 2].map(value => <Heart key={value} aria-hidden="true" data-lost={value >= lives || undefined} />)}</div>
        <Metric label="Score" value={String(score)} />
      </div>
      <div className="arc-rain-field">
        <div className="arc-rain-line" aria-hidden="true" />
        {words.map(word => <span key={word.id} className="arc-word" data-match={(input && word.word.startsWith(input)) || undefined} style={{ left: `${word.x}%`, top: `${word.y}%` }}>{word.word}</span>)}
        {!playing && <div className="arc-overlay"><div>
          <p className="eyebrow">Defend the archive</p>
          <h2>Word Rain</h2>
          <p>Type each word before it crosses the line. Three misses end the round.</p>
          <button type="button" onClick={start} className="rs-btn is-primary"><Play aria-hidden="true" />{score ? 'Play again' : 'Begin'}</button>
        </div></div>}
      </div>
      {playing && <input ref={inputRef} value={input} onKeyDown={event => onKeyPress(event.key)} onChange={event => change(event.target.value)} autoCapitalize="off" autoComplete="off" spellCheck={false} placeholder="Type the falling word…" aria-label="Type a falling word" className="arc-input" />}
    </div>
  );
}

const RACE_TEXT = 'In the middle of difficulty lies opportunity. Keep typing steadily and conquer the ghost.';

function GhostRacer({ settings, onKeyPress, onRecorded }: ArcadeViewProps & { onRecorded: () => void }) {
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
