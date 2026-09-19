'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BookOpen, Keyboard, PenLine, Plus, Trash2 } from 'lucide-react';
import type { ManuscriptRecord, UserSettings } from '@/types';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { db } from '@/lib/db';
import { FONTS } from '@/lib/themes';
import { manuscriptKey, manuscriptSections, manuscriptTitle, manuscriptWords, newManuscript } from '@/lib/manuscript';
import { DEFAULT_READING_WPM, formatReadTime, loadReadingSpeed } from '@/lib/reading';
import { openWork } from '@/lib/reader-events';

/** The piece open in Write, kept between visits. */
export const MANUSCRIPT_CURRENT_KEY = 'keyhaven_manuscript_current_v1';
const remembered = () => { try { return localStorage.getItem(MANUSCRIPT_CURRENT_KEY); } catch { return null; } };
const remember = (id: string) => { try { localStorage.setItem(MANUSCRIPT_CURRENT_KEY, id); } catch { /* memory only */ } };

const SAVE_DELAY = 600;
const isEmpty = (record: Pick<ManuscriptRecord, 'title' | 'body'>) => !record.title.trim() && !record.body.trim();
const edited = (time: number) => {
  const minutes = Math.round((Date.now() - time) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * Write: your own pieces, saved as you go. "# Heading" lines start sections. A finished piece opens in the reader,
 * to read or to type back.
 */
export function ManuscriptView({ settings }: { settings: UserSettings }) {
  const [pieces, setPieces] = useState<ManuscriptRecord[] | null>(null);
  const [draft, setDraft] = useState<ManuscriptRecord | null>(null);
  const [saved, setSaved] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [wpm, setWpm] = useState(DEFAULT_READING_WPM);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const pending = useRef<ManuscriptRecord | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    const list = await db.manuscripts.orderBy('updatedAt').reverse().toArray();
    setPieces(list);
    return list;
  }, []);

  /** Writes the latest edit now instead of waiting for the pause. */
  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const record = pending.current;
    if (!record) return;
    pending.current = null;
    await db.manuscripts.put(record);
    // A newer edit may have arrived while this one was being written; that one is still to come.
    if (!pending.current) setSaved(true);
    await refresh();
  }, [refresh]);

  // Hiding or closing the tab writes what's there straight away.
  useEffect(() => {
    const save = () => { void flush(); };
    const hidden = () => { if (document.visibilityState === 'hidden') save(); };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('pagehide', save); document.removeEventListener('visibilitychange', hidden); };
  }, [flush]);

  useEffect(() => {
    queueMicrotask(() => {
      setWpm(loadReadingSpeed());
      void refresh().then(list => {
        const chosen = list.find(item => item.id === remembered()) ?? list[0];
        if (chosen) setDraft(chosen);
      }).catch(() => setPieces([]));
    });
    // Leaving Write keeps the last words typed.
    return () => { void flush(); };
  }, [refresh, flush]);

  const draftId = draft?.id;
  const draftBody = draft?.body;
  useEffect(() => { if (draftId) remember(draftId); }, [draftId]);

  // The page grows with the text, so the whole piece scrolls as one document.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.style.height = 'auto';
    body.style.height = `${body.scrollHeight}px`;
  }, [draftBody, draftId, settings.font]);

  const edit = (patch: Partial<Pick<ManuscriptRecord, 'title' | 'body'>>) => {
    if (!draft) return;
    const next = { ...draft, ...patch, updatedAt: Date.now() };
    setDraft(next);
    setSaved(false);
    pending.current = next;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flush(); }, SAVE_DELAY);
  };

  /**
   * Saves the piece being left (and removes it again if it was never written in). The writes are issued at once, in
   * order, so the next piece can appear straight away without an edit landing in the wrong one.
   */
  const leave = () => {
    const previous = draft;
    const saving = flush();
    const removing = previous && isEmpty(previous) ? db.manuscripts.delete(previous.id) : undefined;
    return Promise.all([saving, removing]);
  };

  const create = () => {
    const leaving = leave();
    const record = newManuscript();
    const adding = db.manuscripts.put(record);
    setPieces(list => [record, ...(list ?? [])]);
    setDraft(record);
    setSaved(true);
    setConfirming(false);
    void Promise.all([leaving, adding]).then(refresh);
    requestAnimationFrame(() => titleRef.current?.focus());
  };

  const choose = (id: string) => {
    const record = pieces?.find(item => item.id === id);
    if (!record || id === draft?.id) return;
    void leave().then(refresh);
    setDraft(record);
    setSaved(true);
    setConfirming(false);
  };

  const remove = async () => {
    if (!draft) return;
    const key = manuscriptKey(draft.id);
    window.clearTimeout(timer.current);
    pending.current = null;
    await db.transaction('rw', [db.manuscripts, db.bookProgress, db.highlights, db.shelf], async () => {
      await db.manuscripts.delete(draft.id);
      await db.bookProgress.delete(key);
      await db.shelf.delete(key);
      await db.highlights.where('workKey').equals(key).delete();
    });
    const list = await refresh();
    setDraft(list[0] ?? null);
    setSaved(true);
    setConfirming(false);
  };

  const open = async (mode: 'read' | 'type') => {
    if (!draft) return;
    await flush();
    openWork(manuscriptKey(draft.id), mode);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void flush();
    }
  };

  if (pieces === null) return <section className="ms-shell"><span className="skeleton ms-skeleton" aria-label="Loading your writing" /></section>;

  if (!draft) return <section className="ms-shell">
    <div className="pdf-empty">
      <PenLine aria-hidden="true" />
      <h1>Write</h1>
      <p>Write something of your own, then read it back as a book or type it out for practice. Everything saves as you go.</p>
      <button type="button" className="rs-btn is-primary ms-new" onClick={create}><Plus aria-hidden="true" />Start a piece</button>
    </div>
  </section>;

  const words = manuscriptWords(draft.body);
  const sections = manuscriptSections(draft);
  const hasText = sections.length > 0;
  const face = FONTS[settings.font]?.class ?? 'font-serif';

  return <section className="ms-shell" onKeyDown={onKeyDown}>
    <aside className="ms-rail glass" aria-label="Your pieces">
      <div className="ms-rail-head">
        <p className="eyebrow">Your writing</p>
        <button type="button" className="story-bar-button is-icon" onClick={create} aria-label="New piece" title="New piece"><Plus aria-hidden="true" /></button>
      </div>
      <ul className="ms-list">
        {pieces.map(item => <li key={item.id}>
          <button type="button" className="ms-item" aria-current={item.id === draft.id ? 'true' : undefined} onClick={() => choose(item.id)}>
            <strong>{manuscriptTitle(item.id === draft.id ? draft : item)}</strong>
            <small>{manuscriptWords((item.id === draft.id ? draft : item).body).toLocaleString()} words · {edited(item.id === draft.id ? draft.updatedAt : item.updatedAt)}</small>
          </button>
        </li>)}
      </ul>
    </aside>

    <div className="ms-main">
      <header className="ms-bar glass">
        <div className="ms-picker">
          <GlassSelect variant="toolbar" ariaLabel="Piece" value={draft.id} options={pieces.map(item => ({ value: item.id, label: manuscriptTitle(item.id === draft.id ? draft : item) }))} onChange={choose} />
          <button type="button" className="story-bar-button is-icon" onClick={create} aria-label="New piece" title="New piece"><Plus aria-hidden="true" /></button>
        </div>
        <p className="ms-stats" aria-live="polite">
          <span><strong>{words.toLocaleString()}</strong> {words === 1 ? 'word' : 'words'}</span>
          <span>{formatReadTime(words, wpm)} read</span>
          {sections.length > 1 && <span>{sections.length} sections</span>}
          <span className="ms-saved" data-saved={saved}>{saved ? 'Saved' : 'Saving…'}</span>
        </p>
        <span className="pdf-bar-spacer" />
        {confirming
          ? <div className="ms-confirm ms-delete" role="group" aria-label="Delete this piece?">
            <span>Delete this piece?</span>
            <button type="button" className="rs-btn is-small" onClick={() => setConfirming(false)}>Keep</button>
            <button type="button" className="rs-btn is-small is-danger-solid" onClick={() => void remove()}>Delete</button>
          </div>
          : <button type="button" className="story-bar-button is-icon ms-delete" onClick={() => setConfirming(true)} aria-label="Delete piece" title="Delete piece"><Trash2 aria-hidden="true" /></button>}
        <button type="button" className="rs-btn ms-action" disabled={!hasText} onClick={() => void open('type')}><Keyboard aria-hidden="true" />Type it</button>
        <button type="button" className="rs-btn is-primary ms-action" disabled={!hasText} onClick={() => void open('read')}><BookOpen aria-hidden="true" />Read it</button>
      </header>

      <div className="ms-scroll">
        <article className={`ms-sheet ${face}`}>
          <input ref={titleRef} className="ms-title" value={draft.title} placeholder="Untitled" aria-label="Title" maxLength={200} onChange={event => edit({ title: event.target.value })} onBlur={() => void flush()} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); bodyRef.current?.focus(); } }} />
          <textarea ref={bodyRef} className="ms-body" value={draft.body} placeholder={'Begin writing…\n\nStart a line with # to begin a new section.'} aria-label="Text" spellCheck onChange={event => edit({ body: event.target.value })} onBlur={() => void flush()} />
        </article>
        <p className="ms-hint">Blank lines separate paragraphs. A line starting with <kbd>#</kbd> begins a new section. <kbd>Ctrl S</kbd> saves right away.</p>
      </div>
    </div>
  </section>;
}
