import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '@/lib/db';
import { EXTRA_TONES, MAIN_TONES, RECIPE_TONES, contrastRatio, resolveTone, toneName, toneVariables } from '@/lib/reader-style';

describe('unified themes', () => {
  it('uses Night by default', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('night');
  });

  it('preserves an explicit legacy page tone over the old chrome theme', () => {
    expect(normalizeSettings({ theme: 'daylight', readerPaper: 'rose' }).theme).toBe('rose');
  });

  it('migrates Match theme to Night', () => {
    expect(normalizeSettings({ theme: 'daylight', readerPaper: 'system' }).theme).toBe('night');
  });

  it('preserves a valid custom tone and falls back when it is missing', () => {
    const customTones = [{ id: 'mint', name: 'Mint', background: '#dfe9df', text: '#202a23', accent: '#45674d' }];
    expect(normalizeSettings({ readerPaper: 'custom:mint', customTones }).theme).toBe('custom:mint');
    expect(normalizeSettings({ theme: 'custom:missing', customTones }).theme).toBe('night');
    expect(resolveTone('custom:missing', customTones).attr).toBe('night');
  });

  it('derives panel glass as part of every generated palette', () => {
    expect(toneVariables(RECIPE_TONES.rose)).toHaveProperty('--glass-fill-panel');
  });

  it('keeps all twelve built-in themes in the requested order', () => {
    expect([...MAIN_TONES, ...EXTRA_TONES].map(toneName)).toEqual([
      'Night', 'Soft paper', 'Sepia', 'Pitch black', 'Rose dusk', 'Deep ocean',
      'Sage', 'Espresso', 'Slate', 'Mist', 'Bright white', 'Lavender haze'
    ]);
  });

  it('gives Lavender haze comfortable text contrast', () => {
    const lavender = RECIPE_TONES.lavender;
    expect(contrastRatio(lavender.background, lavender.text)).toBeGreaterThanOrEqual(4.5);
  });
});
