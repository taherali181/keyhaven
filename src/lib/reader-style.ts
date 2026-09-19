import type { CSSProperties } from 'react';
import type { CustomReaderTone, ReaderBackground, ReaderToneId, ThemeId, UserSettings } from '@/types';
import { TYPE_RANGES } from '@/lib/typography';

/** Passage font size for a px value; `--type-scale` shrinks it on phones (see globals.css). */
export const passageFontSize = (px: number) => `calc(${px}px * var(--type-scale, 1))`;

export interface ToneRecipe { name: string; background: string; text: string; accent: string }

/** Every theme starts with three authored colors; the rest of its UI palette is derived. */
export const RECIPE_TONES: Record<ReaderToneId, ToneRecipe> = {
  night: { name: 'Night', background: '#1d2522', text: '#f4f1e8', accent: '#a8b59c' },
  paper: { name: 'Soft paper', background: '#f4f1e8', text: '#1d2522', accent: '#536b54' },
  sepia: { name: 'Sepia', background: '#e9dfca', text: '#332e25', accent: '#6f5d3e' },
  bright: { name: 'Bright white', background: '#ffffff', text: '#121512', accent: '#3d5c43' },
  pitch: { name: 'Pitch black', background: '#000000', text: '#e7e7e1', accent: '#a8b59c' },
  mist: { name: 'Mist', background: '#e6ebee', text: '#1e2a31', accent: '#48687a' },
  sage: { name: 'Sage', background: '#dfe6d9', text: '#222d22', accent: '#4c684c' },
  slate: { name: 'Slate', background: '#1b222a', text: '#e4e9ee', accent: '#8fb0c6' },
  ocean: { name: 'Deep ocean', background: '#0e1d25', text: '#d9e9ef', accent: '#76b3c5' },
  rose: { name: 'Rose dusk', background: '#291e23', text: '#f1e4e9', accent: '#d69cb0' },
  espresso: { name: 'Espresso', background: '#2a211b', text: '#eee2d1', accent: '#caa46e' },
  lavender: { name: 'Lavender haze', background: '#e8e2ef', text: '#2b2433', accent: '#755a8d' }
};

export const MAIN_TONES: ReaderToneId[] = ['night', 'paper', 'sepia'];
export const EXTRA_TONES: ReaderToneId[] = ['pitch', 'rose', 'ocean', 'sage', 'espresso', 'slate', 'mist', 'bright', 'lavender'];
export const CUSTOM_TONE_PREFIX = 'custom:';

export function toneName(id: ReaderToneId) {
  return RECIPE_TONES[id].name;
}

function channels(hex: string) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value.padEnd(6, '0');
  return [0, 2, 4].map(i => Number.parseInt(full.slice(i, i + 2), 16) || 0);
}

