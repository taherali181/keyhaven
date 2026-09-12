import { CharTiming, HistoryPoint } from '@/types';

export function calculateWPM(correctChars: number, timeSeconds: number): number {
  if (timeSeconds <= 0) return 0;
  const minutes = timeSeconds / 60;
  // Standard metric: 1 word = 5 characters
  const words = correctChars / 5;
  return Math.max(0, Math.round(words / minutes));
}

export function calculateRawWPM(totalCharsTyped: number, timeSeconds: number): number {
  if (timeSeconds <= 0) return 0;
  const minutes = timeSeconds / 60;
  const words = totalCharsTyped / 5;
  return Math.max(0, Math.round(words / minutes));
}

export function calculateAccuracy(correctChars: number, totalCharsTyped: number): number {
  if (totalCharsTyped <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((correctChars / totalCharsTyped) * 1000) / 10));
}

export function calculateConsistency(history: HistoryPoint[]): number {
  if (history.length < 3) return 100;
  const wpms = history.map(h => h.wpm);
  const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
  if (mean === 0) return 100;

  const variance = wpms.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / wpms.length;
  const stdDev = Math.sqrt(variance);
  
  // Consistency percentage = 100 * (1 - Coefficient of Variation)
  const cv = stdDev / mean;
  const consistency = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
  return consistency;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatDurationMs(ms: number): string {
  const seconds = (ms / 1000).toFixed(2);
  return `${seconds}s`;
}
