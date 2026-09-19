import { describe, expect, it } from 'vitest';
import { normalizeSettings } from '@/lib/db';
import { DEFAULT_READER_INPUT, MAX_BINDINGS, bindingConflicts, bindingFor, bindingLabel, createWheelPager, resolvePageAction, sanitizeReaderInput } from '@/lib/reader-input';

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

describe('turning pages with keys', () => {
  const keys = DEFAULT_READER_INPUT.keys;
  const press = (key: string, shiftKey = false) => resolvePageAction({ key, shiftKey }, keys);

  it('keeps the keys readers already know', () => {
    expect(press('ArrowRight')).toBe('next');
    expect(press('PageDown')).toBe('next');
    expect(press(' ')).toBe('next');
    expect(press(' ', true)).toBe('prev');
    expect(press('ArrowLeft')).toBe('prev');
    expect(press('Home')).toBe('first');
    expect(press('End')).toBe('last');
    expect(press('x')).toBeNull();
  });

  it('still turns with Shift held when only the plain key is mapped', () => {
    expect(press('ArrowRight', true)).toBe('next');
  });

  it('follows remapped keys, ignoring letter case', () => {
    const mine = { ...keys, next: ['j'], prev: ['k'] };
    expect(resolvePageAction({ key: 'j', shiftKey: false }, mine)).toBe('next');
    expect(resolvePageAction({ key: 'K', shiftKey: false }, mine)).toBe('prev');
    expect(resolvePageAction({ key: 'ArrowRight', shiftKey: false }, mine)).toBeNull();
  });

  it('names and labels bindings the way people read them', () => {
    expect(bindingFor({ key: ' ', shiftKey: true })).toBe('Shift+Space');
    expect(bindingFor({ key: 'J', shiftKey: true })).toBe('Shift+j');
    expect(bindingLabel('ArrowLeft')).toBe('←');
    expect(bindingLabel('Shift+Space')).toBe('Shift Space');
    expect(bindingLabel('j')).toBe('J');
  });

  it('spots a key already used by another action', () => {
    expect(bindingConflicts('Space', keys, 'prev')).toEqual(['next']);
    expect(bindingConflicts('Space', keys, 'next')).toEqual([]);
  });
});

describe('turning pages with the wheel', () => {
  it('turns one page once enough movement adds up', () => {
    const pager = createWheelPager(() => 0);
    expect(pager(40)).toBeNull();
    expect(pager(50)).toBe(1);
  });

  it('turns one page per trackpad flick, however long the momentum runs', () => {
    let now = 0;
    const pager = createWheelPager(() => now);
    const steps = [];
    for (let frame = 0; frame < 60; frame++) { now = frame * 16; steps.push(pager(30)); }
    expect(steps.filter(Boolean)).toEqual([1]);
  });

  it('turns a page for each separate click of a mouse wheel, in either direction', () => {
    let now = 0;
    const pager = createWheelPager(() => now);
    expect(pager(100)).toBe(1);
    now = 500;
    expect(pager(100)).toBe(1);
    now = 1000;
    expect(pager(-100)).toBe(-1);
  });
});
