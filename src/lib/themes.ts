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

export const FONTS: Record<FontFamily, { name: string; class: string; description: string }> = {
  jetbrains: { name: 'Geist Mono', class: 'font-mono', description: 'Even typewriter rhythm' },
  fira: { name: 'Geist Mono', class: 'font-mono', description: 'Even typewriter rhythm' },
  serif: { name: 'Literata', class: 'font-serif', description: 'Literary, easy on the eyes' },
  playfair: { name: 'Cormorant', class: 'font-wordmark', description: 'Elegant, high contrast' },
  sans: { name: 'Geist', class: 'font-sans', description: 'Clean and modern' }
};

export function normalizeTheme(value: unknown): ThemeId {
  if (value === 'daylight' || value === 'zen-sand' || value === 'paper-ink') return 'daylight';
  return 'reading-room';
}
