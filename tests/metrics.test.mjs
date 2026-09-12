import test from 'node:test';
import assert from 'node:assert/strict';

// Test metric calculations
function calculateWPM(correctChars, timeSeconds) {
  if (timeSeconds <= 0) return 0;
  const minutes = timeSeconds / 60;
  const words = correctChars / 5;
  return Math.max(0, Math.round(words / minutes));
}

function calculateRawWPM(totalCharsTyped, timeSeconds) {
  if (timeSeconds <= 0) return 0;
  const minutes = timeSeconds / 60;
  const words = totalCharsTyped / 5;
  return Math.max(0, Math.round(words / minutes));
}

function calculateAccuracy(correctChars, totalCharsTyped) {
  if (totalCharsTyped <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((correctChars / totalCharsTyped) * 1000) / 10));
}

function calculateConsistency(history) {
  if (history.length < 3) return 100;
  const wpms = history.map(h => h.wpm);
  const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
  if (mean === 0) return 100;

  const variance = wpms.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / wpms.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;
  return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
}

test('calculateWPM computes correct Net WPM based on standard 5-char word metric', () => {
  // 300 correct characters in 60 seconds = 60 words in 1 min = 60 WPM
  assert.equal(calculateWPM(300, 60), 60);
  // 150 correct characters in 30 seconds = 30 words in 0.5 min = 60 WPM
  assert.equal(calculateWPM(150, 30), 60);
  // 0 correct characters
  assert.equal(calculateWPM(0, 30), 0);
  // 0 seconds elapsed
  assert.equal(calculateWPM(100, 0), 0);
});

test('calculateAccuracy returns accurate percentages with 1 decimal point', () => {
  // 95 out of 100 chars
  assert.equal(calculateAccuracy(95, 100), 95);
  // 99 out of 100 chars
  assert.equal(calculateAccuracy(99, 100), 99);
  // 100 out of 100 chars
  assert.equal(calculateAccuracy(100, 100), 100);
  // 0 total typed
  assert.equal(calculateAccuracy(0, 0), 100);
});

test('calculateConsistency computes high consistency for steady speeds', () => {
  const steadyHistory = [
    { second: 1, wpm: 80 },
    { second: 2, wpm: 81 },
    { second: 3, wpm: 80 },
    { second: 4, wpm: 79 },
    { second: 5, wpm: 80 }
  ];
  const score = calculateConsistency(steadyHistory);
  assert.ok(score >= 95, `Expected score >= 95, got ${score}`);
});
