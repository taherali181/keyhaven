'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TypingStats, CharTiming, HistoryPoint, TypingSessionStatus, TypingSessionEvidence } from '@/types';
import { calculateWPM, calculateRawWPM, calculateAccuracy, calculateConsistency } from '@/lib/metrics';

interface UseTypingEngineOptions {
  targetText: string;
  isTimed?: boolean;
  timeLimit?: number;
  strictMode?: boolean;
  initialOffset?: number;
  sessionKey?: string;
  onComplete?: (stats: TypingStats) => void;
  onKeyPress?: (key: string) => void;
}

export function useTypingEngine({
  targetText,
  isTimed = false,
  timeLimit = 30,
  strictMode = false,
  initialOffset = 0,
  sessionKey = targetText,
  onComplete,
  onKeyPress
}: UseTypingEngineOptions) {
  const safeOffset = Math.min(Math.max(0, initialOffset), targetText.length);
  const initialTyped = targetText.slice(0, safeOffset);
  const [typed, setTyped] = useState(initialTyped);
  const [status, setStatus] = useState<TypingSessionStatus>('idle');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [rawWpm, setRawWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  const targetChars = useMemo(() => targetText.split(''), [targetText]);
  const typedRef = useRef(initialTyped);
  const statusRef = useRef<TypingSessionStatus>('idle');
  const startRef = useRef<number | null>(null);
  const baseOffsetRef = useRef(safeOffset);
  const charTimingsRef = useRef<CharTiming[]>([]);
  const historyRef = useRef<HistoryPoint[]>([]);
  const errorHeatmapRef = useRef<Record<string, number>>({});
  const evidenceRef = useRef<TypingSessionEvidence[]>([]);
  const lastCharTimeRef = useRef(0);
  const lastHistorySecondRef = useRef(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const reset = useCallback((newTimeLimit = timeLimit, newOffset = initialOffset) => {
    const offset = Math.min(Math.max(0, newOffset), targetText.length);
    const prefix = targetText.slice(0, offset);
    typedRef.current = prefix;
    statusRef.current = 'idle';
    startRef.current = null;
    baseOffsetRef.current = offset;
    charTimingsRef.current = [];
    historyRef.current = [];
    errorHeatmapRef.current = {};
    evidenceRef.current = [];
    lastCharTimeRef.current = 0;
    lastHistorySecondRef.current = 0;
    setTyped(prefix);
    setStatus('idle');
    setStartTime(null);
    setEndTime(null);
    setTimeRemaining(newTimeLimit);
    setTimeElapsed(0);
    setWpm(0);
    setRawWpm(0);
    setAccuracy(100);
  }, [initialOffset, targetText, timeLimit]);

  useEffect(() => {
    queueMicrotask(() => reset(timeLimit, initialOffset));
  }, [sessionKey, targetText, timeLimit, initialOffset, reset]);

  const calculateSnapshot = useCallback((finishAt: number, displayedTyped: string): TypingStats => {
    const startedAt = startRef.current ?? finishAt;
    const durationSec = Math.max(0.5, (finishAt - startedAt) / 1000);
    const attempts = charTimingsRef.current;
    const correct = attempts.filter(item => item.isCorrect).length;
    const incorrect = attempts.length - correct;
    const total = attempts.length;
    return {
      wpm: calculateWPM(correct, durationSec),
      rawWpm: calculateRawWPM(total, durationSec),
      accuracy: calculateAccuracy(correct, total),
      consistency: calculateConsistency(historyRef.current),
      timeElapsed: Math.round(durationSec * 10) / 10,
      totalChars: total,
      correctChars: correct,
      incorrectChars: incorrect,
      extraChars: Math.max(0, displayedTyped.length - targetText.length),
      missedChars: Math.max(0, targetText.length - displayedTyped.length),
      charTimings: [...attempts],
      errorHeatmap: { ...errorHeatmapRef.current },
      history: [...historyRef.current]
      ,evidence: [...evidenceRef.current]
    };
  }, [targetText.length]);

  const finishTest = useCallback((displayedTyped = typedRef.current, finishAt = performance.now()) => {
    if (statusRef.current === 'finished') return;
    statusRef.current = 'finished';
    const stats = calculateSnapshot(finishAt, displayedTyped);
    setStatus('finished');
    setEndTime(finishAt);
    setTimeElapsed(stats.timeElapsed);
    setTimeRemaining(0);
    setWpm(stats.wpm);
    setRawWpm(stats.rawWpm);
    setAccuracy(stats.accuracy);
    onCompleteRef.current?.(stats);
  }, [calculateSnapshot]);

  useEffect(() => {
    if (status !== 'running') return;
    const interval = window.setInterval(() => {
      const now = performance.now();
      const startedAt = startRef.current ?? now;
      const elapsedSec = Math.max(0, (now - startedAt) / 1000);
      const attempts = charTimingsRef.current;
      const correct = attempts.filter(item => item.isCorrect).length;
      const liveWpm = calculateWPM(correct, Math.max(0.5, elapsedSec));
      const liveRawWpm = calculateRawWPM(attempts.length, Math.max(0.5, elapsedSec));
      const liveAccuracy = calculateAccuracy(correct, attempts.length);

      setTimeElapsed(elapsedSec);
      setWpm(liveWpm);
      setRawWpm(liveRawWpm);
      setAccuracy(liveAccuracy);

      const historySecond = Math.floor(elapsedSec);
      if (historySecond > lastHistorySecondRef.current) {
        lastHistorySecondRef.current = historySecond;
        historyRef.current.push({
          second: historySecond,
          wpm: liveWpm,
          rawWpm: liveRawWpm,
          errors: attempts.length - correct
        });
      }

      if (isTimed) {
        const remaining = Math.max(0, Math.ceil(timeLimit - elapsedSec));
        setTimeRemaining(remaining);
        if (elapsedSec >= timeLimit) finishTest(typedRef.current, now);
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [finishTest, isTimed, status, timeLimit]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent | KeyboardEvent) => {
    if (statusRef.current === 'finished') return;
    if (event.ctrlKey || event.altKey || event.metaKey || event.key === 'Tab' || event.key === 'Escape') return;

    if (event.key === 'Backspace') {
      event.preventDefault();
      onKeyPress?.('Backspace');
      if (statusRef.current === 'running' && startRef.current !== null) evidenceRef.current.push({ key: 'Backspace', atMs: Math.max(0, Math.round(performance.now() - startRef.current)) });
      if (typedRef.current.length > baseOffsetRef.current) {
        const next = typedRef.current.slice(0, -1);
        typedRef.current = next;
        setTyped(next);
      }
      return;
    }

    const targetChar = targetText[typedRef.current.length];
    const key = targetChar === '\n' && event.key === 'Enter' ? '\n' : event.key;
    if (key.length !== 1) return;
    event.preventDefault();

    const now = performance.now();
    if (statusRef.current === 'idle') {
      statusRef.current = 'running';
      startRef.current = now;
      lastCharTimeRef.current = now;
      setStatus('running');
      setStartTime(now);
    }

    evidenceRef.current.push({ key: event.key === 'Enter' ? '\n' : event.key, atMs: Math.max(0, Math.round(now - (startRef.current ?? now))) });

    onKeyPress?.(event.key);
    const isCorrect = key === targetChar;
    charTimingsRef.current.push({
      char: key,
      timestamp: now,
      durationMs: lastCharTimeRef.current ? now - lastCharTimeRef.current : 0,
      isCorrect
    });
    lastCharTimeRef.current = now;

    if (!isCorrect && targetChar) {
      const expected = targetChar.toLowerCase();
      errorHeatmapRef.current[expected] = (errorHeatmapRef.current[expected] || 0) + 1;
      if (strictMode) return;
    }

    const next = typedRef.current + key;
    typedRef.current = next;
    setTyped(next);
    if (!isTimed && next.length >= targetText.length) finishTest(next, now);
  }, [finishTest, isTimed, onKeyPress, strictMode, targetText]);

  return {
    typed,
    currentIndex: typed.length,
    targetChars,
    wpm,
    rawWpm,
    accuracy,
    timeRemaining,
    timeElapsed,
    isActive: status === 'running',
    isFinished: status === 'finished',
    status,
    startTime,
    endTime,
    handleKeyDown,
    reset,
    finishTest
  };
}
