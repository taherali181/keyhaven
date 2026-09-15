'use client';

import { useEffect, useRef } from 'react';
import type { UserSettings } from '@/types';
import { syncEnabled } from '@/lib/sync-config';
import { clearSessionCache, getSessionUser } from '@/lib/session';
import { httpTransport, runSync, SyncError } from '@/lib/sync/engine';
import { SYNC_REQUEST_EVENT } from '@/lib/sync/tracking';
import { BACKUP_NOW_EVENT, getBackupStatus, setBackupStatus } from '@/lib/sync/status';

const LAST_SYNCED_KEY = 'keyhaven_backup_last_v1';
const CHANGE_DEBOUNCE_MS = 2000;
const INTERVAL_MS = 5 * 60_000;
const FOCUS_STALE_MS = 60_000;

function readLastSynced() {
  try { return Number(localStorage.getItem(LAST_SYNCED_KEY)) || null; } catch { return null; }
}

function writeLastSynced(at: number) {
  try { localStorage.setItem(LAST_SYNCED_KEY, String(at)); } catch { /* storage blocked */ }
}

/**
 * Runs Backup & sync for the signed-in account: on start, shortly after local changes, when the tab regains
 * focus or the network returns, and every few minutes. Status is published through src/lib/sync/status.ts.
 */
export function useBackupSync(settings: UserSettings, applyRemoteSettings: (settings: UserSettings) => void) {
  const settingsRef = useRef(settings);
  const applyRef = useRef(applyRemoteSettings);
  const requestRef = useRef<() => void>(() => {});
  useEffect(() => {
    settingsRef.current = settings;
    applyRef.current = applyRemoteSettings;
  });

  useEffect(() => {
    if (!syncEnabled()) {
      setBackupStatus({ state: 'off', lastSyncedAt: null });
      return;
    }
    let cancelled = false;
    let running = false;
    let again = false;
    let timer = 0;

    const run = async () => {
      if (running) { again = true; return; }
      running = true;
      try {
        const user = await getSessionUser();
        if (cancelled) return;
        if (!user) { setBackupStatus({ state: 'signed-out', lastSyncedAt: readLastSynced(), user: null }); return; }
        if (!navigator.onLine) { setBackupStatus({ ...getBackupStatus(), state: 'offline', user }); return; }
        setBackupStatus({ ...getBackupStatus(), state: 'syncing', user, error: undefined });
        const summary = await runSync(httpTransport, user.id, { get: () => settingsRef.current, apply: remote => applyRef.current(remote) });
        const at = Date.now();
        writeLastSynced(at);
        if (!cancelled) setBackupStatus({ state: 'up-to-date', lastSyncedAt: at, user, skippedDocuments: summary.skippedDocuments });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof SyncError && error.status === 401) {
          clearSessionCache();
          setBackupStatus({ state: 'signed-out', lastSyncedAt: readLastSynced(), user: null });
        } else if (error instanceof SyncError && error.status === 503) {
          setBackupStatus({ state: 'off', lastSyncedAt: null });
        } else {
          setBackupStatus({ ...getBackupStatus(), state: navigator.onLine ? 'error' : 'offline', error: error instanceof Error ? error.message : 'Backup failed' });
        }
      } finally {
        running = false;
        if (again && !cancelled) { again = false; void run(); }
      }
    };

    const schedule = (delay = CHANGE_DEBOUNCE_MS) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void run(), delay);
    };
    const now = () => { clearSessionCache(); schedule(0); };
    const onChange = () => schedule();
    const onFocus = () => { if (Date.now() - (readLastSynced() ?? 0) > FOCUS_STALE_MS) schedule(0); };

    requestRef.current = () => schedule();
    setBackupStatus({ ...getBackupStatus(), state: getBackupStatus().state === 'off' ? 'signed-out' : getBackupStatus().state, lastSyncedAt: readLastSynced() });
    void run();
    window.addEventListener(SYNC_REQUEST_EVENT, onChange);
    window.addEventListener(BACKUP_NOW_EVENT, now);
    window.addEventListener('online', now);
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(() => void run(), INTERVAL_MS);
    return () => {
      cancelled = true;
      requestRef.current = () => {};
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener(SYNC_REQUEST_EVENT, onChange);
      window.removeEventListener(BACKUP_NOW_EVENT, now);
      window.removeEventListener('online', now);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Settings live in localStorage rather than IndexedDB, so their changes are announced here.
  useEffect(() => { requestRef.current(); }, [settings.updatedAt]);
}
