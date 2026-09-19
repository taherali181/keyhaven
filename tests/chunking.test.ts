import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHUNK_TARGET_WORDS, chunkParagraphs, countWords } from '@/lib/reading';
import type { StoryMeta } from '@/types';

const paragraph = (count: number, word = 'word') => Array.from({ length: count }, () => word).join(' ');

describe('typing chunks', () => {
  it('groups paragraphs without splitting them and joins them with line breaks', () => {
    const paragraphs = [paragraph(60, 'a'), paragraph(70, 'b'), paragraph(80, 'c'), paragraph(90, 'd'), paragraph(100, 'e')];
    const chunks = chunkParagraphs(paragraphs);
    expect(chunks.map(chunk => chunk.text).join('\n')).toBe(paragraphs.join('\n'));
    for (const chunk of chunks) expect(chunk.text.split('\n').every(part => paragraphs.includes(part))).toBe(true);
    expect(chunks[0]).toMatchObject({ firstParagraph: 0, lastParagraph: 2 });
  });

  it('splits a very long paragraph at sentence ends', () => {
    const sentence = `${paragraph(29)} end.`;
    const long = Array.from({ length: 30 }, () => sentence).join(' ');
    const chunks = chunkParagraphs([long]);
    expect(chunks.length).toBeGreaterThan(3);
    for (const chunk of chunks) {
      expect(chunk.text.endsWith('end.')).toBe(true);
      expect(chunk.words).toBeLessThan(CHUNK_TARGET_WORDS * 1.6);
    }
    expect(chunks.reduce((sum, chunk) => sum + chunk.words, 0)).toBe(countWords(long));
  });

  it('folds a short tail into the previous chunk', () => {
    const chunks = chunkParagraphs([paragraph(200), paragraph(20)]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].words).toBe(220);
  });
});

describe('story catalog', () => {
  const index = JSON.parse(readFileSync('public/catalog/stories/index.json', 'utf8')) as StoryMeta[];

  it('has unique ids and a text file for every story', () => {
    expect(index.length).toBeGreaterThanOrEqual(250);
    expect(new Set(index.map(story => story.id)).size).toBe(index.length);
    for (const story of index) {
      const { paragraphs } = JSON.parse(readFileSync(`public/catalog/stories/${story.id}.json`, 'utf8')) as { paragraphs: string[] };
      expect(paragraphs.length, story.id).toBeGreaterThanOrEqual(3);
      expect(paragraphs.join(' '), story.id).not.toMatch(/[“”‘’—]|project gutenberg/i);
    }
  });

  it('keeps the stories the app used to ship', () => {
    const ids = new Set(index.map(story => story.id));
    for (const id of ['gift-of-the-magi', 'the-bet', 'the-happy-prince', 'tell-tale-heart', 'the-mark-on-the-wall', 'the-little-match-girl', 'scandal-in-bohemia']) expect(ids.has(id), id).toBe(true);
  });
});

describe('pictures in imported books', () => {
  it('stay in the reading paragraphs but never in the typed text or the word count', async () => {
    const { chunkParagraphs, countWords, imageAssetId } = await import('@/lib/reading');
    const [chunk] = chunkParagraphs(['Hello there.', '[[kh-img:abc-1]]', 'Goodbye now.']);
    expect(chunk.paragraphs).toEqual(['Hello there.', '[[kh-img:abc-1]]', 'Goodbye now.']);
    expect(chunk.text).toBe('Hello there.\nGoodbye now.');
    expect(chunk.words).toBe(4);
    expect(countWords('One [[kh-img:abc-1]] two')).toBe(2);
    expect(imageAssetId('[[kh-img:abc-1]]')).toBe('abc-1');
    expect(imageAssetId('Not a picture')).toBeNull();
  });
});
