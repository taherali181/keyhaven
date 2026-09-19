import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/lib/db';
import { sanitizeSectionPrefs, sectionTypographyDefaults, sectionUpdate, settingsForSection } from '@/lib/section-settings';

const read = { ...DEFAULT_SETTINGS, font: 'playfair' as const, fontSize: 31, theme: 'sage' as const };

describe('per-section settings', () => {
  it('keeps Read on the top-level values and gives other sections their own defaults', () => {
    expect(settingsForSection(read, 'stories').font).toBe('playfair');
    const quotes = settingsForSection(read, 'quotes');
    expect(quotes.font).toBe(DEFAULT_SETTINGS.font);
    expect(quotes.theme).toBe('sage');
    expect(settingsForSection(read, 'speed-test').fontSize).toBe(DEFAULT_SETTINGS.fontSize);
  });

  it('starts quotes larger than Read, resets them to that size, and keeps a size the reader chose', () => {
    expect(settingsForSection(read, 'quotes').fontSize).toBe(32);
    expect(sectionTypographyDefaults('quotes').fontSize).toBe(32);
    expect(sectionTypographyDefaults('stories').fontSize).toBe(DEFAULT_SETTINGS.fontSize);
    expect(settingsForSection({ ...read, sectionPrefs: { quotes: { fontSize: 26 } } }, 'quotes').fontSize).toBe(26);
  });

  it('saves typography changes to the section and shared changes to the top level', () => {
    const change = sectionUpdate(read, 'quotes', 'fontSize', 19);
    expect(change).toEqual({ sectionPrefs: { quotes: { fontSize: 19 } } });
    const next = { ...read, ...change };
    expect(settingsForSection(next, 'quotes').fontSize).toBe(19);
    expect(settingsForSection(next, 'stories').fontSize).toBe(31);
    expect(sectionUpdate(read, 'quotes', 'theme', 'night')).toEqual({ theme: 'night' });
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
