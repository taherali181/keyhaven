import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { withoutAccents } from '@/lib/typing-match';
import type { Quote } from '@/types';

const quotes = JSON.parse(readFileSync(path.resolve('public/catalog/quotes.json'), 'utf8')) as Quote[];

describe('the quotes catalog', () => {
  it('has hundreds of quotes across the categories, each with a unique id and a source', () => {
    expect(quotes.length).toBeGreaterThanOrEqual(500);
    expect(new Set(quotes.map(quote => quote.id)).size).toBe(quotes.length);
    expect(new Set(quotes.map(quote => quote.category)).size).toBeGreaterThanOrEqual(10);
    for (const quote of quotes) {
      expect(quote.author, quote.id).toBeTruthy();
      expect(quote.source, quote.id).toBeTruthy();
      expect(quote.gutenberg, quote.id).toBeGreaterThan(0);
    }
  });

  it('keeps every quote tidy and typeable on a normal keyboard', () => {
    for (const quote of quotes) {
      expect(quote.text.length, quote.id).toBeGreaterThanOrEqual(20);
      expect(quote.text, quote.id).toMatch(/^[A-Z0-9]/);
      expect(quote.text, quote.id).not.toMatch(/[,;:'"[\]]$/);
      const odd = [...quote.text].filter(character => [...withoutAccents(character)].some(part => part.charCodeAt(0) > 126));
      expect(odd, quote.id).toEqual([]);
    }
  });
});
