import type { CSSProperties } from 'react';
import type { UserSettings } from '@/types';

const widths = { narrow: '640px', balanced: '780px', wide: '940px' } as const;

export function readerStyle(settings: UserSettings): CSSProperties {
  const image = settings.readerBackground === 'none' ? 'none' : `url(/backgrounds/${settings.readerBackground}.webp)`;
  const paper = settings.readerPaper === 'paper' ? { background: '#f5f3eb', text: '#283029', muted: '#7b8379', border: '#d8dbd1' }
    : settings.readerPaper === 'sepia' ? { background: '#e9dfca', text: '#332e25', muted: '#817566', border: '#cfc2aa' }
    : settings.readerPaper === 'night' ? { background: '#101411', text: '#e8e9df', muted: '#747d72', border: '#2d352f' }
    : null;
  return {
    '--reader-image': image,
    '--reader-overlay': `${settings.readerBackground === 'none' ? 100 : settings.readerOverlay}%`,
    '--reader-blur': `${settings.readerBlur}px`,
    '--reader-width': widths[settings.readerWidth],
    ...(paper ? { '--bg-primary': paper.background, '--text-primary': paper.text, '--text-muted': paper.muted, '--color-border': paper.border } : {})
  } as CSSProperties;
}
