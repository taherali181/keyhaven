import { describe, expect, it } from 'vitest';
import { DEFAULT_READER_STATS, resolveReaderStats, sanitizeReaderStats, type ReaderStatContext } from '@/lib/reader-stats';

const book: ReaderStatContext = {
  mode: 'read', isStory: false, unit: 'chapter', sectionTitle: 'Chapter IV', positionWords: 1_000, sectionStartWords: 800, sectionWords: 1_200,
  totalWords: 24_800, readingWpm: 240, typingWpm: 0, accuracy: 100, rawWpm: 0, elapsedSeconds: 0, bookPage: 4, bookPages: 83,
  part: 1, partCount: 7, now: 0, sessionStartedAt: 0
};

describe('reader stats', () => {
  it('shows chapter time, book time and the page in the book by default', () => {
    const stats = resolveReaderStats(DEFAULT_READER_STATS.read, book);
    expect(stats.map(stat => [stat.value, stat.short])).toEqual([['4 min', 'chapter left'], ['1h 39 min', 'book left'], ['4/83', 'page']]);
  });

  it('drops book-only items for stories and labels on request', () => {
    const stats = resolveReaderStats(['chapterTimeLeft', 'bookTimeLeft', 'chapterName'], { ...book, isStory: true, unit: 'story' }, false);
    expect(stats).toEqual([{ id: 'chapterTimeLeft', label: 'Time left in chapter', value: '4 min', short: undefined }]);
  });

  it('uses typing speed in typing mode and skips clock items until the clock runs', () => {
    const typing = { ...book, mode: 'type' as const, typingWpm: 60, accuracy: 96, elapsedSeconds: 75 };
    const stats = resolveReaderStats(['wpm', 'accuracy', 'elapsed', 'chapterTimeLeft', 'clock', 'bookPage'], typing);
    expect(stats.map(stat => stat.value)).toEqual(['60', '96%', '1:15', '17 min']);
  });

  it('sanitizes stored lists', () => {
    expect(sanitizeReaderStats({ read: ['bookPage', 'wpm', 'nope', 'bookPage'], type: 'bad' })).toEqual({ read: ['bookPage'], type: DEFAULT_READER_STATS.type });
    expect(sanitizeReaderStats(undefined)).toEqual(DEFAULT_READER_STATS);
  });

  it('keeps page numbers independent of chapter length and word position', () => {
    const page = (ctx: ReaderStatContext) => resolveReaderStats(['bookPage'], ctx)[0]?.value;
    expect(page({ ...book, positionWords: 2_000, sectionWords: 7_000 })).toBe('4/83');
    expect(page({ ...book, bookPage: 5, sectionStartWords: 2_000, sectionWords: 20 })).toBe('5/83');
    expect(page({ ...book, bookPage: 83, positionWords: book.totalWords })).toBe('83/83');
    expect(page({ ...book, isStory: true, bookPage: 2, bookPages: 8 })).toBe('2/8');
  });

  it('waits for measured pages and omits empty chapter names', () => {
    expect(resolveReaderStats(['bookPage'], { ...book, bookPage: null, bookPages: null })).toEqual([]);
    expect(resolveReaderStats(['chapterName'], { ...book, sectionTitle: '' })).toEqual([]);
  });
});
