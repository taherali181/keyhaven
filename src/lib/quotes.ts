// Quotes load once, on first use, from public/catalog/quotes.json (built by scripts/catalog/build-quotes.mjs).
import type { Quote } from '@/types';

let loading: Promise<Quote[]> | null = null;

export function loadQuotes(): Promise<Quote[]> {
  loading ??= fetch('/catalog/quotes.json').then(response => {
    if (!response.ok) throw new Error('Quotes could not be loaded.');
    return response.json() as Promise<Quote[]>;
  }).catch(error => { loading = null; throw error; });
  return loading;
}

/** Favourite keys for quotes: `quote:<id>`. */
export const quoteKey = (id: string) => `quote:${id}`;

/** The categories in the order they first appear, which follows the catalog's sections. */
export const quoteCategories = (quotes: Quote[]) => [...new Set(quotes.map(quote => quote.category))];
