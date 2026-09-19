import { describe, expect, it } from 'vitest';
import { anchorFromRange, highlightsMarkdown, reanchor, segmentParagraph } from '@/lib/highlights';
import type { HighlightRecord } from '@/types';

const record = (over: Partial<HighlightRecord>): HighlightRecord => ({ id: 'h', workKey: 'story:x', sectionIndex: 0, paragraph: 0, start: 0, end: 1, quote: '', color: 'yellow', createdAt: 1, updatedAt: 1, ...over });

describe('anchoring a selection', () => {
  it('finds the paragraph and offsets, across highlighted runs, trimming spaces', () => {
    document.body.innerHTML = '<p data-paragraph="3">One dollar <mark>and eighty</mark>-seven cents.</p>';
    const p = document.querySelector('p')!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 3); // " dollar"
    range.setEnd(p.querySelector('mark')!.firstChild!, 3); // "and"
    expect(anchorFromRange(range)).toEqual({ paragraph: 3, start: 4, end: 14, quote: 'dollar and' });
  });

  it('completes words the selection only partly covers', () => {
    document.body.innerHTML = '<p data-paragraph="0">One dollar and eighty-seven cents.</p>';
    const p = document.querySelector('p')!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 16); // "ighty-seven"
    range.setEnd(p.firstChild!, 30); // "cen"
    expect(anchorFromRange(range)?.quote).toBe('eighty-seven cents');
  });

  it('refuses selections that cross paragraphs or are only spaces', () => {
    document.body.innerHTML = '<p data-paragraph="0">First one.</p><p data-paragraph="1">Second one.</p>';
    const [a, b] = document.querySelectorAll('p');
    const across = document.createRange();
    across.setStart(a.firstChild!, 2); across.setEnd(b.firstChild!, 3);
    expect(anchorFromRange(across)).toBeNull();
    const blank = document.createRange();
    blank.setStart(a.firstChild!, 5); blank.setEnd(a.firstChild!, 6);
    expect(anchorFromRange(blank)).toBeNull();
  });
});

describe('drawing highlights', () => {
  it('splits a paragraph into plain and highlighted runs', () => {
    const segments = segmentParagraph('abcdefgh', [record({ id: 'a', start: 2, end: 4 }), record({ id: 'b', start: 6, end: 8, color: 'blue' })]);
    expect(segments.map(segment => [segment.text, segment.highlight?.id ?? null])).toEqual([['ab', null], ['cd', 'a'], ['ef', null], ['gh', 'b']]);
  });

  it('gives overlaps to the older highlight and keeps every character once', () => {
    const segments = segmentParagraph('abcdef', [record({ id: 'new', start: 1, end: 5, createdAt: 2 }), record({ id: 'old', start: 3, end: 6, createdAt: 1 })]);
    expect(segments.map(segment => segment.text).join('')).toBe('abcdef');
    expect(segments.map(segment => [segment.text, segment.highlight?.id ?? null])).toEqual([['a', null], ['bc', 'new'], ['def', 'old']]);
  });
});

describe('finding a highlight again', () => {
  it('keeps offsets that still match and relocates a quote that moved', () => {
    expect(reanchor({ start: 4, end: 9, quote: 'quick' }, 'The quick fox')).toEqual({ start: 4, end: 9 });
    expect(reanchor({ start: 4, end: 9, quote: 'quick' }, 'A very quick fox')).toEqual({ start: 7, end: 12 });
    expect(reanchor({ start: 0, end: 3, quote: 'gone' }, 'nothing here')).toBeNull();
  });
});

describe('exporting', () => {
  it('writes Markdown grouped by chapter, with notes under their quotes', () => {
    const markdown = highlightsMarkdown('Emma', 'Jane Austen', [
      record({ id: '2', sectionIndex: 1, quote: 'Second', note: 'Mine' }),
      record({ id: '1', sectionIndex: 0, quote: 'First' })
    ], index => `Chapter ${index + 1}`);
    expect(markdown).toBe('# Emma\n*Jane Austen*\n\n## Chapter 1\n\n> First\n\n## Chapter 2\n\n> Second\n\nMine\n');
  });
});
