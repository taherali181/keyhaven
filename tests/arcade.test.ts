import { describe, expect, it } from 'vitest';
import { CHAIN_WORDS, CODE_SNIPPETS, chainChoices, chainLetter, chainPoints, dailySeed, snippetRound } from '@/lib/arcade';
import { createRandom } from '@/lib/academy/generate';
import { arcadeBests } from '@/lib/profile-stats';

describe('arcade rules', () => {
  it('builds code rounds from distinct, typeable snippets, the same for the same seed', () => {
    expect(CODE_SNIPPETS.every(snippet => /^[\x20-\x7e]+$/.test(snippet))).toBe(true);
    const round = snippetRound(createRandom('day'));
    expect(round).toBe(snippetRound(createRandom('day')));
    const used = CODE_SNIPPETS.filter(snippet => round.includes(snippet));
    expect(used).toHaveLength(5);
  });

  it('offers unused words starting with the letter, shortest first', () => {
    const { letter, choices } = chainChoices('s', new Set(['sad']), createRandom('x'));
    expect(letter).toBe('s');
    expect(choices).toHaveLength(3);
    expect(choices.every(word => word.startsWith('s') && word !== 'sad' && CHAIN_WORDS.includes(word))).toBe(true);
    expect([...choices].sort((a, b) => a.length - b.length)).toEqual(choices);
  });

  it('moves to another letter when none are left', () => {
    const { letter, choices } = chainChoices('q', new Set(), () => 0, 3, ['alpha', 'apple', 'axe']);
    expect(letter).toBe('a');
    expect(choices).toEqual(['axe', 'alpha', 'apple']);
  });

  it('scores longer words and long chains higher', () => {
    expect(chainLetter('pear')).toBe('r');
    expect(chainPoints('river', 0)).toBe(50);
    expect(chainPoints('river', 5)).toBeGreaterThan(chainPoints('river', 0));
    expect(chainPoints('river', 50)).toBe(chainPoints('river', 20));
  });

  it('seeds the daily challenge by calendar day', () => {
    expect(dailySeed(new Date(2026, 8, 19, 23, 0))).toBe(dailySeed(new Date(2026, 8, 19, 6, 0)));
    expect(dailySeed(new Date(2026, 8, 20))).not.toBe(dailySeed(new Date(2026, 8, 19)));
  });

  it('reports bests for the new games', () => {
    const bests = arcadeBests([
      { clientId: 'a', game: 'accuracy-streak', score: 12, wpm: 50, accuracy: 99, timeMs: 1, timestamp: 1 },
      { clientId: 'b', game: 'word-chain', score: 340, wpm: 20, accuracy: 100, timeMs: 1, timestamp: 1 }
    ]);
    expect(bests.find(entry => entry.id === 'accuracy-streak')?.best).toBe('12 words');
    expect(bests.find(entry => entry.id === 'word-chain')?.best).toBe('340 pts');
    expect(bests.find(entry => entry.id === 'code-symbols')?.best).toBeNull();
  });
});
