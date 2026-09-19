'use client';

import { useCallback, useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { SYNC_REQUEST_EVENT } from '@/lib/sync/tracking';
import type { AcademyStateRecord, ArcadeScoreRecord, BookProgressRecord, ReadingSessionRecord, ShelfRecord, TestResultRecord } from '@/types';

export interface ProfileData {
  results: TestResultRecord[];
  sessions: ReadingSessionRecord[];
  progress: BookProgressRecord[];
  shelf: ShelfRecord[];
  scores: ArcadeScoreRecord[];
  academy: AcademyStateRecord | null;
  /** Counts for achievements. */
  highlights: number;
  pieces: number;
  savedQuotes: number;
  loaded: boolean;
}

const EMPTY: ProfileData = { results: [], sessions: [], progress: [], shelf: [], scores: [], academy: null, highlights: 0, pieces: 0, savedQuotes: 0, loaded: false };

/** Everything the profile summarises, reloaded after local changes (debounced) or on request. */
export function useProfileData() {
  const [data, setData] = useState<ProfileData>(EMPTY);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(current => current + 1), []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      db.testResults.toArray(), db.readingSessions.toArray(), db.bookProgress.toArray(), db.shelf.toArray(), db.arcadeScores.toArray(), db.academyState.get('academy'),
      db.highlights.count(), db.manuscripts.count(), db.favorites.where('kind').equals('quote').count()
    ]).then(([results, sessions, progress, shelf, scores, academy, highlights, pieces, savedQuotes]) => {
      if (!cancelled) setData({ results, sessions, progress, shelf, scores, academy: academy ?? null, highlights, pieces, savedQuotes, loaded: true });
    }).catch(() => {
      if (!cancelled) setData(current => ({ ...current, loaded: true }));
    });
    return () => { cancelled = true; };
  }, [version]);

  useEffect(() => {
    let timer = 0;
    const onChange = () => { window.clearTimeout(timer); timer = window.setTimeout(reload, 800); };
    window.addEventListener(SYNC_REQUEST_EVENT, onChange);
    return () => { window.clearTimeout(timer); window.removeEventListener(SYNC_REQUEST_EVENT, onChange); };
  }, [reload]);

  return { ...data, reload };
}
