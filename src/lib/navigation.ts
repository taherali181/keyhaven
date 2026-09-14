import { TypingMode } from '@/types';

export const MODES: TypingMode[] = ['stories', 'speed-test', 'quotes', 'learn', 'arcade', 'leaderboard', 'profile'];

export const ROUTE_ALIASES: Record<string, TypingMode> = { read: 'stories', academy: 'learn', speed: 'speed-test' };

export function modeFromPath(pathname: string): TypingMode | null {
  const path = pathname.replace(/^\//, '');
  // The library is a window over Read; /read/quotes is the old address of Quotes.
  if (path.startsWith('read/')) return ({ stories: 'stories', quotes: 'quotes', library: 'stories' } as Record<string, TypingMode>)[path.split('/')[1]] ?? null;
  if (ROUTE_ALIASES[path]) return ROUTE_ALIASES[path];
  return MODES.includes(path as TypingMode) ? path as TypingMode : null;
}

export function pathForMode(mode: TypingMode) {
  if (mode === 'stories') return '/read';
  if (mode === 'library') return '/read';
  if (mode === 'learn') return '/academy';
  if (mode === 'speed-test' || mode === 'leaderboard') return '/speed';
  return `/${mode}`;
}
