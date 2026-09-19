import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { withoutAccents } from '@/lib/typing-match';

const DIR = path.resolve('public/catalog/stories');
const index = JSON.parse(readFileSync(path.join(DIR, 'index.json'), 'utf8')) as Array<{ id: string; title: string; author: string; words: number; tags: string[] }>;

describe('the short-story catalog', () => {
  it('has hundreds of stories with unique ids, and a file for each one only', () => {
    expect(index.length).toBeGreaterThanOrEqual(600);
    expect(new Set(index.map(story => story.id)).size).toBe(index.length);
    const files = readdirSync(DIR).filter(name => name !== 'index.json').map(name => name.replace(/\.json$/, '')).sort();
    expect(files).toEqual(index.map(story => story.id).sort());
  });

  it('keeps every story readable and typeable on a normal keyboard', () => {
    for (const story of index) {
      const { paragraphs } = JSON.parse(readFileSync(path.join(DIR, `${story.id}.json`), 'utf8')) as { paragraphs: string[] };
      expect(paragraphs.length, story.id).toBeGreaterThanOrEqual(3);
      // Accented letters are fine (a plain letter types them); anything else must be on the keyboard. £ is on UK keyboards.
      const odd = [...new Set([...paragraphs.join('')].filter(character => character !== '£' && [...withoutAccents(character)].some(part => part.charCodeAt(0) > 126)))];
      expect(odd, story.id).toEqual([]);
    }
  });
});
