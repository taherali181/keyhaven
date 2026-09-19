// Content and rules for the Arcade games that don't need the screen: snippets, word chains and the daily seed.
import { ACADEMY_WORDS } from '@/data/academy/words';
import { COMMON_WORDS_200 } from '@/data/word-lists';

/** Short lines of code and shell, heavy on the symbols everyday typing never reaches. */
export const CODE_SNIPPETS = [
  'const doubled = values.map((n) => n * 2);',
  'if (a !== b && count <= 10) { return; }',
  'for (let i = 0; i < n; i++) sum += v[i];',
  'def area(r): return 3.14 * r ** 2',
  'SELECT name, email FROM users WHERE id = 42;',
  '<a href="/home" class="nav">Home</a>',
  '.card { margin: 0 auto; padding: 8px 16px; }',
  'git commit -m "fix: handle empty input"',
  'npm run build && npm test',
  'const name = user?.profile?.name ?? "guest";',
  'const { id, ...rest } = props;',
  'const left = items.filter((x) => !x.done).length;',
  'let total = price * (1 + tax / 100);',
  'print(f"{name}: {score:.2f}")',
  'while (queue.length > 0) { visit(queue.shift()); }',
  "import { useState } from 'react';",
  'squares = [i * i for i in range(10) if i % 2]',
  'if [ -f ~/.bashrc ]; then source ~/.bashrc; fi',
  'counts[key] = (counts[key] || 0) + 1;',
  'fn main() { println!("hi {}", 7); }',
  '@media (max-width: 600px) { body { font-size: 14px; } }',
  '{"name": "keyhaven", "version": "1.0.0"}',
  'ls -la | grep ".ts$" | wc -l',
  'return a < b ? -1 : a > b ? 1 : 0;',
  '#include <stdio.h>',
  "curl -X POST -d '{\"q\": 1}' localhost:3000",
  'const re = /^[a-z0-9_-]{3,16}$/i;',
  's = s.strip().lower().replace(" ", "_")',
  'if err != nil { return nil, err }',
  '<input type="email" name="to" required />',
  'a[i], a[j] = a[j], a[i]',
  'console.log(`Total: ${total}`);',
  'const pairs = new Map([["a", 1], ["b", 2]]);',
  'flags &= ~(1 << 3);',
  'assert len(xs) == 3, "bad size"',
  'export default function App() { return null; }'
];

/** One round of Code Symbols: a few snippets, chosen by the given random source, never the same one twice. */
export function snippetRound(random: () => number, count = 5) {
  const pool = [...CODE_SNIPPETS];
  const picked: string[] = [];
  while (picked.length < count && pool.length) picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return picked.join(' ');
}

/** The words Word Chain offers: everyday words of three letters or more. */
export const CHAIN_WORDS = [...new Set([...ACADEMY_WORDS, ...COMMON_WORDS_200].map(word => word.toLowerCase()).filter(word => /^[a-z]{3,}$/.test(word)))];

/** The letter the next word must start with. */
export const chainLetter = (word: string) => word.at(-1) ?? 'a';

/**
 * Up to `count` unused words starting with `letter`, a spread of lengths so there's a real choice between a quick
 * short word and a long one worth more. When no word starts with the letter, another letter is chosen.
 */
export function chainChoices(letter: string, used: ReadonlySet<string>, random: () => number, count = 3, words = CHAIN_WORDS): { letter: string; choices: string[] } {
  let pool = words.filter(word => word[0] === letter && !used.has(word));
  if (!pool.length) {
    const letters = [...new Set(words.filter(word => !used.has(word)).map(word => word[0]))];
    if (!letters.length) return { letter, choices: [] };
    letter = letters[Math.floor(random() * letters.length)];
    pool = words.filter(word => word[0] === letter && !used.has(word));
  }
  const byLength = [...pool].sort((a, b) => a.length - b.length);
  const choices = new Set<string>();
  // One from each third of the lengths, then any others.
  for (let part = 0; part < count && choices.size < pool.length; part++) {
    const from = Math.floor((part / count) * byLength.length);
    const to = Math.max(from + 1, Math.floor(((part + 1) / count) * byLength.length));
    choices.add(byLength[from + Math.floor(random() * (to - from))]);
  }
  while (choices.size < Math.min(count, pool.length)) choices.add(pool[Math.floor(random() * pool.length)]);
  return { letter, choices: [...choices].sort((a, b) => a.length - b.length) };
}

/** Points for a word in the chain: longer words are worth more, and a long chain adds a bonus. */
export const chainPoints = (word: string, chain: number) => word.length * 10 + Math.min(chain, 20) * 2;

/** Today's date as a seed, so the daily challenge is the same all day. */
export function dailySeed(now = new Date()) {
  return `daily:${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}
