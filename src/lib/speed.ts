// Speed test setup: the modes, their lengths, and how each names its results.
import type { Quote, QuoteLength, SpeedMode, SpeedPrefs } from '@/types';
import { typeableProse } from '@/lib/manuscript';

export const TIME_OPTIONS = [15, 30, 60, 120];
export const WORD_OPTIONS = [10, 25, 50, 100];
export const QUOTE_LENGTHS: QuoteLength[] = ['short', 'medium', 'long', 'any'];
export const SPEED_MODES: Array<{ value: SpeedMode; label: string }> = [
  { value: 'time', label: 'Time' }, { value: 'words', label: 'Words' }, { value: 'quote', label: 'Quote' },
  { value: 'custom', label: 'Custom' }, { value: 'zen', label: 'Zen' }
];
/** Custom text is kept to a length that stays quick to lay out and to sync. */
export const MAX_CUSTOM_CHARS = 5000;
/** Zen runs until you stop; this many words are laid out ahead. */
export const ZEN_WORDS = 400;

export const DEFAULT_SPEED_PREFS: SpeedPrefs = { mode: 'time', time: 30, words: 25, quoteLength: 'any', punctuation: false, numbers: false, customText: '' };

const oneOf = <T,>(value: unknown, options: readonly T[], fallback: T) => (options.includes(value as T) ? value as T : fallback);

export function sanitizeSpeedPrefs(value: unknown): SpeedPrefs {
  const stored = value && typeof value === 'object' ? value as Partial<SpeedPrefs> : {};
  return {
    mode: oneOf(stored.mode, SPEED_MODES.map(mode => mode.value), DEFAULT_SPEED_PREFS.mode),
    time: oneOf(stored.time, TIME_OPTIONS, DEFAULT_SPEED_PREFS.time),
    words: oneOf(stored.words, WORD_OPTIONS, DEFAULT_SPEED_PREFS.words),
    quoteLength: oneOf(stored.quoteLength, QUOTE_LENGTHS, DEFAULT_SPEED_PREFS.quoteLength),
    punctuation: stored.punctuation === true,
    numbers: stored.numbers === true,
    customText: typeof stored.customText === 'string' ? stored.customText.slice(0, MAX_CUSTOM_CHARS) : ''
  };
}

/** Pasted text made ready to type: plain punctuation and single spaces, lines run together. */
export function practiceText(text: string) {
  return typeableProse(text).replace(/\s+/g, ' ').trim().slice(0, MAX_CUSTOM_CHARS);
}

/** The name results are filed under, e.g. "30s", "25 words", "quote · short". */
export function speedSubMode(prefs: SpeedPrefs) {
  switch (prefs.mode) {
    case 'time': return `${prefs.time}s`;
    case 'words': return `${prefs.words} words`;
    case 'quote': return prefs.quoteLength === 'any' ? 'quote' : `quote · ${prefs.quoteLength}`;
    case 'custom': return 'custom';
    case 'zen': return 'zen';
  }
}

/** What the setup button says. The time label ("30 seconds") is what people look for first. */
export function speedLabel(prefs: SpeedPrefs) {
  switch (prefs.mode) {
    case 'time': return `${prefs.time} seconds`;
    case 'words': return `${prefs.words} words`;
    case 'quote': return prefs.quoteLength === 'any' ? 'Any length' : `${prefs.quoteLength[0].toUpperCase()}${prefs.quoteLength.slice(1)} quotes`;
    case 'custom': return 'Your text';
    case 'zen': return 'Until you stop';
  }
}

/** A quote of the chosen length, picked with the given random source. */
export function pickQuote(quotes: Quote[], length: QuoteLength, random: () => number) {
  const pool = length === 'any' ? quotes : quotes.filter(quote => quote.length === length);
  const from = pool.length ? pool : quotes;
  return from.length ? from[Math.floor(random() * from.length)] : null;
}
