// Drill text for Academy steps. Deterministic for a lesson, step and attempt (so a page reload shows the same
// text and a retry shows new text), and early lessons only ever use keys that have been taught.
import { ACADEMY_WORDS } from '@/data/academy/words';
import type { AcademyLesson } from '@/lib/academy/types';

function hashSeed(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** A small seeded random generator (mulberry32). */
export function createRandom(seed: string) {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = () => number;
const pick = <T>(items: readonly T[], random: Random) => items[Math.floor(random() * items.length)];
const LETTER = /^[a-z]$/;
const COMMON_BIGRAMS = ['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd', 'ti', 'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar', 'st', 'to', 'nt', 'ng'];

export function wordsWithin(allowed: Set<string>, words: readonly string[] = ACADEMY_WORDS) {
  return words.filter(word => [...word].every(character => allowed.has(character)));
}

/** Groups of two to four keys, mostly the new ones. */
export function keyDrill(focus: string[], allowed: string[], random: Random, groups = 14) {
  const pool = focus.length ? focus : allowed;
  return Array.from({ length: groups }, () => {
    const length = 2 + Math.floor(random() * 3);
    return Array.from({ length }, () => (random() < 0.7 ? pick(pool, random) : pick(allowed, random))).join('');
  }).join(' ');
}

/** Each new key paired with the keys around it, in both directions. */
export function pairDrill(focus: string[], allowed: string[], random: Random, count = 16) {
  const pool = focus.length ? focus : allowed;
  return Array.from({ length: count }, () => {
    const a = pick(pool, random);
    const b = pick(allowed, random);
    return random() < 0.5 ? `${a}${b}${a}` : `${b}${a}${b}${a}`;
  }).join(' ');
}

/** The most frequent English letter pairs, each followed by a word that uses it. */
export function commonPairDrill(random: Random, count = 12) {
  return Array.from({ length: count }, () => {
    const pair = pick(COMMON_BIGRAMS, random);
    const words = ACADEMY_WORDS.filter(word => word.includes(pair) && word.length > 2);
    return words.length ? `${pair} ${pick(words, random)}` : `${pair}${pair}`;
  }).join(' ');
}

export interface WordOptions { capitals?: boolean; punctuation?: boolean; numbers?: boolean }

/** Real words spelled only with allowed keys, favouring the new keys; invented letter groups when too few exist. */
export function wordDrill(focus: string[], allowed: Set<string>, random: Random, count = 20, options: WordOptions = {}) {
  const letters = [...allowed].filter(character => LETTER.test(character));
  const focusLetters = focus.filter(key => LETTER.test(key));
  const pool = wordsWithin(allowed);
  const focused = focusLetters.length ? pool.filter(word => focusLetters.some(key => word.includes(key))) : pool;
  const invented = () => Array.from({ length: 3 + Math.floor(random() * 3) }, (_, index) => pick(index % 2 && focusLetters.length ? focusLetters : letters, random)).join('');
  return Array.from({ length: count }, (_, index) => {
    let word = focused.length >= 6 && random() < 0.75 ? pick(focused, random) : pool.length >= 6 ? pick(pool, random) : invented();
    if (options.numbers && random() < 0.35) word = String(Math.floor(random() * (random() < 0.5 ? 10 : 2000)));
    if (options.capitals && (index === 0 || random() < 0.4)) word = word.charAt(0).toUpperCase() + word.slice(1);
    if (options.punctuation && random() < 0.35) word = random() < 0.5 ? `${word}'s` : `${word};`;
    return word;
  }).join(' ');
}

export function stepText(lesson: AcademyLesson, stepIndex: number, attempt = 0) {
  const step = lesson.steps[stepIndex];
  if (!step) return '';
  if (step.text) return step.text;
  const random = createRandom(`${lesson.id}:${stepIndex}:${attempt}`);
  const allowedKeys = lesson.keys.filter(key => key.length === 1);
  const allowed = new Set(allowedKeys);
  const focus = lesson.newKeys.filter(key => key.length === 1);
  const options = { capitals: step.capitals, punctuation: step.punctuation, numbers: step.numbers };
  switch (step.kind) {
    case 'keys': return keyDrill(focus, allowedKeys, random);
    case 'bigrams': return lesson.bigrams ? commonPairDrill(random) : pairDrill(focus, allowedKeys, random);
    case 'words':
    case 'sentence': return wordDrill(focus, allowed, random, 20, options);
    case 'checkpoint': return wordDrill(focus, allowed, random, 26, options);
  }
}

const ALL_LETTERS = new Set('abcdefghijklmnopqrstuvwxyz'.split(''));

/** An adaptive review: real words built around the given weak keys. */
export function reviewText(keys: string[], seed: string, count = 22) {
  const random = createRandom(seed);
  return wordDrill(keys, ALL_LETTERS, random, count, { punctuation: keys.some(key => key === "'" || key === ';') });
}
