'use client';

import { useCallback, useSyncExternalStore } from 'react';

// v2: the sidebar now auto-hides by default; v1 stored 'open' | 'hidden' for the old always-visible sidebar.
const STORAGE_KEY = 'keyhaven_sidebar_v2';
const CHANGE_EVENT = 'keyhaven:sidebar';

// In-memory copy so pinning still works when storage is unavailable (private windows).
let pinned: boolean | null = null;

function read() {
  if (pinned === null) {
    try { pinned = localStorage.getItem(STORAGE_KEY) === 'pinned'; } catch { pinned = false; }
  }
  return pinned;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/**
 * Whether the desktop sidebar is pinned open. Unpinned (the default) it auto-hides and peeks in
 * from the left edge. The layout's pre-paint script applies the stored value before hydration.
 */
export function useSidebarPinned() {
  const value = useSyncExternalStore(subscribe, read, () => false);
  const setPinned = useCallback((next: boolean) => {
    pinned = next;
    try { localStorage.setItem(STORAGE_KEY, next ? 'pinned' : 'auto'); } catch { /* memory only */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [value, setPinned] as const;
}
