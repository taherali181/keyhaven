import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/lib/db';
import { sanitizeSectionPrefs, sectionUpdate, settingsForSection } from '@/lib/section-settings';

const read = { ...DEFAULT_SETTINGS, font: 'playfair' as const, fontSize: 31, theme: 'daylight' as const };

describe('per-section settings', () => {
  it('keeps Read on the top-level values and gives other sections their own defaults', () => {
    expect(settingsForSection(read, 'stories').font).toBe('playfair');
    const quotes = settingsForSection(read, 'quotes');
    expect(quotes.font).toBe(DEFAULT_SETTINGS.font);
    expect(quotes.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
    expect(quotes.theme).toBe('daylight');
  });

  it('saves typography changes to the section and shared changes to the top level', () => {
    const change = sectionUpdate(read, 'quotes', 'fontSize', 19);
    expect(change).toEqual({ sectionPrefs: { quotes: { fontSize: 19 } } });
    const next = { ...read, ...change };
    expect(settingsForSection(next, 'quotes').fontSize).toBe(19);
    expect(settingsForSection(next, 'stories').fontSize).toBe(31);
    expect(sectionUpdate(read, 'quotes', 'theme', 'reading-room')).toEqual({ theme: 'reading-room' });
    expect(sectionUpdate(read, 'stories', 'fontSize', 19)).toEqual({ fontSize: 19 });
  });

  it('treats the new spacing and layout options as per-section typography', () => {
    expect(sectionUpdate(read, 'quotes', 'readerWordSpacing', 0.1)).toEqual({ sectionPrefs: { quotes: { readerWordSpacing: 0.1 } } });
    expect(sectionUpdate(read, 'quotes', 'readerAlign', 'justify')).toEqual({ sectionPrefs: { quotes: { readerAlign: 'justify' } } });
  });

  it('upgrades stored section preferences from the old fixed choices', () => {
    const prefs = sanitizeSectionPrefs({ quotes: { fontSize: 'sm', readerLetterSpacing: 'wide', readerWidth: 'full' } });
    expect(prefs.quotes).toEqual({ fontSize: 19, readerLetterSpacing: 0.045, readerWidth: 1400 });
  });
});
