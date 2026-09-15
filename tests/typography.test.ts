import { describe, expect, it } from 'vitest';
import { DEFAULT_TYPOGRAPHY, TYPE_PRESETS, TYPE_RANGES, matchesTypography, normalizeTypography, snap } from '@/lib/typography';
import { loadSettings } from '@/lib/db';

describe('reader typography', () => {
  it('converts the old tile choices to the values they used to render', () => {
    expect(normalizeTypography({ fontSize: 'xl', readerLetterSpacing: 'tight', readerWidth: 'narrow' })).toEqual({ fontSize: 31, readerLetterSpacing: -0.01, readerWidth: 640 });
    expect(normalizeTypography({ fontSize: 'base', readerLetterSpacing: 'normal', readerWidth: 'balanced' })).toEqual({ fontSize: 23, readerLetterSpacing: 0.005, readerWidth: 780 });
  });

  it('snaps numbers to the slider step and clamps them to its range', () => {
    expect(normalizeTypography({ fontSize: 100, readerFontWeight: 333, readerLineHeight: 1.83, readerWordSpacing: -1 }))
      .toEqual({ fontSize: 44, readerFontWeight: 350, readerLineHeight: 1.85, readerWordSpacing: 0 });
    expect(snap(0.0061, TYPE_RANGES.readerLetterSpacing)).toBe(0.005);
  });

  it('replaces unusable values with defaults and leaves absent keys absent', () => {
    expect(normalizeTypography({ font: 'comic-sans', readerAlign: 'center', readerParagraphSpacing: 7, readerHyphens: 'yes' }))
      .toEqual({ font: DEFAULT_TYPOGRAPHY.font, readerAlign: 'left', readerParagraphSpacing: 1, readerHyphens: false });
    expect(normalizeTypography({})).toEqual({});
  });

  it('only ships presets that are already valid settings', () => {
    for (const preset of TYPE_PRESETS) {
      expect(normalizeTypography(preset.values), preset.id).toEqual(preset.values);
      expect(matchesTypography(preset.values, preset.values)).toBe(true);
    }
    expect(new Set(TYPE_PRESETS.map(preset => preset.id)).size).toBe(TYPE_PRESETS.length);
  });

  it('upgrades settings saved by an older version', () => {
    localStorage.setItem('keyhaven_settings_v1', JSON.stringify({ fontSize: 'lg', readerLetterSpacing: 'wide', readerWidth: 'wide', readerFontWeight: 600 }));
    const settings = loadSettings();
    expect(settings).toMatchObject({ fontSize: 27, readerLetterSpacing: 0.045, readerWidth: 940, readerFontWeight: 600, readerAlign: 'left', readerParagraphSpacing: 1 });
    localStorage.removeItem('keyhaven_settings_v1');
  });
});
