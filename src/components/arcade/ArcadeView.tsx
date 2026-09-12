'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, Zap, Flame, Trophy, RotateCcw, Heart, Play, ShieldAlert, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserSettings, ArcadeScoreRecord } from '@/types';
import { db } from '@/lib/db';
import { COMMON_WORDS_200 } from '@/data/word-lists';

interface ArcadeViewProps {
  settings: UserSettings;
  onKeyPress: (key: string) => void;
}

type ArcadeGame = 'alphabet' | 'word-rain' | 'ghost-racer';

export const ArcadeView: React.FC<ArcadeViewProps> = ({
  settings,
  onKeyPress
}) => {
  const [activeGame, setActiveGame] = useState<ArcadeGame>('alphabet');

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-300">
      {/* Game Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-accent)]">
              Arcade & Mini-Games
            </span>
          </div>
          <h2 className="text-3xl font-serif font-bold text-[var(--text-primary)] mt-1">
            Typing Arcade & Challenges
          </h2>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
          <button
            onClick={() => setActiveGame('alphabet')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeGame === 'alphabet'
                ? 'bg-[var(--color-accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Alphabet Sprint (A-Z)</span>
          </button>
          <button
            onClick={() => setActiveGame('word-rain')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeGame === 'word-rain'
                ? 'bg-[var(--color-accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Word Rain (Defense)</span>
          </button>
          <button
            onClick={() => setActiveGame('ghost-racer')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeGame === 'ghost-racer'
                ? 'bg-[var(--color-accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Ghost Racer</span>
          </button>
        </div>
      </div>

      {activeGame === 'alphabet' && <AlphabetSprintGame settings={settings} onKeyPress={onKeyPress} />}
      {activeGame === 'word-rain' && <WordRainGame settings={settings} onKeyPress={onKeyPress} />}
      {activeGame === 'ghost-racer' && <GhostRacerGame settings={settings} onKeyPress={onKeyPress} />}
    </div>
  );
};

// ==========================================
// GAME 1: ALPHABET SPRINT (A-Z)
// ==========================================
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

const AlphabetSprintGame: React.FC<{ settings: UserSettings; onKeyPress: (key: string) => void }> = ({
  onKeyPress
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load PB from DB
    db.arcadeScores.where('game').equals('alphabet-sprint').toArray().then(scores => {
      if (scores.length > 0) {
        const minTime = Math.min(...scores.map(s => s.timeMs));
        setBestTime(minTime);
      }
    }).catch(() => {});
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isFinished) return;
    const key = e.key.toLowerCase();
    if (key.length > 1) return;

    const target = ALPHABET[currentIndex];
    onKeyPress(key);

    if (key === target) {
      if (currentIndex === 0 && !startTime) {
        const now = performance.now();
        setStartTime(now);
        timerRef.current = setInterval(() => {
          setElapsedMs(performance.now() - now);
        }, 10);
      }

      if (currentIndex === ALPHABET.length - 1) {
        // Complete!
        if (timerRef.current) clearInterval(timerRef.current);
        const finalTime = startTime ? performance.now() - startTime : elapsedMs;
        setElapsedMs(finalTime);
        setIsFinished(true);

        // Save high score
        db.arcadeScores.add({
          game: 'alphabet-sprint',
          score: Math.round(100000 / finalTime),
          wpm: Math.round((26 / 5) / (finalTime / 60000)),
          accuracy: 100,
          timeMs: Math.round(finalTime),
          timestamp: Date.now()
        }).catch(() => {});

        if (!bestTime || finalTime < bestTime) {
          setBestTime(finalTime);
          confetti({ particleCount: 70, spread: 80 });
        }
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }
  };

  const restart = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentIndex(0);
    setStartTime(null);
    setElapsedMs(0);
    setIsFinished(false);
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--color-border)] shadow-xl text-center outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
    >
      <div className="flex items-center justify-between max-w-md mx-auto mb-6">
        <div className="text-left">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Time</span>
          <div className="text-3xl font-black font-mono text-[var(--color-accent)]">
            {(elapsedMs / 1000).toFixed(2)}s
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Personal Best</span>
          <div className="text-3xl font-black font-mono text-[var(--text-primary)]">
            {bestTime ? `${(bestTime / 1000).toFixed(2)}s` : '--'}
          </div>
        </div>
      </div>

      {/* Target Letter Spotlight */}
      <div className="my-8">
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-2">
          {isFinished ? 'Sprint Finished!' : 'Next Letter To Type'}
        </div>
        <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-secondary)] flex items-center justify-center text-white text-6xl font-mono font-black shadow-lg animate-pulse">
          {isFinished ? '🎉' : ALPHABET[currentIndex].toUpperCase()}
        </div>
      </div>

      {/* Full Alphabet Track */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto my-6">
        {ALPHABET.map((char, idx) => {
          const isDone = idx < currentIndex;
          const isTarget = idx === currentIndex;
          return (
            <span
              key={char}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold border transition-all ${
                isDone
                  ? 'bg-[var(--color-correct)] text-white border-[var(--color-correct)]'
                  : isTarget
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] scale-110 shadow-md'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--color-border)]'
              }`}
            >
              {char.toUpperCase()}
            </span>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          onClick={restart}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--color-border)] transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Sprint</span>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// GAME 2: WORD RAIN (TYPING DEFENSE)
// ==========================================
interface FallingWord {
  id: number;
  word: string;
  x: number; // 5% to 85%
  y: number; // 0% to 100%
  speed: number;
}

const WordRainGame: React.FC<{ settings: UserSettings; onKeyPress: (key: string) => void }> = ({
  onKeyPress
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [inputVal, setInputVal] = useState('');
  const [words, setWords] = useState<FallingWord[]>([]);
  const nextWordId = useRef(0);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setLives(3);
    setInputVal('');
    setWords([]);
  };

  useEffect(() => {
    if (!isPlaying) return;

    gameLoopRef.current = setInterval(() => {
      // Spawn new word periodically
      if (Math.random() < 0.35 && words.length < 6) {
        const randomWord = COMMON_WORDS_200[Math.floor(Math.random() * COMMON_WORDS_200.length)];
        const newWord: FallingWord = {
          id: nextWordId.current++,
          word: randomWord,
          x: Math.floor(Math.random() * 75) + 5,
          y: 0,
          speed: 1.2 + Math.random() * 1.5
        };
        setWords(prev => [...prev, newWord]);
      }

      // Move existing words down
      setWords(prev => {
        const updated: FallingWord[] = [];
        let lostLife = false;

        prev.forEach(w => {
          const nextY = w.y + w.speed;
          if (nextY >= 90) {
            lostLife = true;
          } else {
            updated.push({ ...w, y: nextY });
          }
        });

        if (lostLife) {
          setLives(l => {
            if (l <= 1) {
              setIsPlaying(false);
              return 0;
            }
            return l - 1;
          });
        }

        return updated;
      });
    }, 100);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPlaying, words.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim().toLowerCase();
    setInputVal(val);

    const matchIdx = words.findIndex(w => w.word.toLowerCase() === val);
    if (matchIdx !== -1) {
      // Destroy word!
      onKeyPress('Enter');
      setWords(prev => prev.filter((_, idx) => idx !== matchIdx));
      setScore(s => s + 100);
      setInputVal('');
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--color-border)] shadow-xl relative overflow-hidden">
      {/* Game Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-rose-500">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 ${i < lives ? 'fill-rose-500' : 'opacity-20'}`}
              />
            ))}
          </div>
          <span className="text-xs text-[var(--text-muted)] font-medium">Lives</span>
        </div>

        <div className="text-right">
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Score</span>
          <div className="text-2xl font-black font-mono text-[var(--color-accent)]">{score}</div>
        </div>
      </div>

      {/* Arcade Canvas Area */}
      <div className="relative h-96 w-full rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-border)] overflow-hidden">
        {!isPlaying ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/40 backdrop-blur-xs">
            <h3 className="text-2xl font-bold text-white mb-2">Word Rain Defense</h3>
            <p className="text-xs text-white/80 max-w-sm mb-6">
              Type the falling words before they hit the bottom hazard line. Don&apos;t let 3 words slip past!
            </p>
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm text-white bg-[var(--color-accent)] hover:opacity-90 shadow-lg cursor-pointer transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Game</span>
            </button>
          </div>
        ) : (
          <>
            {/* Danger Line */}
            <div className="absolute bottom-6 left-0 right-0 h-[2px] bg-rose-500/50 border-b border-dashed border-rose-500" />
            <span className="absolute bottom-1 right-3 text-[10px] text-rose-400 font-mono">
              HAZARD LINE
            </span>

            {/* Falling Words */}
            {words.map(w => (
              <div
                key={w.id}
                className="absolute px-3 py-1 rounded-lg text-xs font-mono font-bold bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--color-accent)] shadow-md transition-all duration-75"
                style={{
                  left: `${w.x}%`,
                  top: `${w.y}%`
                }}
              >
                {w.word}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Input Field */}
      {isPlaying && (
        <div className="mt-4 flex justify-center">
          <input
            type="text"
            value={inputVal}
            onChange={handleInputChange}
            placeholder="Type falling word..."
            autoFocus
            className="w-full max-w-md p-3 text-center rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-accent)] text-[var(--text-primary)] font-mono text-base outline-none shadow-sm"
          />
        </div>
      )}
    </div>
  );
};

// ==========================================
// GAME 3: GHOST RACER
// ==========================================
const GhostRacerGame: React.FC<{ settings: UserSettings; onKeyPress: (key: string) => void }> = ({
  onKeyPress
}) => {
  const [ghostWpm, setGhostWpm] = useState(60);
  const [userProgress, setUserProgress] = useState(0);
  const [ghostProgress, setGhostProgress] = useState(0);
  const [isRacing, setIsRacing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [userWon, setUserWon] = useState(false);

  const raceText = "In the middle of difficulty lies opportunity. Keep typing steadily and conquer the ghost.";
  const raceWords = raceText.split(' ').length;
  const [typedChars, setTypedChars] = useState('');
  const raceStartRef = useRef<number | null>(null);
  const ghostIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRace = () => {
    setIsRacing(true);
    setIsFinished(false);
    setUserWon(false);
    setUserProgress(0);
    setGhostProgress(0);
    setTypedChars('');
    raceStartRef.current = performance.now();

    // Ghost movement
    const totalSecNeeded = (raceWords / ghostWpm) * 60;
    const ghostIncrementPer100ms = (100 / (totalSecNeeded * 10));

    ghostIntervalRef.current = setInterval(() => {
      setGhostProgress(prev => {
        const next = prev + ghostIncrementPer100ms;
        if (next >= 100) {
          if (ghostIntervalRef.current) clearInterval(ghostIntervalRef.current);
          setIsFinished(true);
          setUserWon(false);
          return 100;
        }
        return next;
      });
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRacing || isFinished) return;
    const key = e.key;
    if (key.length > 1 && key !== 'Backspace') return;

    onKeyPress(key);

    if (key === 'Backspace') {
      setTypedChars(p => p.slice(0, -1));
      return;
    }

    const next = typedChars + key;
    setTypedChars(next);

    const progress = Math.min(100, Math.round((next.length / raceText.length) * 100));
    setUserProgress(progress);

    if (next.length >= raceText.length) {
      if (ghostIntervalRef.current) clearInterval(ghostIntervalRef.current);
      setIsFinished(true);
      setUserWon(true);
      confetti({ particleCount: 60, spread: 70 });
    }
  };

  return (
    <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--color-border)] shadow-xl">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--color-border)]">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">Ghost Racer Duel</h3>
          <p className="text-xs text-[var(--text-secondary)]">Race head-to-head against an AI Ghost rival.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Ghost Speed:</span>
          <select
            value={ghostWpm}
            onChange={e => setGhostWpm(parseInt(e.target.value))}
            disabled={isRacing}
            className="text-xs p-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--color-border)] text-[var(--text-primary)] font-bold outline-none"
          >
            {[40, 60, 80, 100, 120].map(w => (
              <option key={w} value={w}>
                {w} WPM Ghost
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Race Track */}
      <div className="space-y-6 my-8">
        {/* User Racer */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-[var(--color-accent)] mb-1">
            <span>You</span>
            <span>{userProgress}%</span>
          </div>
          <div className="h-6 w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)] relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-secondary)] transition-all duration-100 flex items-center justify-end pr-1 text-xs"
              style={{ width: `${userProgress}%` }}
            >
              🏎️
            </div>
          </div>
        </div>

        {/* Ghost Racer */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-purple-400 mb-1">
            <span>Ghost ({ghostWpm} WPM)</span>
            <span>{Math.round(ghostProgress)}%</span>
          </div>
          <div className="h-6 w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)] relative overflow-hidden">
            <div
              className="h-full bg-purple-600/60 transition-all duration-100 flex items-center justify-end pr-1 text-xs"
              style={{ width: `${ghostProgress}%` }}
            >
              👻
            </div>
          </div>
        </div>
      </div>

      {/* Race Canvas */}
      {!isRacing ? (
        <div className="text-center py-6">
          <button
            onClick={startRace}
            className="px-8 py-3 rounded-2xl font-bold text-sm text-white bg-[var(--color-accent)] hover:opacity-90 shadow-lg cursor-pointer"
          >
            Start Race
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] font-mono text-sm text-[var(--text-secondary)]">
            {raceText}
          </div>
          <input
            type="text"
            value={typedChars}
            onChange={() => {}}
            onKeyDown={handleKeyDown}
            placeholder="Start typing the race text..."
            autoFocus
            disabled={isFinished}
            className="w-full p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-accent)] font-mono text-base text-[var(--text-primary)] outline-none"
          />
        </div>
      )}

      {isFinished && (
        <div className="mt-6 p-4 rounded-2xl text-center font-bold text-lg bg-[var(--bg-secondary)] border border-[var(--color-border)]">
          {userWon ? (
            <span className="text-[var(--color-correct)]">🏆 Victory! You beat the {ghostWpm} WPM Ghost!</span>
          ) : (
            <span className="text-[var(--color-incorrect)]">💀 Defeat! The Ghost was faster. Try again!</span>
          )}
          <div className="mt-3">
            <button
              onClick={startRace}
              className="px-4 py-2 rounded-xl text-xs bg-[var(--color-accent)] text-white cursor-pointer"
            >
              Rematch
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
