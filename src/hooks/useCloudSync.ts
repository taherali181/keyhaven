'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { UserSettings } from '@/types';
import { BOOKS } from '@/data/books';

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
        const [progress, results, scores] = await Promise.all([db.bookProgress.toArray(), db.testResults.toArray(), db.arcadeScores.toArray()]);
        const response = await fetch('/api/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ settings: { value: settings, updatedAt: settings.updatedAt }, progress, results, scores }) });
        if (!response.ok) throw new Error('Sync failed');
        const merged = await response.json() as {
          settings: { settings: UserSettings; updatedAt: string } | null;
          progress: Array<{ bookId: string; chapterId: string; chapterIndex: number; charOffset: number; updatedAt: string }>;
          results: Array<Record<string, unknown>>;
          scores: Array<Record<string, unknown>>;
          syncedAt: number;
        };
        if (merged.settings) applyRemoteSettings({ ...merged.settings.settings, updatedAt: new Date(merged.settings.updatedAt).getTime() });
        for (const item of merged.progress) {
          const local = await db.bookProgress.get(item.bookId);
          const book = BOOKS.find(candidate => candidate.id === item.bookId);
          const earlier = book?.chapters.slice(0, item.chapterIndex).reduce((sum, chapter) => sum + chapter.text.length, 0) ?? 0;
          const total = book?.chapters.reduce((sum, chapter) => sum + chapter.text.length, 0) ?? 1;
          const remoteUpdatedAt = new Date(item.updatedAt).getTime();
          if (!local || remoteUpdatedAt > local.lastRead) await db.bookProgress.put({ bookId: item.bookId, chapterId: item.chapterId, chapterIndex: item.chapterIndex, charOffset: item.charOffset, percent: Math.min(100, Math.round(((earlier + item.charOffset) / total) * 100)), totalWordsTyped: local?.totalWordsTyped ?? 0, lastRead: remoteUpdatedAt, syncedAt: merged.syncedAt });
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
        await Promise.all([db.testResults.toCollection().modify({ syncedAt: merged.syncedAt }), db.arcadeScores.toCollection().modify({ syncedAt: merged.syncedAt }), db.bookProgress.toCollection().modify({ syncedAt: merged.syncedAt })]);
        if (!cancelled) setStatus('synced');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    void sync();
    const online = () => void sync();
    window.addEventListener('online', online);
    return () => { cancelled = true; window.removeEventListener('online', online); };
  }, [applyRemoteSettings, settings, syncKey]);

  return status;
}
