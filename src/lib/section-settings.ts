// Typography and the bottom bar are per section: Read keeps the top-level values, and every other section
// (Quotes, Speed, Academy, Arcade…) stores its own copy in `sectionPrefs`. Theme, tone, scenery and sound stay shared.
import type { SectionPrefs, TypingMode, UserSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/lib/db';
import { sanitizeReaderStats } from '@/lib/reader-stats';

export const SECTION_KEYS = ['font', 'fontSize', 'readerFontWeight', 'readerLetterSpacing', 'readerLineHeight', 'readerWidth', 'readerStats', 'readerBarStyle'] as const;

export const SECTION_LABELS: Partial<Record<TypingMode, string>> = { stories: 'Read', quotes: 'Quotes', 'speed-test': 'Speed', learn: 'Academy', arcade: 'Arcade', leaderboard: 'Speed', profile: 'Progress' };

const usesBase = (mode: TypingMode) => mode === 'stories';

export function isSectionKey(key: keyof UserSettings): key is keyof SectionPrefs {
  return (SECTION_KEYS as readonly string[]).includes(key);
}

function defaults(): SectionPrefs {
  return Object.fromEntries(SECTION_KEYS.map(key => [key, DEFAULT_SETTINGS[key]])) as SectionPrefs;
}

/** The settings a section renders with: its own typography and bottom bar over the shared preferences. */
export function settingsForSection(settings: UserSettings, mode: TypingMode): UserSettings {
  if (usesBase(mode)) return settings;
  return { ...settings, ...defaults(), ...(settings.sectionPrefs?.[mode] ?? {}) };
}

/** Where a change belongs: the section's own copy for typography and bar keys, the shared settings otherwise. */
export function sectionUpdate<K extends keyof UserSettings>(settings: UserSettings, mode: TypingMode, key: K, value: UserSettings[K]): Partial<UserSettings> {
  if (usesBase(mode) || !isSectionKey(key)) return { [key]: value } as Partial<UserSettings>;
  const own = settings.sectionPrefs?.[mode] ?? {};
  return { sectionPrefs: { ...settings.sectionPrefs, [mode]: { ...own, [key]: value } } };
}

/** Drops malformed stored section preferences. */
export function sanitizeSectionPrefs(value: unknown): UserSettings['sectionPrefs'] {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value as Record<string, Partial<SectionPrefs>>).filter(([, prefs]) => prefs && typeof prefs === 'object').map(([mode, prefs]) => [
    mode,
    { ...prefs, ...(prefs.readerStats ? { readerStats: sanitizeReaderStats(prefs.readerStats) } : {}) }
  ]));
}
