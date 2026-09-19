import { describe, expect, it } from 'vitest';
import { DEFAULT_SPEED_PREFS, pickQuote, practiceText, sanitizeSpeedPrefs, speedLabel, speedSubMode } from '@/lib/speed';
import { normalizeSettings } from '@/lib/db';
import type { Quote } from '@/types';

const quote = (id: string, length: Quote['length']): Quote => ({ id, text: id, author: 'A', category: 'Wisdom', length });

describe('speed setup', () => {
  it('keeps a saved setup and replaces anything malformed', () => {
    expect(sanitizeSpeedPrefs({ mode: 'zen', time: 60, words: 7, quoteLength: 'huge', punctuation: 'yes', customText: 42 }))
      .toEqual({ ...DEFAULT_SPEED_PREFS, mode: 'zen', time: 60 });
    expect(normalizeSettings({}).speedPrefs).toEqual(DEFAULT_SPEED_PREFS);
  });

  it('files results under a name per mode and labels the default as 30 seconds', () => {
    expect(speedLabel(DEFAULT_SPEED_PREFS)).toBe('30 seconds');
    expect(speedSubMode(DEFAULT_SPEED_PREFS)).toBe('30s');
    expect(speedSubMode({ ...DEFAULT_SPEED_PREFS, mode: 'words', words: 50 })).toBe('50 words');
    expect(speedSubMode({ ...DEFAULT_SPEED_PREFS, mode: 'quote', quoteLength: 'short' })).toBe('quote · short');
    expect(speedSubMode({ ...DEFAULT_SPEED_PREFS, mode: 'zen' })).toBe('zen');
  });

  it('turns pasted text into one typeable line', () => {
    expect(practiceText('  “Hello”—world\n\nagain\t ')).toBe('"Hello" - world again');
  });

  it('picks a quote of the chosen length, or any when none match', () => {
    const quotes = [quote('a', 'short'), quote('b', 'long'), quote('c', 'long')];
    expect(pickQuote(quotes, 'short', () => 0.9)?.id).toBe('a');
    expect(pickQuote(quotes, 'long', () => 0.9)?.id).toBe('c');
    expect(pickQuote(quotes, 'medium', () => 0)?.id).toBe('a');
    expect(pickQuote([], 'any', () => 0)).toBeNull();
  });
});
