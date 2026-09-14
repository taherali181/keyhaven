'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, RotateCcw, Shuffle } from 'lucide-react';
import { ReaderView, type ReaderPosition } from '@/components/reader/ReaderView';
import { bookKey, loadStoryIndex, loadWork, rememberedWork, rememberWork, storyKey } from '@/lib/catalog';
import { openLibrary, OPEN_WORK_EVENT } from '@/lib/reader-events';
import { readerSurfaceProps } from '@/lib/reader-style';
import { db } from '@/lib/db';
import type { UserSettings, Work } from '@/types';

type UpdateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
type ReaderState =
  | { status: 'loading' }
  | { status: 'ready'; work: Work; initial: ReaderPosition }
  | { status: 'error'; key: string; message: string };

/** A random story the reader hasn't finished (any story once they've read them all). */
async function randomStoryKey(exclude?: string) {
  const [stories, finished] = await Promise.all([
    loadStoryIndex(),
    db.bookProgress.where('kind').equals('story').filter(record => Boolean(record.finishedAt)).primaryKeys().catch(() => [] as string[])
  ]);
  const done = new Set(finished.map(String));
  const unread = stories.filter(story => !done.has(storyKey(story.id)) && storyKey(story.id) !== exclude);
  const pool = unread.length ? unread : stories.filter(story => storyKey(story.id) !== exclude);
  const story = pool[Math.floor(Math.random() * pool.length)] ?? stories[0];
  return storyKey(story.id);
}

/** Which work to open on arrival: a link (?story= / ?book=), then the unfinished current work, then a random unread story. */
async function initialWorkKey() {
  const params = new URLSearchParams(window.location.search);
  const story = params.get('story');
  const book = params.get('book');
  if (story) return storyKey(story);
  if (book && /^\d+$/.test(book)) return bookKey(Number(book));
  const current = rememberedWork();
  if (current) {
    const record = await db.bookProgress.get(current).catch(() => undefined);
    if (!record?.finishedAt) return current;
  }
  return randomStoryKey(current ?? undefined);
}

/** Read: picks and loads the work, then hands it to the reader. The choice happens after mount so SSR and hydration match. */
export function ReaderHome({ settings, onKeyPress, onUpdateSetting }: { settings: UserSettings; onKeyPress: (key: string) => void; onUpdateSetting: UpdateSetting }) {
  const [state, setState] = useState<ReaderState>({ status: 'loading' });
  const requestRef = useRef(0);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; });

  const open = useCallback(async (key: string) => {
    const request = ++requestRef.current;
    setState(current => (current.status === 'ready' && current.work.key === key ? current : { status: 'loading' }));
    try {
      const [work, record] = await Promise.all([loadWork(key), db.bookProgress.get(key).catch(() => undefined)]);
      if (request !== requestRef.current) return;
      // Finished works start again from the beginning.
      const resume = record && !record.finishedAt;
      const initial: ReaderPosition = resume
        ? { section: record.chapterIndex, chunk: record.chunkIndex ?? 0, pageFraction: settingsRef.current.storyMode === 'read' && record.pageFraction !== undefined ? record.pageFraction : null }
        : { section: 0, chunk: 0, pageFraction: null };
      if (record?.finishedAt) await db.bookProgress.update(key, { finishedAt: undefined, readSections: [] }).catch(() => {});
      rememberWork(key);
      setState({ status: 'ready', work, initial });
    } catch (error) {
      if (request !== requestRef.current) return;
      setState({ status: 'error', key, message: (error as Error).message || 'Could not open this book' });
    }
  }, []);

  const openRandomStory = useCallback((exclude?: string) => { void randomStoryKey(exclude).then(open).catch(() => setState({ status: 'error', key: '', message: 'Could not load the story catalog' })); }, [open]);

  useEffect(() => {
    let cancelled = false;
    void initialWorkKey().then(key => { if (!cancelled) void open(key); }).catch(() => { if (!cancelled) setState({ status: 'error', key: '', message: 'Could not load the story catalog' }); });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    const onOpenWork = (event: Event) => {
      const { key, mode } = (event as CustomEvent<{ key: string; mode?: UserSettings['storyMode'] }>).detail;
      if (mode && mode !== settingsRef.current.storyMode) onUpdateSetting('storyMode', mode);
      void open(key);
    };
    window.addEventListener(OPEN_WORK_EVENT, onOpenWork);
    return () => window.removeEventListener(OPEN_WORK_EVENT, onOpenWork);
  }, [onUpdateSetting, open]);

  if (state.status === 'ready') {
    return <ReaderView
      key={state.work.key}
      work={state.work}
      initial={state.initial}
      settings={settings}
      onKeyPress={onKeyPress}
      onUpdateSetting={onUpdateSetting}
      onOpenLibrary={() => openLibrary()}
      onNextStory={() => openRandomStory(state.work.key)}
    />;
  }

  return <section className="reader-workspace" {...readerSurfaceProps(settings)}>
    <div className="reader-shell stories-shell">
      {state.status === 'loading'
        ? <div className="reader-loading" role="status" aria-label="Opening">
          <div className="reader-loading-bar skeleton" />
          <div className="reader-loading-lines">{Array.from({ length: 7 }, (_, index) => <span key={index} className="skeleton" style={{ width: `${[92, 100, 96, 88, 100, 94, 60][index]}%` }} />)}</div>
        </div>
        : <div className="reader-error glass glass-card" role="alert">
          <BookOpen aria-hidden="true" />
          <h1>Couldn&apos;t open this</h1>
          <p>{state.message}</p>
          <div>
            {state.key && <button type="button" className="quiet-action" onClick={() => void open(state.key)}><RotateCcw aria-hidden="true" />Try again</button>}
            <button type="button" className="quiet-action" onClick={() => openRandomStory()}><Shuffle aria-hidden="true" />Read a random story</button>
            <button type="button" className="quiet-action" onClick={() => openLibrary()}><BookOpen aria-hidden="true" />Open the library</button>
          </div>
        </div>}
    </div>
  </section>;
}
