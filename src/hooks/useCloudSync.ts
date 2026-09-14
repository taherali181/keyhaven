'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { AcademyStateRecord, ImportedDocumentRecord, UserSettings } from '@/types';

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

export function useCloudSync(settings: UserSettings, syncKey: string, applyRemoteSettings: (settings: UserSettings) => void) {
  const [status, setStatus] = useState<SyncStatus>('local');

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_KEYHAVEN_CLOUD !== 'true') return;
    let cancelled = false;
    const sync = async () => {
      try {
        const sessionResponse = await fetch('/api/auth/session');
        const session = await sessionResponse.json() as { user?: { id?: string } };
        if (!session.user?.id || cancelled) return;
        setStatus('syncing');
        const [progress, results, scores, documents, academy] = await Promise.all([db.bookProgress.toArray(), db.testResults.toArray(), db.arcadeScores.toArray(), db.importedDocuments.toArray(), db.academyState.get('academy')]);
        const response = await fetch('/api/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ settings: { value: settings, updatedAt: settings.updatedAt }, progress, results, scores, documents, academy: academy ? { value: academy, updatedAt: academy.updatedAt } : undefined }) });
        if (!response.ok) throw new Error('Sync failed');
        const merged = await response.json() as {
          settings: { settings: UserSettings; updatedAt: string } | null;
          progress: Array<{ bookId: string; chapterId: string; chapterIndex: number; charOffset: number; updatedAt: string }>;
          results: Array<Record<string, unknown>>;
          scores: Array<Record<string, unknown>>;
          documents: Array<{ id: string; title: string; author: string; format: 'epub' | 'pdf'; sections: ImportedDocumentRecord['sections']; createdAt: string; updatedAt: string }>;
          academy: { state: AcademyStateRecord; updatedAt: string } | null;
          syncedAt: number;
        };
        if (merged.settings) applyRemoteSettings({ ...merged.settings.settings, updatedAt: new Date(merged.settings.updatedAt).getTime() });
        for (const item of merged.progress) {
          const local = await db.bookProgress.get(item.bookId);
          const remoteUpdatedAt = new Date(item.updatedAt).getTime();
          // The server stores only the position; keep what this device knows about the work (title, percent, shelves).
          if (!local || remoteUpdatedAt > local.lastRead) await db.bookProgress.put({ ...local, bookId: item.bookId, chapterId: item.chapterId, chapterIndex: item.chapterIndex, charOffset: item.charOffset, percent: local?.percent ?? 0, totalWordsTyped: local?.totalWordsTyped ?? 0, lastRead: remoteUpdatedAt, syncedAt: merged.syncedAt });
        }
        for (const item of merged.results) {
          const clientId = String(item.id);
          if (await db.testResults.where('clientId').equals(clientId).count()) continue;
          await db.testResults.add({ clientId, mode: item.mode as never, subMode: String(item.subMode), title: item.title ? String(item.title) : undefined, wpm: Number(item.wpm), rawWpm: Number(item.rawWpm), accuracy: Number(item.accuracy), consistency: Number(item.consistency), duration: Number(item.durationMs) / 1000, timestamp: new Date(String(item.occurredAt)).getTime(), errors: Number(item.incorrectChars), errorKeys: item.errorKeys as Record<string, number>, totalChars: Number(item.totalChars), correctChars: Number(item.correctChars), incorrectChars: Number(item.incorrectChars), syncedAt: merged.syncedAt, visibility: item.visibility as 'private' | 'public' });
        }
        for (const item of merged.scores) {
          const clientId = String(item.id);
          if (await db.arcadeScores.where('clientId').equals(clientId).count()) continue;
          await db.arcadeScores.add({ clientId, game: item.game as never, configuration: item.configuration as Record<string, unknown>, score: Number(item.score), wpm: Number(item.wpm), accuracy: Number(item.accuracy), timeMs: Number(item.durationMs), timestamp: new Date(String(item.occurredAt)).getTime(), syncedAt: merged.syncedAt, visibility: item.visibility as 'private' | 'public' });
        }
        for (const item of merged.documents) {
          const local = await db.importedDocuments.get(item.id); const remoteUpdatedAt = new Date(item.updatedAt).getTime();
          if (!local || remoteUpdatedAt > local.updatedAt) await db.importedDocuments.put({ id: item.id, title: item.title, author: item.author, format: item.format, sections: item.sections, createdAt: new Date(item.createdAt).getTime(), updatedAt: remoteUpdatedAt, syncedAt: merged.syncedAt });
        }
        if (merged.academy) { const local = await db.academyState.get('academy'); const remoteUpdatedAt = new Date(merged.academy.updatedAt).getTime(); if (!local || remoteUpdatedAt > local.updatedAt) await db.academyState.put({ ...merged.academy.state, id: 'academy', updatedAt: remoteUpdatedAt, syncedAt: merged.syncedAt }); }
        await Promise.all([db.testResults.toCollection().modify({ syncedAt: merged.syncedAt }), db.arcadeScores.toCollection().modify({ syncedAt: merged.syncedAt }), db.bookProgress.toCollection().modify({ syncedAt: merged.syncedAt }), db.importedDocuments.toCollection().modify({ syncedAt: merged.syncedAt }), db.academyState.toCollection().modify({ syncedAt: merged.syncedAt })]);
        if (!cancelled) setStatus('synced');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    void sync();
    const online = () => void sync();
    let syncTimer = 0;
    const requested = () => { window.clearTimeout(syncTimer); syncTimer = window.setTimeout(() => void sync(), 600); };
    window.addEventListener('online', online);
    window.addEventListener('keyhaven:sync', requested);
    return () => { cancelled = true; window.clearTimeout(syncTimer); window.removeEventListener('online', online); window.removeEventListener('keyhaven:sync', requested); };
  }, [applyRemoteSettings, settings, syncKey]);

  return status;
}
