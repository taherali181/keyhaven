'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Flag, Heart, Play, RotateCcw, Timer, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserSettings, TypingStats } from '@/types';
import { createClientId, db } from '@/lib/db';
import { COMMON_WORDS_200 } from '@/data/word-lists';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LeaderboardView } from '@/components/analytics/LeaderboardView';
import { GlassSelect } from '@/components/ui/GlassSelect';

interface ArcadeViewProps { settings: UserSettings; onKeyPress: (key: string) => void; }
type ArcadeGame = 'alphabet' | 'word-rain' | 'ghost-racer';

export const ArcadeView: React.FC<ArcadeViewProps> = ({ settings, onKeyPress }) => {
  const [activeGame, setActiveGame] = useState<ArcadeGame>('alphabet');
  const [view, setView] = useState<'play' | 'daily' | 'leaderboard'>('play');
  const games: Array<{ id: ArcadeGame; label: string; icon: React.ReactNode }> = [
    { id: 'alphabet', label: 'Alphabet Sprint', icon: <Zap /> },
    { id: 'word-rain', label: 'Word Rain', icon: <Timer /> },
    { id: 'ghost-racer', label: 'Ghost Racer', icon: <Flag /> }
  ];
  return (
    <section className="speed-shell arcade-shell">
      <header className="section-header academy-title"><div><p className="eyebrow">Play with purpose</p><h1>Arcade</h1></div><nav><button className={view === 'play' ? 'active' : ''} onClick={() => setView('play')}>Play</button><button className={view === 'daily' ? 'active' : ''} onClick={() => { setView('daily'); setActiveGame((['alphabet', 'word-rain', 'ghost-racer'] as ArcadeGame[])[new Date().getDate() % 3]); }}>Daily</button><button className={view === 'leaderboard' ? 'active' : ''} onClick={() => setView('leaderboard')}>Records</button></nav></header>
      {view === 'leaderboard' ? <LeaderboardView embedded /> : <>
        {view === 'daily' && <div className="daily-arcade"><span>Today’s challenge</span><strong>{games.find(game => game.id === activeGame)?.label}</strong><small>One focused round. Come back tomorrow for a different game.</small></div>}
        {view === 'play' && <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)] pb-5 mb-7">
          {games.map(game => <button key={game.id} onClick={() => setActiveGame(game.id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold [&_svg]:h-3.5 [&_svg]:w-3.5 ${activeGame === game.id ? 'bg-[var(--color-highlight)] text-[var(--color-accent)]' : 'text-[var(--text-secondary)]'}`}>{game.icon}{game.label}</button>)}
        </div>}
      {activeGame === 'alphabet' && <AlphabetSprint onKeyPress={onKeyPress} />}
      {activeGame === 'word-rain' && <WordRain onKeyPress={onKeyPress} />}
      {activeGame === 'ghost-racer' && <GhostRacer settings={settings} onKeyPress={onKeyPress} />}
      </>}
    </section>
  );
};

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

function AlphabetSprint({ onKeyPress }: { onKeyPress: (key: string) => void }) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    surfaceRef.current?.focus();
    void db.arcadeScores.where('game').equals('alphabet-sprint').toArray().then(scores => {
      if (scores.length) setBest(Math.min(...scores.map(score => score.timeMs)));
    });
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, []);

  const restart = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    startRef.current = null;
    setIndex(0); setElapsed(0); setMistakes(0); setFinished(false);
    requestAnimationFrame(() => surfaceRef.current?.focus());
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
    });
    if (!best || finalTime < best) { setBest(finalTime); confetti({ particleCount: 60, spread: 70 }); }
  };

  return (
    <div ref={surfaceRef} tabIndex={0} onKeyDown={handleKey} className="editorial-panel p-6 text-center sm:p-10">
      <div className="mx-auto flex max-w-xl justify-between border-b border-[var(--color-border)] pb-5 text-left"><Metric label="Time" value={`${(elapsed / 1000).toFixed(2)}s`} /><Metric label="Mistakes" value={String(mistakes)} /><Metric label="Personal best" value={best ? `${(best / 1000).toFixed(2)}s` : '—'} /></div>
      <p className="eyebrow mt-10">{finished ? 'Sprint complete' : 'Next letter'}</p>
      <div className="mx-auto my-5 grid h-28 w-28 place-items-center border border-[var(--color-accent)] bg-[var(--color-highlight)] font-mono text-5xl text-[var(--color-accent)]">{finished ? '✓' : ALPHABET[index].toUpperCase()}</div>
      <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-1.5">{ALPHABET.map((letter, letterIndex) => <span key={letter} className={`grid h-7 w-7 place-items-center rounded text-[10px] font-bold ${letterIndex < index || finished ? 'bg-[var(--color-correct)] text-[var(--bg-primary)]' : letterIndex === index ? 'bg-[var(--color-accent)] text-[var(--bg-primary)]' : 'border border-[var(--color-border)] text-[var(--text-muted)]'}`}>{letter.toUpperCase()}</span>)}</div>
      <button onClick={restart} className="mt-9 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--text-secondary)]"><RotateCcw className="h-3.5 w-3.5" />Reset sprint</button>
    </div>
  );
}

interface FallingWord { id: number; word: string; x: number; y: number; speed: number; }

function WordRain({ onKeyPress }: { onKeyPress: (key: string) => void }) {
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
    void db.arcadeScores.add({ clientId: createClientId(), game: 'word-rain', score: finalScore, wpm: 0, accuracy: 100, timeMs: duration, timestamp: Date.now() });
  }, []);

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
    <div className="editorial-panel overflow-hidden p-5 sm:p-7">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-4"><div className="flex gap-1 text-[var(--color-incorrect)]">{[0, 1, 2].map(value => <Heart key={value} className={`h-4 w-4 ${value < lives ? 'fill-current' : 'opacity-20'}`} />)}</div><Metric label="Score" value={String(score)} /></div>
      <div className="relative h-[420px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--bg-secondary)]">
        <div className="absolute inset-x-0 bottom-8 border-t border-dashed border-[var(--color-incorrect)] opacity-50" />
        {words.map(word => <span key={word.id} style={{ left: `${word.x}%`, top: `${word.y}%` }} className={`absolute rounded-md border px-2.5 py-1 font-mono text-xs ${word.word.startsWith(input) && input ? 'border-[var(--color-accent)] bg-[var(--color-highlight)] text-[var(--color-accent)]' : 'border-[var(--color-border)] bg-[var(--bg-card)]'}`}>{word.word}</span>)}
        {!playing && <div className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--bg-primary)_78%,transparent)] p-6 text-center backdrop-blur-sm"><div><p className="eyebrow">Defend the archive</p><h2 className="mt-2 font-serif text-3xl">Word Rain</h2><p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-secondary)]">Type each word before it crosses the brass line. Three misses end the round.</p><button onClick={start} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-xs font-bold text-[var(--bg-primary)]"><Play className="h-3.5 w-3.5 fill-current" />{score ? 'Play again' : 'Begin'}</button></div></div>}
      </div>
      {playing && <input ref={inputRef} value={input} onKeyDown={event => onKeyPress(event.key)} onChange={event => change(event.target.value)} autoCapitalize="off" autoComplete="off" spellCheck={false} placeholder="Type the falling word…" className="mx-auto mt-4 block w-full max-w-lg rounded-lg border border-[var(--color-accent)] bg-[var(--bg-secondary)] p-3 text-center font-mono text-sm outline-none" />}
    </div>
  );
}

const RACE_TEXT = 'In the middle of difficulty lies opportunity. Keep typing steadily and conquer the ghost.';

function GhostRacer({ settings, onKeyPress }: ArcadeViewProps) {
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
    void db.arcadeScores.add({ clientId: createClientId(), game: 'ghost-racer', score: won ? Math.round(stats.wpm * stats.accuracy) : 0, wpm: stats.wpm, accuracy: stats.accuracy, timeMs: Math.round(stats.timeElapsed * 1000), timestamp: Date.now() });
  }, []);

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
    <div className="editorial-panel p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow">Head to head</p>
          <h2 className="mt-1 font-serif text-3xl">Ghost Racer</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-secondary)]">Rival pace</span>
          <GlassSelect
            value={ghostWpm}
            align="right"
            disabled={racing}
            onChange={val => setGhostWpm(Number(val))}
            options={[40, 60, 80, 100, 120].map(wpm => ({
              value: wpm,
              label: `${wpm} WPM`
            }))}
          />
        </div>
      </div>
      <RaceLane label="You" progress={userProgress} accent /><RaceLane label={`Ghost · ${ghostWpm} wpm`} progress={ghostProgress} />
      {!racing && !result && <div className="py-8 text-center"><button onClick={start} className="rounded-lg bg-[var(--color-accent)] px-6 py-3 text-xs font-bold text-[var(--bg-primary)]">Start race</button></div>}
      {(racing || result) && <TypingArea targetText={RACE_TEXT} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font="jetbrains" fontSize="sm" wrapMode="whole-word" onKeyDown={racing ? engine.handleKeyDown : event => event.preventDefault()} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={racing ? engine.handleCompositionEnd : undefined} onReset={start} />}
      {result && <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border)] pt-5"><p className={`font-serif text-xl ${result === 'won' ? 'text-[var(--color-correct)]' : 'text-[var(--color-incorrect)]'}`}>{result === 'won' ? 'You outran the ghost.' : 'The ghost reached the line first.'}</p><button onClick={start} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs">Race again</button></div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div><span className="text-[9px] uppercase tracking-[.18em] text-[var(--text-muted)]">{label}</span><strong className="mt-1 block font-mono text-xl text-[var(--color-accent)]">{value}</strong></div>; }
function RaceLane({ label, progress, accent = false }: { label: string; progress: number; accent?: boolean }) { return <div className="mt-6"><div className="mb-2 flex justify-between text-[10px] uppercase tracking-widest text-[var(--text-secondary)]"><span>{label}</span><span>{Math.round(progress)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--bg-secondary)]"><div className={`h-full transition-[width] duration-75 ${accent ? 'bg-[var(--color-accent)]' : 'bg-[var(--text-muted)]'}`} style={{ width: `${progress}%` }} /></div></div>; }
