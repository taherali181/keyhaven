'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TypingStats, CharTiming, HistoryPoint } from '@/types';
import { calculateWPM, calculateRawWPM, calculateAccuracy, calculateConsistency } from '@/lib/metrics';

interface UseTypingEngineOptions {
  targetText: string;
  isTimed?: boolean;
  timeLimit?: number; // in seconds
  strictMode?: boolean;
  onComplete?: (stats: TypingStats) => void;
  onKeyPress?: (key: string) => void;
}

export function useTypingEngine({
  targetText,
  isTimed = false,
  timeLimit = 30,
  strictMode = false,
  onComplete,
  onKeyPress
}: UseTypingEngineOptions) {
  const [typed, setTyped] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(timeLimit);

  // Live Metrics
  const [wpm, setWpm] = useState<number>(0);
  const [rawWpm, setRawWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(100);

  const charTimingsRef = useRef<CharTiming[]>([]);
  const historyRef = useRef<HistoryPoint[]>([]);
  const errorHeatmapRef = useRef<Record<string, number>>({});
  const lastCharTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const targetChars = targetText.split('');

  // Reset engine
  const reset = useCallback((newTimeLimit?: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTyped('');
    setStartTime(null);
    setEndTime(null);
    setIsActive(false);
    setIsFinished(false);
    setWpm(0);
    setRawWpm(0);
    setAccuracy(100);
    setTimeRemaining(newTimeLimit !== undefined ? newTimeLimit : timeLimit);
    charTimingsRef.current = [];
    historyRef.current = [];
    errorHeatmapRef.current = {};
    lastCharTimeRef.current = 0;
  }, [timeLimit]);

  // Finish test and compute final stats
  const finishTest = useCallback(() => {
    if (isFinished) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const finishNow = performance.now();
    setEndTime(finishNow);
    setIsActive(false);
    setIsFinished(true);

    const start = startTime || finishNow;
    const durationSec = Math.max(0.5, (finishNow - start) / 1000);

    // Calculate correct & incorrect
    let correct = 0;
    let incorrect = 0;
    const typedChars = typed.split('');

    for (let i = 0; i < typedChars.length; i++) {
      if (typedChars[i] === targetChars[i]) {
        correct++;
      } else {
        incorrect++;
      }
    }

    const finalWpm = calculateWPM(correct, durationSec);
    const finalRawWpm = calculateRawWPM(typedChars.length, durationSec);
    const finalAccuracy = calculateAccuracy(correct, typedChars.length);
    const finalConsistency = calculateConsistency(historyRef.current);

    const finalStats: TypingStats = {
      wpm: finalWpm,
      rawWpm: finalRawWpm,
      accuracy: finalAccuracy,
      consistency: finalConsistency,
      timeElapsed: Math.round(durationSec * 10) / 10,
      totalChars: typedChars.length,
      correctChars: correct,
      incorrectChars: incorrect,
      extraChars: Math.max(0, typedChars.length - targetChars.length),
      missedChars: Math.max(0, targetChars.length - typedChars.length),
      charTimings: charTimingsRef.current,
      errorHeatmap: errorHeatmapRef.current,
      history: historyRef.current
    };

    setWpm(finalWpm);
    setRawWpm(finalRawWpm);
    setAccuracy(finalAccuracy);

    if (onCompleteRef.current) {
      onCompleteRef.current(finalStats);
    }
  }, [isFinished, startTime, typed, targetChars]);

  // Timer loop for timed tests and history logging
  useEffect(() => {
    if (!isActive || isFinished) return;

    timerRef.current = setInterval(() => {
      const now = performance.now();
      const elapsedSec = (now - (startTime || now)) / 1000;

      if (isTimed) {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            finishTest();
            return 0;
          }
          return prev - 1;
        });
      }

      // Compute live WPM & snapshot history
      let currentCorrect = 0;
      const currentTyped = typed.split('');
      for (let i = 0; i < currentTyped.length; i++) {
        if (currentTyped[i] === targetChars[i]) currentCorrect++;
      }

      const liveWpm = calculateWPM(currentCorrect, elapsedSec);
      const liveRawWpm = calculateRawWPM(currentTyped.length, elapsedSec);
      const liveAcc = calculateAccuracy(currentCorrect, currentTyped.length);

      setWpm(liveWpm);
      setRawWpm(liveRawWpm);
      setAccuracy(liveAcc);

      historyRef.current.push({
        second: Math.round(elapsedSec),
        wpm: liveWpm,
        rawWpm: liveRawWpm,
        errors: Object.values(errorHeatmapRef.current).reduce((a, b) => a + b, 0)
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isFinished, startTime, isTimed, finishTest, typed, targetChars]);

  // Keystroke handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      if (isFinished) return;
      if (e.key === 'Tab' || e.key === 'Escape') return; // Handled by outer components

      // Handle backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        onKeyPress?.('Backspace');
        setTyped(prev => (prev.length > 0 ? prev.slice(0, -1) : ''));
        return;
      }

      // Ignore modifiers and non-character keys
      if (e.key.length > 1 || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      e.preventDefault();
      const key = e.key;
      const now = performance.now();

      // Start timer on first keypress
      if (!isActive && !startTime) {
        setStartTime(now);
        setIsActive(true);
        lastCharTimeRef.current = now;
      }

      onKeyPress?.(key);

      const targetChar = targetChars[typed.length];
      const isCorrect = key === targetChar;

      // Track intra-character timing
      const durationMs = lastCharTimeRef.current > 0 ? now - lastCharTimeRef.current : 0;
      lastCharTimeRef.current = now;

      charTimingsRef.current.push({
        char: key,
        timestamp: now,
        durationMs,
        isCorrect
      });

      // Track error heatmap
      if (!isCorrect && targetChar) {
        const keyLower = targetChar.toLowerCase();
        errorHeatmapRef.current[keyLower] = (errorHeatmapRef.current[keyLower] || 0) + 1;
      }

      const nextTyped = typed + key;
      setTyped(nextTyped);

      // Check if finished by text completion
      if (!isTimed && nextTyped.length >= targetText.length) {
        finishTest();
      }
    },
    [isFinished, isActive, startTime, onKeyPress, targetChars, typed, isTimed, targetText.length, finishTest]
  );

  return {
    typed,
    currentIndex: typed.length,
    targetChars,
    wpm,
    rawWpm,
    accuracy,
    timeRemaining,
    isActive,
    isFinished,
    startTime,
    endTime,
    handleKeyDown,
    reset,
    finishTest
  };
}
