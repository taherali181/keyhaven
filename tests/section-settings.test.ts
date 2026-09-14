import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/lib/db';
import { sectionUpdate, settingsForSection } from '@/lib/section-settings';

const read = { ...DEFAULT_SETTINGS, font: 'playfair' as const, fontSize: 'xl' as const, theme: 'daylight' as const };

describe('per-section settings', () => {
  it('keeps Read on the top-level values and gives other sections their own defaults', () => {
    expect(settingsForSection(read, 'stories').font).toBe('playfair');
    const quotes = settingsForSection(read, 'quotes');
    expect(quotes.font).toBe(DEFAULT_SETTINGS.font);
    expect(quotes.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
    expect(quotes.theme).toBe('daylight');
  });

  it('saves typography changes to the section and shared changes to the top level', () => {
    const change = sectionUpdate(read, 'quotes', 'fontSize', 'sm');
    expect(change).toEqual({ sectionPrefs: { quotes: { fontSize: 'sm' } } });
    const next = { ...read, ...change };
    expect(settingsForSection(next, 'quotes').fontSize).toBe('sm');
    expect(settingsForSection(next, 'stories').fontSize).toBe('xl');
    expect(sectionUpdate(read, 'quotes', 'theme', 'reading-room')).toEqual({ theme: 'reading-room' });
    expect(sectionUpdate(read, 'stories', 'fontSize', 'sm')).toEqual({ fontSize: 'sm' });
  });
});
