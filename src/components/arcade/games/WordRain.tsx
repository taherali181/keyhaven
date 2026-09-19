'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, Play } from 'lucide-react';
import { createClientId, db } from '@/lib/db';
import { COMMON_WORDS_200 } from '@/data/word-lists';
import { Metric, type GameProps } from '../ArcadeBits';

interface FallingWord { id: number; word: string; x: number; y: number; speed: number; }

export function WordRain({ onKeyPress, onRecorded }: GameProps) {
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
