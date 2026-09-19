'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, SkipForward } from 'lucide-react';
import confetti from 'canvas-confetti';
import { createClientId, db } from '@/lib/db';
import { createRandom } from '@/lib/academy/generate';
import { CHAIN_WORDS, chainChoices, chainLetter, chainPoints } from '@/lib/arcade';
import { Metric, type GameProps } from '../ArcadeBits';

const ROUND_MS = 60_000;

/**
 * Word Chain: every word starts with the last letter of the one before. Pick one of three words and type it; longer
 * words score more, but can leave you a harder letter. Skipping breaks the chain.
 */
export function WordChain({ onKeyPress, onRecorded, seed }: GameProps) {
  const [status, setStatus] = useState<'ready' | 'playing' | 'over'>('ready');
  const [attempt, setAttempt] = useState(0);
  const [letter, setLetter] = useState('a');
  const [choices, setChoices] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [chain, setChain] = useState(0);
  const [links, setLinks] = useState<string[]>([]);
  const [left, setLeft] = useState(ROUND_MS);
  const [best, setBest] = useState<number | null>(null);
  const bestRef = useRef<number | null>(null);
  const randomRef = useRef<() => number>(Math.random);
  const usedRef = useRef(new Set<string>());
  const startRef = useRef(0);
  const scoreRef = useRef(0);
  const charsRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void db.arcadeScores.where('game').equals('word-chain').toArray().then(scores => {
      if (!scores.length) return;
      bestRef.current = Math.max(...scores.map(entry => entry.score));
      setBest(bestRef.current);
    }).catch(() => {});
  }, []);

  const deal = (nextLetter: string) => {
    const dealt = chainChoices(nextLetter, usedRef.current, randomRef.current);
    setLetter(dealt.letter);
    setChoices(dealt.choices);
  };

  // The clock. The round ends when it runs out.
  useEffect(() => {
    if (status !== 'playing') return;
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, ROUND_MS - (performance.now() - startRef.current));
      setLeft(remaining);
      if (remaining > 0) return;
      window.clearInterval(interval);
      setStatus('over');
      const final = scoreRef.current;
      if (bestRef.current !== null && final > bestRef.current) confetti({ particleCount: 55, spread: 65 });
      if (bestRef.current === null || final > bestRef.current) { bestRef.current = final; setBest(final); }
      void db.arcadeScores.add({ clientId: createClientId(), game: 'word-chain', score: final, wpm: Math.round(charsRef.current / 5), accuracy: 100, timeMs: ROUND_MS, timestamp: Date.now() }).then(onRecorded).catch(() => {});
    }, 100);
    return () => window.clearInterval(interval);
  }, [status, onRecorded]);

  const start = () => {
    randomRef.current = createRandom(`${seed}:chain:${attempt}`);
    usedRef.current = new Set();
    scoreRef.current = 0; charsRef.current = 0; startRef.current = performance.now();
    const letters = [...new Set(CHAIN_WORDS.map(word => word[0]))];
    deal(letters[Math.floor(randomRef.current() * letters.length)]);
    setAttempt(value => value + 1);
    setScore(0); setChain(0); setLinks([]); setInput(''); setLeft(ROUND_MS); setStatus('playing');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const type = (value: string) => {
    const word = value.trim().toLowerCase();
    setInput(word);
    if (!choices.includes(word)) return;
    const points = chainPoints(word, chain);
    scoreRef.current += points; charsRef.current += word.length + 1;
    usedRef.current.add(word);
    setScore(scoreRef.current); setChain(value2 => value2 + 1); setLinks(previous => [...previous.slice(-7), word]); setInput('');
    deal(chainLetter(word));
  };

  const skip = () => {
    setChain(0); setInput('');
    const letters = [...new Set(CHAIN_WORDS.filter(word => !usedRef.current.has(word)).map(word => word[0]))].filter(item => item !== letter);
    deal(letters[Math.floor(randomRef.current() * letters.length)] ?? letter);
    inputRef.current?.focus();
  };

  return <div className="arc-stage arc-chain" data-status={status}>
    <div className="arc-metrics">
      <Metric label="Time" value={`${Math.ceil(left / 1000)}s`} />
      <Metric label="Score" value={String(score)} />
      <Metric label="Chain" value={String(chain)} />
      <Metric label="Best" value={best === null ? '—' : String(best)} />
    </div>
    {status === 'playing'
      ? <>
        <ol className="arc-chain-links" aria-label="Your chain">{links.map((word, index) => <li key={`${word}-${index}`}>{word}</li>)}</ol>
        <div className="arc-chain-letter" aria-live="polite"><small>Starts with</small><strong>{letter.toUpperCase()}</strong></div>
        <ul className="arc-chain-choices" aria-label="Words to choose from">
          {choices.map(word => <li key={word} data-match={(input && word.startsWith(input)) || undefined}>
            <span><b>{word.slice(0, input && word.startsWith(input) ? input.length : 0)}</b>{word.slice(input && word.startsWith(input) ? input.length : 0)}</span>
            <small>+{chainPoints(word, chain)}</small>
          </li>)}
        </ul>
        <div className="arc-chain-entry">
          <input ref={inputRef} value={input} onKeyDown={event => { onKeyPress(event.key); if (event.key === 'Tab') { event.preventDefault(); skip(); } }} onChange={event => type(event.target.value)} autoCapitalize="off" autoComplete="off" spellCheck={false} placeholder="Type one of the words…" aria-label="Type a word from the chain" className="arc-input" />
          <button type="button" className="rs-btn" onClick={skip} title="New letter (Tab). Breaks the chain."><SkipForward aria-hidden="true" />Skip</button>
        </div>
      </>
      : <div className="arc-overlay is-static"><div>
        <p className="eyebrow">{status === 'over' ? 'Time' : 'Sixty seconds'}</p>
        <h2>{status === 'over' ? `${score} points` : 'Word Chain'}</h2>
        <p>{status === 'over' ? `${links.length ? `Last link: ${links.at(-1)}. ` : ''}Longer words score more; a long chain adds a bonus.` : 'Each word starts with the last letter of the one before. Type one of three offered words. Longer words score more; Tab skips but breaks the chain.'}</p>
        <button type="button" onClick={start} className="rs-btn is-primary">{status === 'over' ? <RotateCcw aria-hidden="true" /> : <Play aria-hidden="true" />}{status === 'over' ? 'Play again' : 'Begin'}</button>
      </div></div>}
  </div>;
}
