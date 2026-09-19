import { describe, expect, it } from 'vitest';
import { manuscriptSections, manuscriptTitle, manuscriptWords, typeableProse } from '@/lib/manuscript';
import { parseKey } from '@/lib/catalog';

describe('manuscripts', () => {
  it('splits "# Heading" lines into sections, with opening text named after the piece', () => {
    const sections = manuscriptSections({ title: 'Letters', body: 'A short opening.\n\n# The first\nOne.\n\nTwo.\n## The second ##\nThree.' });
    expect(sections.map(section => section.title)).toEqual(['Letters', 'The first', 'The second']);
    expect(sections[1].paragraphs).toEqual(['One.', 'Two.']);
    expect(sections.map(section => section.id)).toEqual(['m0', 'm1', 'm2']);
  });

  it('drops empty sections and keeps line breaks inside a paragraph', () => {
    const sections = manuscriptSections({ title: '', body: '# Empty\n\n# Verse\nRoses are red,\nviolets are blue.\n\n\n' });
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ id: 'm0', title: 'Verse', paragraphs: ['Roses are red,\nviolets are blue.'] });
  });

  it('has no sections until there is text', () => {
    expect(manuscriptSections({ title: 'Only a title', body: '  \n\n' })).toEqual([]);
  });

  it('makes punctuation typeable but leaves numbers in brackets alone', () => {
    expect(typeableProse('“Wait—please…” it’s (1) and [2]')).toBe('"Wait - please..." it\'s (1) and [2]');
  });

  it('titles an untitled piece by its first words', () => {
    expect(manuscriptTitle({ title: '  ', body: '\n# A beginning\nText' })).toBe('A beginning');
    expect(manuscriptTitle({ title: '', body: '' })).toBe('Untitled');
    expect(manuscriptTitle({ title: '', body: 'One two three four five six seven eight nine ten eleven twelve thirteen' })).toBe('One two three four five six seven eight nine…');
  });

  it('counts words without heading marks', () => {
    expect(manuscriptWords('# Title here\nThree more words')).toBe(5);
  });

  it('parses the ms: key', () => {
    expect(parseKey('ms:abc-1')).toEqual({ kind: 'manuscript', id: 'abc-1' });
  });
});
