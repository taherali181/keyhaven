import { describe, expect, it } from 'vitest';
import { modeFromPath, pathForMode } from '@/lib/navigation';

describe('section addresses', () => {
  it('maps every friendly address to its section', () => {
    expect(modeFromPath('/read')).toBe('stories');
    expect(modeFromPath('/academy')).toBe('learn');
    expect(modeFromPath('/speed')).toBe('speed-test');
    expect(modeFromPath('/write')).toBe('manuscript');
    expect(modeFromPath('/pdf')).toBe('pdf');
    expect(modeFromPath('/pdfs')).toBe('pdf');
    expect(modeFromPath('/read/library')).toBe('stories');
    expect(modeFromPath('/nope')).toBeNull();
    expect(modeFromPath('/')).toBe('home');
  });

  it('gives each section one canonical address that leads back to it', () => {
    for (const mode of ['stories', 'quotes', 'learn', 'speed-test', 'arcade', 'profile', 'pdf', 'manuscript'] as const) {
      expect(modeFromPath(pathForMode(mode))).toBe(mode);
    }
    expect(pathForMode('home')).toBe('/');
    expect(pathForMode('leaderboard')).toBe('/speed');
  });
});
