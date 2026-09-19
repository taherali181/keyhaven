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

/** The binding a key press stands for: KeyboardEvent.key (letters lower-cased, "Space" for the space bar), with "Shift+" when Shift is held. */
export function bindingFor(event: { key: string; shiftKey: boolean }): string {
  const name = event.key === ' ' ? 'Space' : event.key.length === 1 ? event.key.toLowerCase() : event.key;
  return event.shiftKey && name !== 'Shift' ? `Shift+${name}` : name;
}

/** How a key binding reads in the interface. */
export function bindingLabel(binding: string): string {
  const shift = binding.startsWith('Shift+') && binding !== 'Shift+';
  const name = shift ? binding.slice(6) : binding;
  const label = ({ ArrowRight: '→', ArrowLeft: '←', ArrowUp: '↑', ArrowDown: '↓', PageDown: 'Page Down', PageUp: 'Page Up', Space: 'Space', Escape: 'Esc' } as Record<string, string>)[name]
    ?? (name.length === 1 ? name.toUpperCase() : name);
  return shift ? `Shift ${label}` : label;
}

/**
 * The page action a key press maps to. An exact match wins; with Shift held and no Shift binding, the unshifted key
 * still counts (so Shift+Arrow turns pages, while Shift+Space can mean "previous page").
 */
export function resolvePageAction(event: { key: string; shiftKey: boolean }, keys: ReaderInputSettings['keys']): PageAction | null {
  const exact = bindingFor(event);
  const plain = bindingFor({ key: event.key, shiftKey: false });
  const find = (binding: string) => PAGE_ACTIONS.find(action => keys[action].includes(binding)) ?? null;
  return find(exact) ?? (event.shiftKey ? find(plain) : null);
}

/** Actions already using a binding, other than `except`: for warning about clashes while remapping. */
export function bindingConflicts(binding: string, keys: ReaderInputSettings['keys'], except: PageAction): PageAction[] {
  return PAGE_ACTIONS.filter(action => action !== except && keys[action].includes(binding));
}

/** Keys that can't be mapped: modifiers on their own, and keys the app or browser already relies on. */
export const RESERVED_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'Escape', 'Enter', 'CapsLock', 'Dead', 'Unidentified']);

export const WHEEL_STEP = 80;
export const WHEEL_REST_MS = 300;

/**
 * Turns wheel movement into page steps: movement adds up until it passes WHEEL_STEP, then one step is taken and the
 * wheel rests. A trackpad keeps sending events after a flick; any that arrive while resting extend the rest, so one
 * flick turns one page, while separate clicks of a mouse wheel each turn a page.
 */
export function createWheelPager(now: () => number = () => performance.now()) {
  let total = 0;
  let restUntil = 0;
  return (deltaY: number): -1 | 1 | null => {
    const time = now();
    if (time < restUntil) { restUntil = Math.max(restUntil, time + 100); total = 0; return null; }
    total += deltaY;
    if (Math.abs(total) < WHEEL_STEP) return null;
    const step = total > 0 ? 1 : -1;
    total = 0;
    restUntil = time + WHEEL_REST_MS;
    return step;
  };
}
