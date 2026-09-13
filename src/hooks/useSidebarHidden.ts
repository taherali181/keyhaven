'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'keyhaven_sidebar_v1';
const CHANGE_EVENT = 'keyhaven:sidebar';

// In-memory copy so toggling still works when storage is unavailable (private windows).
let hidden: boolean | null = null;

function read() {
  if (hidden === null) {
    try { hidden = localStorage.getItem(STORAGE_KEY) === 'hidden'; } catch { hidden = false; }
  }
  return hidden;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/** Whether the desktop sidebar is hidden. The layout's pre-paint script applies the stored value before hydration. */
export function useSidebarHidden() {
  const value = useSyncExternalStore(subscribe, read, () => false);
  const setHidden = useCallback((next: boolean) => {
    hidden = next;
    try { localStorage.setItem(STORAGE_KEY, next ? 'hidden' : 'open'); } catch { /* memory only */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [value, setHidden] as const;
}
