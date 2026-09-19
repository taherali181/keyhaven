import { describe, expect, it } from 'vitest';
import { createRandom } from '@/lib/academy/generate';
import { COMMON_WORDS_200, generateRandomWords } from '@/data/word-lists';

describe('speed test words', () => {
  it('gives the same words for the same seed, so the server and browser agree', () => {
    expect(generateRandomWords(40, true, true, createRandom('a'))).toBe(generateRandomWords(40, true, true, createRandom('a')));
    expect(generateRandomWords(40, false, false, createRandom('a'))).not.toBe(generateRandomWords(40, false, false, createRandom('b')));
  });

  it('makes the requested number of words from the common list', () => {
    const words = generateRandomWords(25, false, false, createRandom('count')).split(' ');
    expect(words).toHaveLength(25);
    for (const word of words) expect(COMMON_WORDS_200).toContain(word);
  });
});
