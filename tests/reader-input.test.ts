import { describe, expect, it } from 'vitest';
import { normalizeSettings } from '@/lib/db';
import { DEFAULT_READER_INPUT, MAX_BINDINGS, sanitizeReaderInput } from '@/lib/reader-input';

describe('page-turn input settings', () => {
  it('starts with the keys KeyHaven has always used, wheel and click zones off', () => {
    const settings = normalizeSettings({});
    expect(settings.readerInput).toEqual(DEFAULT_READER_INPUT);
    expect(settings.readerInput.keys.next).toContain('Space');
    expect(settings.readerInput.keys.prev).toContain('Shift+Space');
    expect(settings.quoteFilter).toBe('all');
  });

  it('keeps valid choices and repairs broken ones', () => {
    const input = sanitizeReaderInput({ wheel: true, clickZones: 'yes', keys: { next: ['j', 'j', 42, 'two words'], prev: 'k' } });
    expect(input.wheel).toBe(true);
    expect(input.clickZones).toBe(false);
    expect(input.keys.next).toEqual(['j']);
    expect(input.keys.prev).toEqual(DEFAULT_READER_INPUT.keys.prev);
    expect(input.keys.first).toEqual(['Home']);
  });

  it('allows an action with no keys and caps long lists', () => {
    expect(sanitizeReaderInput({ keys: { last: [] } }).keys.last).toEqual([]);
    expect(sanitizeReaderInput({ keys: { next: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] } }).keys.next).toHaveLength(MAX_BINDINGS);
  });

  it('accepts the plus key and shifted keys as bindings', () => {
    expect(sanitizeReaderInput({ keys: { next: ['+', 'Shift+J', 'Shift++'] } }).keys.next).toEqual(['+', 'Shift+J', 'Shift++']);
  });

  it('drops an unusable quote filter', () => {
    expect(normalizeSettings({ quoteFilter: 7 }).quoteFilter).toBe('all');
    expect(normalizeSettings({ quoteFilter: 'saved' }).quoteFilter).toBe('saved');
  });
});
