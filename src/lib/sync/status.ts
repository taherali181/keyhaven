'use client';

import { useSyncExternalStore } from 'react';
import type { SessionUser } from '@/lib/session';

export type BackupState = 'off' | 'signed-out' | 'syncing' | 'up-to-date' | 'offline' | 'error';

export interface BackupStatus {
  state: BackupState;
  lastSyncedAt: number | null;
  user?: SessionUser | null;
  error?: string;
  /** Imported books too large to back up on the last pass. */
  skippedDocuments?: number;
}

export const BACKUP_NOW_EVENT = 'keyhaven:backup-now';

const INITIAL: BackupStatus = { state: 'off', lastSyncedAt: null };
let current: BackupStatus = INITIAL;
const listeners = new Set<() => void>();

export function getBackupStatus() { return current; }

export function setBackupStatus(next: BackupStatus) {
  current = next;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Live Backup & sync status for any component (the runner lives in useBackupSync). */
export function useBackupStatus() {
  return useSyncExternalStore(subscribe, getBackupStatus, () => INITIAL);
}

/** Ask for a backup right away (e.g. the "Back up now" button). */
export function requestBackupNow() {
  window.dispatchEvent(new Event(BACKUP_NOW_EVENT));
}
