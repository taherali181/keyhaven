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
  // Parallel to charTimingsRef: was this attempt actually appended to `typed`?
  // Strict-mode errors are recorded but never committed, so backspace must skip them.
  const committedRef = useRef<boolean[]>([]);
  const composingRef = useRef(false);
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
    committedRef.current = [];
    composingRef.current = false;
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

  // Removes one committed character, undoing the error it recorded. Without this,
  // mistype -> backspace -> retype counts the mistake permanently against accuracy.
  const retractOne = useCallback(() => {
    if (typedRef.current.length <= baseOffsetRef.current) return false;
    const next = typedRef.current.slice(0, -1);
    for (let index = committedRef.current.length - 1; index >= 0; index -= 1) {
      if (!committedRef.current[index]) continue;
      const removed = charTimingsRef.current[index];
      if (removed && !removed.isCorrect) {
        const expected = targetText[next.length]?.toLowerCase();
        if (expected && errorHeatmapRef.current[expected]) {
          errorHeatmapRef.current[expected] -= 1;
          if (errorHeatmapRef.current[expected] <= 0) delete errorHeatmapRef.current[expected];
        }
      }
      charTimingsRef.current.splice(index, 1);
      committedRef.current.splice(index, 1);
      break;
    }
    typedRef.current = next;
    return true;
  }, [targetText]);

  const commitCharacter = useCallback((rawKey: string, now: number) => {
    const targetChar = targetText[typedRef.current.length];
    const key = targetChar === '\n' && rawKey === 'Enter' ? '\n' : rawKey;
    if (key.length !== 1) return;

    if (statusRef.current === 'idle') {
      statusRef.current = 'running';
      startRef.current = now;
      lastCharTimeRef.current = now;
      setStatus('running');
      setStartTime(now);
    }

    evidenceRef.current.push({ key, atMs: Math.max(0, Math.round(now - (startRef.current ?? now))) });
    onKeyPress?.(rawKey);

    const isCorrect = key === targetChar;
    charTimingsRef.current.push({
      char: key,
      timestamp: now,
      durationMs: lastCharTimeRef.current ? now - lastCharTimeRef.current : 0,
      isCorrect
    });
    committedRef.current.push(!(!isCorrect && strictMode));
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

  const handleKeyDown = useCallback((event: React.KeyboardEvent | KeyboardEvent) => {
    if (statusRef.current === 'finished') return;
    // Autorepeat would otherwise multiply a single held-down mistake into dozens of errors.
    if (event.repeat) { event.preventDefault(); return; }
    // Let the IME own the keystroke; the composed text arrives via compositionend.
    if (composingRef.current || (event as KeyboardEvent).isComposing || event.key === 'Dead') return;

    if (event.key === 'Backspace') {
      event.preventDefault();
      onKeyPress?.('Backspace');
      if (statusRef.current === 'running' && startRef.current !== null) evidenceRef.current.push({ key: 'Backspace', atMs: Math.max(0, Math.round(performance.now() - startRef.current)) });
      if (event.ctrlKey || event.altKey) {
        // Delete back through any trailing whitespace, then through the word itself.
        const isSpace = (value: string) => /\s/.test(value);
        while (typedRef.current.length > baseOffsetRef.current && isSpace(typedRef.current[typedRef.current.length - 1])) {
          if (!retractOne()) break;
        }
        while (typedRef.current.length > baseOffsetRef.current && !isSpace(typedRef.current[typedRef.current.length - 1])) {
          if (!retractOne()) break;
        }
      } else {
        retractOne();
      }
      setTyped(typedRef.current);
      return;
    }

    if (event.ctrlKey || event.altKey || event.metaKey || event.key === 'Tab' || event.key === 'Escape') return;
    if (event.key.length !== 1 && event.key !== 'Enter') return;
    event.preventDefault();
    commitCharacter(event.key, performance.now());
  }, [commitCharacter, onKeyPress, retractOne]);

  const handleCompositionStart = useCallback(() => { composingRef.current = true; }, []);

  // Dead keys and IME sequences never surface as a single keydown, so the composed
  // result is fed in here instead.
  const handleCompositionEnd = useCallback((event: React.CompositionEvent | CompositionEvent) => {
    composingRef.current = false;
    if (statusRef.current === 'finished') return;
    const data = event.data ?? '';
    const now = performance.now();
    for (const character of data) commitCharacter(character, now);
  }, [commitCharacter]);

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
    handleCompositionStart,
    handleCompositionEnd,
    reset,
    finishTest
  };
}
