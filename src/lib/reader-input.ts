// How readers turn pages: keys (remappable in Settings → Input), the mouse wheel and click zones on the page edges.
// Bindings are stored as key names from KeyboardEvent.key, with "Space" for the space bar and an optional "Shift+" prefix.
import type { PageAction, ReaderInputSettings } from '@/types';

export const PAGE_ACTIONS: PageAction[] = ['next', 'prev', 'first', 'last'];

export const PAGE_ACTION_LABELS: Record<PageAction, string> = {
  next: 'Next page',
  prev: 'Previous page',
  first: 'First page',
  last: 'Last page'
};

/** The keys KeyHaven has always used. */
export const DEFAULT_READER_INPUT: ReaderInputSettings = {
  wheel: false,
  clickZones: false,
  keys: {
    next: ['ArrowRight', 'ArrowDown', 'PageDown', 'Space'],
    prev: ['ArrowLeft', 'ArrowUp', 'PageUp', 'Shift+Space'],
    first: ['Home'],
    last: ['End']
  }
};

/** Most keys a single action can hold. */
export const MAX_BINDINGS = 6;

const BINDING = /^(Shift\+)?[^\s+]{1,20}$|^(Shift\+)?\+$/;

/** Drops malformed stored input settings, keeping whatever is valid. */
export function sanitizeReaderInput(value: unknown): ReaderInputSettings {
  const stored = value && typeof value === 'object' ? value as Partial<ReaderInputSettings> : {};
  const keys = stored.keys && typeof stored.keys === 'object' ? stored.keys : {} as Partial<ReaderInputSettings['keys']>;
  const valid = (list: unknown, fallback: string[]) => Array.isArray(list)
    ? [...new Set(list.filter((key): key is string => typeof key === 'string' && BINDING.test(key)))].slice(0, MAX_BINDINGS)
    : fallback;
  return {
    wheel: typeof stored.wheel === 'boolean' ? stored.wheel : DEFAULT_READER_INPUT.wheel,
    clickZones: typeof stored.clickZones === 'boolean' ? stored.clickZones : DEFAULT_READER_INPUT.clickZones,
    keys: Object.fromEntries(PAGE_ACTIONS.map(action => [action, valid(keys[action], DEFAULT_READER_INPUT.keys[action])])) as ReaderInputSettings['keys']
  };
}
