'use client';

import { useEffect, useRef } from 'react';
import { createClientId, db } from '@/lib/db';
import { IDLE_MS, ReadingSessionTracker, type TrackedSession } from '@/lib/reading-session';
import type { Work } from '@/types';

/**
 * Records time spent in the reader as reading sessions (see src/lib/reading-session.ts). Only refs change while
 * reading or typing, so the reader never re-renders because of it.
 */
export function useReadingSession(work: Work, mode: 'read' | 'type', sectionIndex: number, positionWords: number, page: number, typedLength: number) {
  const latest = useRef({ positionWords, page });
  const touchRef = useRef<() => void>(() => {});
  useEffect(() => { latest.current = { positionWords, page }; });

  useEffect(() => {
    const tracker = new ReadingSessionTracker();
    let idleTimer = 0;
    const save = (session: TrackedSession | null) => {
      if (!session) return;
      void db.readingSessions.add({ clientId: createClientId(), workKey: work.key, kind: work.kind, title: work.title, author: work.author, mode, ...session }).catch(() => {});
    };
    const flush = (idle = false) => {
      window.clearTimeout(idleTimer);
      save(tracker.flush(Date.now(), { idle }));
    };
    touchRef.current = () => {
      if (document.hidden) return;
      tracker.touch(Date.now(), latest.current.positionWords, latest.current.page);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => flush(true), IDLE_MS);
    };
    const onVisibility = () => { if (document.hidden) flush(); };
    const onPageHide = () => flush();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      touchRef.current = () => {};
      flush();
    };
  }, [work, sectionIndex, mode]);

  // Every page turn and keystroke counts as reading activity.
  useEffect(() => { touchRef.current(); }, [page, typedLength]);
}