function luminance(hex: string) {
  const [r, g, b] = channels(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function isLightColor(hex: string) {
  return luminance(hex) > 0.35;
}

const mix = (a: string, weight: number, b: string) => `color-mix(in srgb, ${a} ${weight}%, ${b})`;

/**
 * Derives every token the themes define from three colors, mirroring how the Reading room and
 * Daylight palettes relate to their own page, text and accent colors.
 */
export function toneVariables({ background, text, accent }: Pick<ToneRecipe, 'background' | 'text' | 'accent'>): CSSProperties {
  const light = isLightColor(background);
  return {
    '--bg-primary': background,
    '--bg-secondary': light ? mix(background, 94, text) : mix(background, 80, '#000'),
    '--bg-card': light ? mix(background, 70, '#fff') : mix(background, 94, text),
    '--text-primary': text,
    '--text-secondary': mix(text, 70, background),
    '--text-muted': mix(text, light ? 62 : 56, background),
    '--color-accent': accent,
    '--color-accent-secondary': mix(accent, 62, background),
    '--color-caret': light ? accent : mix(accent, 55, text),
    '--color-correct': mix(text, light ? 52 : 72, background),
    '--color-incorrect': light ? '#a44f45' : '#d98578',
    '--color-extra': light ? '#7d332f' : '#9e5048',
    '--color-border': mix(text, 12, background),
    '--color-highlight': mix(text, 7, background),
    '--glass-fill': `color-mix(in srgb, ${light ? mix(background, 70, '#fff') : background} 55%, transparent)`,
    '--glass-fill-strong': `color-mix(in srgb, ${light ? mix(background, 60, '#fff') : mix(background, 80, '#000')} 80%, transparent)`,
    '--glass-fill-panel': `color-mix(in srgb, ${light ? mix(background, 58, '#fff') : mix(background, 78, '#000')} 64%, transparent)`,
    '--glass-border': `color-mix(in srgb, ${text} ${light ? 10 : 9}%, transparent)`,
    '--glass-highlight': light ? 'rgb(255 255 255 / .7)' : 'rgb(255 255 255 / .06)',
    '--glow-accent': `color-mix(in srgb, ${accent} ${light ? 22 : 30}%, transparent)`,
    '--elev-1': light ? '0 1px 2px rgb(39 48 40 / .06), 0 6px 18px -8px rgb(39 48 40 / .12)' : '0 1px 2px rgb(0 0 0 / .2), 0 6px 18px -8px rgb(0 0 0 / .35)',
    '--elev-2': light ? '0 2px 6px rgb(39 48 40 / .05), 0 18px 40px -14px rgb(39 48 40 / .18)' : '0 2px 6px rgb(0 0 0 / .18), 0 18px 40px -14px rgb(0 0 0 / .5)',
    '--elev-3': light ? '0 6px 14px rgb(39 48 40 / .06), 0 36px 80px -20px rgb(39 48 40 / .26)' : '0 6px 14px rgb(0 0 0 / .2), 0 36px 80px -20px rgb(0 0 0 / .65)',
    '--ambient-opacity': light ? 0.28 : 0.34,
    colorScheme: light ? 'light' : 'dark'
  } as CSSProperties;
}

export interface ResolvedTone {
  /** Stable value for data-theme; custom themes use "custom" and inline variables. */
  attr: string;
  vars: CSSProperties;
  /** Whether the page is light or dark; undefined when it follows the theme. */
  scheme?: 'light' | 'dark';
}

export function resolveTone(theme: ThemeId, customTones: CustomReaderTone[] = []): ResolvedTone {
  if (theme?.startsWith(CUSTOM_TONE_PREFIX)) {
    const custom = customTones.find(tone => `${CUSTOM_TONE_PREFIX}${tone.id}` === theme);
    return custom
      ? { attr: 'custom', vars: toneVariables(custom), scheme: isLightColor(custom.background) ? 'light' : 'dark' }
      : resolveTone('night', customTones);
  }
  const recipe = RECIPE_TONES[theme as ReaderToneId];
  if (theme === 'night' || theme === 'paper') {
    return { attr: theme, vars: {}, scheme: theme === 'paper' ? 'light' : 'dark' };
  }
  return recipe
    ? { attr: theme, vars: toneVariables(recipe), scheme: isLightColor(recipe.background) ? 'light' : 'dark' }
    : { attr: 'night', vars: toneVariables(RECIPE_TONES.night), scheme: 'dark' };
}

export const THEME_VARIABLE_NAMES = Object.keys(toneVariables(RECIPE_TONES.night)).filter(name => name.startsWith('--'));

export function isLightTheme(theme: ThemeId, customTones: CustomReaderTone[] = []) {
  return resolveTone(theme, customTones).scheme === 'light';
}

/** 'none' (quiet atmosphere) and 'plain' draw no photo; only the rest map to an image. */
export function hasSceneryImage(background: ReaderBackground) {
  return background !== 'none' && background !== 'plain';
}

export function readerStyle(settings: UserSettings): CSSProperties {
  const scenery = hasSceneryImage(settings.readerBackground);
  return {
    '--reader-image': settings.readerBackground === 'custom'
      ? (settings.customScenery?.startsWith('data:image/jpeg;base64,') ? `url("${settings.customScenery}")` : 'none')
      : scenery ? `url(/backgrounds/${settings.readerBackground}.webp)` : 'none',
    '--reader-overlay': `${scenery ? settings.readerOverlay : 100}%`,
    '--reader-blur': `${settings.readerBlur}px`,
    '--reader-width': settings.readerWidth >= TYPE_RANGES.readerWidth.max ? '100%' : `${settings.readerWidth}px`,
    '--reader-size': passageFontSize(settings.fontSize),
    '--reader-weight': settings.readerFontWeight,
    '--reader-tracking': `${settings.readerLetterSpacing}em`,
    '--reader-word-spacing': `${settings.readerWordSpacing}em`,
    '--reader-paragraph-lines': settings.readerParagraphSpacing,
    '--reader-align': settings.readerAlign,
    '--reader-hyphens': settings.readerHyphens ? 'auto' : 'manual'
  } as CSSProperties;
}

/** Spread onto reader surfaces for typography and scenery; theme colors inherit from the document root. */
export function readerSurfaceProps(settings: UserSettings) {
  return { style: readerStyle(settings), 'data-scenery': hasSceneryImage(settings.readerBackground) ? 'image' : 'none' };
}
