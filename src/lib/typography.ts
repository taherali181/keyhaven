// Reader typography: the ranges the settings sliders allow, the defaults, presets, and migration from the old
// fixed choices (fontSize 'sm'…'xl', letter spacing 'tight'…'wide', margins 'narrow'…'full').
import type { FontFamily, UserSettings } from '@/types';
import { FONTS } from '@/lib/themes';

export const TYPOGRAPHY_KEYS = ['font', 'fontSize', 'readerFontWeight', 'readerLineHeight', 'readerLetterSpacing', 'readerWordSpacing', 'readerParagraphSpacing', 'readerWidth', 'readerAlign', 'readerHyphens'] as const;
export type TypographyKey = (typeof TYPOGRAPHY_KEYS)[number];
export type Typography = Pick<UserSettings, TypographyKey>;

export interface Range { min: number; max: number; step: number }

export const TYPE_RANGES = {
  fontSize: { min: 14, max: 44, step: 1 },
  readerFontWeight: { min: 300, max: 700, step: 50 },
  readerLineHeight: { min: 1.2, max: 2.6, step: 0.05 },
  readerLetterSpacing: { min: -0.03, max: 0.12, step: 0.005 },
  readerWordSpacing: { min: 0, max: 0.4, step: 0.02 },
  readerWidth: { min: 480, max: 1400, step: 20 }
} satisfies Record<string, Range>;

type NumericKey = keyof typeof TYPE_RANGES;

export const DEFAULT_TYPOGRAPHY: Typography = {
  font: 'serif', fontSize: 23, readerFontWeight: 400, readerLineHeight: 1.8, readerLetterSpacing: 0.005,
  readerWordSpacing: 0, readerParagraphSpacing: 1, readerWidth: 780, readerAlign: 'left', readerHyphens: false
};

// The old tile values, in px / em, so saved choices look the same after the upgrade.
const LEGACY: Partial<Record<NumericKey, Record<string, number>>> = {
  fontSize: { sm: 19, base: 23, lg: 27, xl: 31 },
  readerLetterSpacing: { tight: -0.01, normal: 0.005, wide: 0.045 },
  readerWidth: { narrow: 640, balanced: 780, wide: 940, full: 1400 }
};

/** Rounds to the slider's step and clamps to its range. */
export function snap(value: number, { min, max, step }: Range) {
  const decimals = (String(step).split('.')[1] ?? '').length;
  const snapped = Math.round((value - min) / step) * step + min;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals));
}

/**
 * Validates the typography keys present in `input` (a stored settings object or a section's partial prefs).
 * Legacy tokens are converted, numbers are snapped and clamped, and anything unusable falls back to the default.
 * Keys that are absent stay absent, so partial section preferences keep inheriting.
 */
export function normalizeTypography(input: Partial<Record<TypographyKey, unknown>>): Partial<Typography> {
  const out: Partial<Record<TypographyKey, unknown>> = {};
  const has = (key: TypographyKey) => input[key] !== undefined;
  if (has('font')) out.font = typeof input.font === 'string' && input.font in FONTS ? input.font as FontFamily : DEFAULT_TYPOGRAPHY.font;
  for (const key of Object.keys(TYPE_RANGES) as NumericKey[]) {
    if (!has(key)) continue;
    const raw = input[key];
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : typeof raw === 'string' ? LEGACY[key]?.[raw] : undefined;
    out[key] = value === undefined ? DEFAULT_TYPOGRAPHY[key] : snap(value, TYPE_RANGES[key]);
  }
  if (has('readerParagraphSpacing')) out.readerParagraphSpacing = input.readerParagraphSpacing === 0 || input.readerParagraphSpacing === 2 ? input.readerParagraphSpacing : 1;
  if (has('readerAlign')) out.readerAlign = input.readerAlign === 'justify' ? 'justify' : 'left';
  if (has('readerHyphens')) out.readerHyphens = input.readerHyphens === true;
  return out as Partial<Typography>;
}

export interface TypePreset { id: string; label: string; description: string; values: Typography }

export const TYPE_PRESETS: TypePreset[] = [
  { id: 'comfortable', label: 'Comfortable', description: 'The KeyHaven default', values: DEFAULT_TYPOGRAPHY },
  { id: 'classic', label: 'Classic book', description: 'Justified, like a printed page', values: { font: 'garamond', fontSize: 25, readerFontWeight: 450, readerLineHeight: 1.7, readerLetterSpacing: 0.005, readerWordSpacing: 0, readerParagraphSpacing: 1, readerWidth: 720, readerAlign: 'justify', readerHyphens: true } },
  { id: 'airy', label: 'Airy', description: 'Open lines, generous spacing', values: { font: 'source-serif', fontSize: 22, readerFontWeight: 400, readerLineHeight: 2.1, readerLetterSpacing: 0.015, readerWordSpacing: 0.06, readerParagraphSpacing: 1, readerWidth: 680, readerAlign: 'left', readerHyphens: false } },
  { id: 'large', label: 'Large print', description: 'Bigger, sturdier letters', values: { font: 'atkinson', fontSize: 32, readerFontWeight: 500, readerLineHeight: 1.7, readerLetterSpacing: 0.015, readerWordSpacing: 0.06, readerParagraphSpacing: 1, readerWidth: 960, readerAlign: 'left', readerHyphens: false } },
  { id: 'compact', label: 'Compact', description: 'More words on every page', values: { font: 'sans', fontSize: 19, readerFontWeight: 400, readerLineHeight: 1.55, readerLetterSpacing: 0, readerWordSpacing: 0, readerParagraphSpacing: 0, readerWidth: 900, readerAlign: 'left', readerHyphens: false } },
  { id: 'easy', label: 'Easy reading', description: 'Distinct letters, wide spacing', values: { font: 'atkinson', fontSize: 24, readerFontWeight: 400, readerLineHeight: 2, readerLetterSpacing: 0.05, readerWordSpacing: 0.16, readerParagraphSpacing: 1, readerWidth: 700, readerAlign: 'left', readerHyphens: false } }
];

export function matchesTypography(settings: Typography, values: Typography) {
  return TYPOGRAPHY_KEYS.every(key => settings[key] === values[key]);
}

/** Changes whenever anything that moves line breaks changes, so layouts can re-measure. */
export function typographyKey(settings: Typography) {
  return TYPOGRAPHY_KEYS.map(key => settings[key]).join('|');
}

const WEIGHT_NAMES: Record<number, string> = { 300: 'Light', 350: 'Book', 400: 'Regular', 450: 'Regular', 500: 'Medium', 550: 'Medium', 600: 'Semibold', 650: 'Semibold', 700: 'Bold' };
export const weightName = (weight: number) => WEIGHT_NAMES[weight] ?? '';
