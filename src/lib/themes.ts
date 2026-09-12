import { ThemeId, FontFamily } from '@/types';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  category: 'Serene' | 'Classic' | 'Dark' | 'Vibrant';
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
  'zen-sand': {
    id: 'zen-sand',
    name: 'Zen Sand',
    category: 'Serene',
    description: 'Warm cream, soft earth tones and relaxing tranquility',
    colors: {
      bg: '#f8f5ee',
      bgSecondary: '#ede6d6',
      bgCard: '#f3ece0',
      text: '#443c33',
      textSecondary: '#7d6f5d',
      textMuted: '#b0a08b',
      accent: '#966d48',
      accentSecondary: '#bfa07d',
      caret: '#966d48',
      correct: '#386641',
      incorrect: '#bc4749',
      extra: '#6a040f',
      border: '#dcd1bd',
      highlight: '#faebd7'
    }
  },
  'paper-ink': {
    id: 'paper-ink',
    name: 'Paper & Ink',
    category: 'Classic',
    description: 'Vintage literary parchment with rich antique typography',
    colors: {
      bg: '#fbf7ee',
      bgSecondary: '#f0e6d2',
      bgCard: '#f7eee0',
      text: '#231f20',
      textSecondary: '#5a524c',
      textMuted: '#9e9185',
      accent: '#800020',
      accentSecondary: '#a53860',
      caret: '#800020',
      correct: '#2d6a4f',
      incorrect: '#ba181b',
      extra: '#7f1d1d',
      border: '#ded2bc',
      highlight: '#fceade'
    }
  },
  'midnight-slate': {
    id: 'midnight-slate',
    name: 'Midnight Slate',
    category: 'Dark',
    description: 'Clean, distraction-free minimalist dark aesthetic',
    colors: {
      bg: '#0f172a',
      bgSecondary: '#1e293b',
      bgCard: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      textMuted: '#475569',
      accent: '#38bdf8',
      accentSecondary: '#818cf8',
      caret: '#38bdf8',
      correct: '#4ade80',
      incorrect: '#f87171',
      extra: '#dc2626',
      border: '#334155',
      highlight: '#1e3a5f'
    }
  },
  'nord-deep': {
    id: 'nord-deep',
    name: 'Nord Deep',
    category: 'Dark',
    description: 'Cool arctic blues and calming Nordic palette',
    colors: {
      bg: '#242933',
      bgSecondary: '#2e3440',
      bgCard: '#3b4252',
      text: '#eceff4',
      textSecondary: '#d8dee9',
      textMuted: '#4c566a',
      accent: '#88c0d0',
      accentSecondary: '#81a1c1',
      caret: '#88c0d0',
      correct: '#a3be8c',
      incorrect: '#bf616a',
      extra: '#b48ead',
      border: '#434c5e',
      highlight: '#2e3440'
    }
  },
  'catppuccin': {
    id: 'catppuccin',
    name: 'Catppuccin Mocha',
    category: 'Dark',
    description: 'Cozy pastel comfort with warm soothing hues',
    colors: {
      bg: '#1e1e2e',
      bgSecondary: '#181825',
      bgCard: '#313244',
      text: '#cdd6f4',
      textSecondary: '#a6adc8',
      textMuted: '#585b70',
      accent: '#cba6f7',
      accentSecondary: '#f5c2e7',
      caret: '#f5e0dc',
      correct: '#a6e3a1',
      incorrect: '#f38ba8',
      extra: '#fab387',
      border: '#45475a',
      highlight: '#45475a'
    }
  },
  'gruvbox': {
    id: 'gruvbox',
    name: 'Gruvbox Retro',
    category: 'Classic',
    description: 'Warm, organic retro tones with earthy contrast',
    colors: {
      bg: '#282828',
      bgSecondary: '#1d2021',
      bgCard: '#3c3836',
      text: '#ebdbb2',
      textSecondary: '#bdae93',
      textMuted: '#665c54',
      accent: '#fabd2f',
      accentSecondary: '#fe8019',
      caret: '#fabd2f',
      correct: '#b8bb26',
      incorrect: '#fb4934',
      extra: '#cc241d',
      border: '#504945',
      highlight: '#3c3836'
    }
  },
  'tokyo-night': {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    category: 'Dark',
    description: 'Neon nightlife inspired with deep purples and cyans',
    colors: {
      bg: '#1a1b26',
      bgSecondary: '#16161e',
      bgCard: '#24283b',
      text: '#c0caf5',
      textSecondary: '#9aa5ce',
      textMuted: '#565f89',
      accent: '#7aa2f7',
      accentSecondary: '#bb9af7',
      caret: '#7dcfff',
      correct: '#9ece6a',
      incorrect: '#f7768e',
      extra: '#e0af68',
      border: '#292e42',
      highlight: '#28345a'
    }
  },
  'cyberpunk': {
    id: 'cyberpunk',
    name: 'Cyberpunk 2077',
    category: 'Vibrant',
    description: 'High octane neon yellow and razor black contrast',
    colors: {
      bg: '#121212',
      bgSecondary: '#050505',
      bgCard: '#1f1f1f',
      text: '#fcee0a',
      textSecondary: '#00f0ff',
      textMuted: '#555555',
      accent: '#fcee0a',
      accentSecondary: '#ff003c',
      caret: '#00f0ff',
      correct: '#00ff66',
      incorrect: '#ff003c',
      extra: '#ff7700',
      border: '#333333',
      highlight: '#2a2600'
    }
  },
  'forest-canopy': {
    id: 'forest-canopy',
    name: 'Forest Canopy',
    category: 'Serene',
    description: 'Deep woodland moss and tranquil botanical greenery',
    colors: {
      bg: '#172218',
      bgSecondary: '#0f1710',
      bgCard: '#1f2f21',
      text: '#e2f0d9',
      textSecondary: '#9ebd8a',
      textMuted: '#496342',
      accent: '#52b788',
      accentSecondary: '#74c69d',
      caret: '#52b788',
      correct: '#95d5b2',
      incorrect: '#d90429',
      extra: '#ef233c',
      border: '#2d442f',
      highlight: '#1f3521'
    }
  },
  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast OLED',
    category: 'Dark',
    description: 'Pure pitch black background with crisp pure white type',
    colors: {
      bg: '#000000',
      bgSecondary: '#0a0a0a',
      bgCard: '#141414',
      text: '#ffffff',
      textSecondary: '#cccccc',
      textMuted: '#666666',
      accent: '#3b82f6',
      accentSecondary: '#a855f7',
      caret: '#ffffff',
      correct: '#22c55e',
      incorrect: '#ef4444',
      extra: '#f97316',
      border: '#262626',
      highlight: '#1e1e1e'
    }
  }
};

export const FONTS: Record<FontFamily, { name: string; class: string; description: string }> = {
  jetbrains: {
    name: 'JetBrains Mono',
    class: 'font-mono',
    description: 'Crisp developer monospace with distinct glyphs'
  },
  fira: {
    name: 'Fira Code',
    class: 'font-mono',
    description: 'Clean modern monospace font'
  },
  serif: {
    name: 'Merriweather Serif',
    class: 'font-serif',
    description: 'Warm, pleasant serif optimized for long literary reading'
  },
  playfair: {
    name: 'Playfair Display',
    class: 'font-serif',
    description: 'Classic high-contrast editorial headline serif'
  },
  sans: {
    name: 'Modern Sans',
    class: 'font-sans',
    description: 'Neutral, clean sans-serif'
  }
};
