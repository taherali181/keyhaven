import { FontFamily, ThemeId } from '@/types';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    bg: string;
    bgSecondary: string;
    bgCard: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentSecondary: string;
    caret: string;
    correct: string;
    incorrect: string;
    extra: string;
    border: string;
    highlight: string;
  };
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  'reading-room': {
    id: 'reading-room',
    name: 'The Reading Room',
    description: 'Ink, walnut and aged brass after dusk',
    colors: {
      bg: '#0d0d0b', bgSecondary: '#14130f', bgCard: '#1b1914', text: '#eee5d2',
      textSecondary: '#aaa08d', textMuted: '#706859', accent: '#c49a5a',
      accentSecondary: '#8f673b', caret: '#e1b86f', correct: '#8ea58b',
      incorrect: '#c66f63', extra: '#8f403a', border: '#343027', highlight: '#282218'
    }
  },
  daylight: {
    id: 'daylight',
    name: 'Daylight Study',
    description: 'Bone paper, warm ink and quiet brass',
    colors: {
      bg: '#eee9df', bgSecondary: '#e5ded1', bgCard: '#f8f4eb', text: '#27231d',
      textSecondary: '#685f52', textMuted: '#968a79', accent: '#8b6439',
      accentSecondary: '#b18a56', caret: '#8b6439', correct: '#54705a',
      incorrect: '#a44f45', extra: '#7d332f', border: '#cec3b1', highlight: '#dfd2bd'
    }
  }
};

export type FontGroup = 'Serif' | 'Sans' | 'Accessible' | 'Mono';
export const FONT_GROUPS: FontGroup[] = ['Serif', 'Sans', 'Accessible', 'Mono'];

/** Reading typefaces. The CSS classes point at the next/font variables set in src/app/layout.tsx. */
export const FONTS: Record<FontFamily, { name: string; class: string; description: string; group: FontGroup }> = {
  serif: { name: 'Literata', class: 'font-serif', description: 'Literary, easy on the eyes', group: 'Serif' },
  'source-serif': { name: 'Source Serif', class: 'font-source-serif', description: 'Crisp and bookish', group: 'Serif' },
  lora: { name: 'Lora', class: 'font-lora', description: 'Warm, gently calligraphic', group: 'Serif' },
  merriweather: { name: 'Merriweather', class: 'font-merriweather', description: 'Sturdy for long sessions', group: 'Serif' },
  garamond: { name: 'EB Garamond', class: 'font-garamond', description: 'Classic old-style print', group: 'Serif' },
  playfair: { name: 'Cormorant', class: 'font-wordmark', description: 'Elegant, high contrast', group: 'Serif' },
  sans: { name: 'Geist', class: 'font-sans', description: 'Clean and modern', group: 'Sans' },
  inter: { name: 'Inter', class: 'font-inter', description: 'Neutral and very clear', group: 'Sans' },
  plex: { name: 'IBM Plex Sans', class: 'font-plex', description: 'Friendly and technical', group: 'Sans' },
  atkinson: { name: 'Atkinson Hyperlegible', class: 'font-atkinson', description: 'Distinct letters for low vision', group: 'Accessible' },
  jetbrains: { name: 'Geist Mono', class: 'font-mono', description: 'Even typewriter rhythm', group: 'Mono' },
  'jetbrains-mono': { name: 'JetBrains Mono', class: 'font-jetbrains', description: 'Tall, open monospace', group: 'Mono' },
  fira: { name: 'Geist Mono', class: 'font-mono', description: 'Even typewriter rhythm', group: 'Mono' }
};

/** Typefaces offered in reading settings ('fira' is a legacy alias of Geist Mono). */
export const READING_FONTS = (Object.keys(FONTS) as FontFamily[]).filter(id => id !== 'fira');

export function normalizeTheme(value: unknown): ThemeId {
  if (value === 'daylight' || value === 'zen-sand' || value === 'paper-ink') return 'daylight';
  return 'reading-room';
}
