import { FontFamily } from '@/types';

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
