import { describe, expect, it } from 'vitest';
import { sectionName } from '@/lib/reading';

describe('section names', () => {
  it.each(['Chapter I.', 'CHAPTER 3:', 'III.', 'Book I · Chapter II —', 'Part 2.', 'Section 4', 'Letter 7', 'Stave One'])('removes an empty numbered heading: %s', title => {
    expect(sectionName(title)).toBe('');
  });

  it.each([
    ['Chapter IV. The Storm', 'The Storm'],
    ['CHAPTER 3: The Storm', 'The Storm'],
    ['III. The Storm', 'The Storm'],
    ['Book I · Chapter II — The Storm', 'The Storm'],
    ['Volume Two: Part 2. Section IV — The Storm', 'The Storm'],
    ['Chapter One The Storm', 'The Storm'],
    ['7) The Letter', 'The Letter']
  ])('keeps the name in %s', (title, expected) => {
    expect(sectionName(title)).toBe(expected);
  });

  it.each(['I Strictly Business', 'Mix', 'Civil', 'Introduction', 'One Summer', 'Chapterhouse', 'Part of the Journey'])('preserves an unnumbered title: %s', title => {
    expect(sectionName(title)).toBe(title);
  });
});
