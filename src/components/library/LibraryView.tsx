'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, FileUp, Trash2, X } from 'lucide-react';
import { BOOKS } from '@/data/books';
import { BookProgressRecord, ImportedDocumentRecord, TypingStats, UserSettings } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LiveStatsBar } from '@/components/typing/LiveStatsBar';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { createClientId, db } from '@/lib/db';
import { importDocument, ImportProgress } from '@/lib/document-import';
import { readerStyle } from '@/lib/reader-style';

interface ReaderBook { id: string; title: string; author: string; imported: boolean; chapters: Array<{ id: string; title: string; text: string }> }

const builtInBooks: ReaderBook[] = BOOKS.map(book => ({ id: book.id, title: book.title, author: book.author, imported: false, chapters: book.chapters.map(chapter => ({ id: chapter.id, title: chapter.title, text: chapter.text })) }));

export const LibraryView = ({ settings, onKeyPress }: { settings: UserSettings; onKeyPress: (key: string) => void }) => {
  const [imports, setImports] = useState<ImportedDocumentRecord[]>([]);
  const [progress, setProgress] = useState<Record<string, BookProgressRecord>>({});
  const [selected, setSelected] = useState<ReaderBook | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [sessionOffset, setSessionOffset] = useState(0);
  const [result, setResult] = useState<TypingStats | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [importState, setImportState] = useState<ImportProgress | null>(null);
  const [importError, setImportError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const reload = useCallback(async () => {
    const [documents, saved] = await Promise.all([db.importedDocuments.orderBy('updatedAt').reverse().toArray(), db.bookProgress.toArray()]);
    setImports(documents); setProgress(Object.fromEntries(saved.map(item => [item.bookId, item])));
  }, []);
  useEffect(() => { queueMicrotask(() => void reload()); }, [reload]);

  const importedBooks: ReaderBook[] = imports.map(document => ({ id: document.id, title: document.title, author: document.author, imported: true, chapters: document.sections.map(section => ({ id: section.id, title: section.title, text: section.text })) }));
  const active = selected?.chapters[chapterIndex] ?? null;
  const text = active?.text ?? '';

  const persist = useCallback((offset: number) => {
    if (!selected || !active) return;
    const before = selected.chapters.slice(0, chapterIndex).reduce((sum, chapter) => sum + chapter.text.length, 0);
    const total = selected.chapters.reduce((sum, chapter) => sum + chapter.text.length, 0);
    const record: BookProgressRecord = { bookId: selected.id, chapterId: active.id, chapterIndex, charOffset: Math.min(offset, text.length), percent: Math.round(((before + Math.min(offset, text.length)) / Math.max(1, total)) * 100), totalWordsTyped: Math.round((before + offset) / 5), lastRead: Date.now() };
    void db.bookProgress.put(record).then(() => { setProgress(previous => ({ ...previous, [selected.id]: record })); window.dispatchEvent(new Event('keyhaven:sync')); });
  }, [active, chapterIndex, selected, text.length]);

  const complete = (stats: TypingStats) => {
    if (!selected || !active) return;
    persist(text.length); setResult(stats); setResultOpen(true);
    void db.testResults.add({ clientId: createClientId(), mode: 'library', subMode: selected.title, title: `${selected.title} · ${active.title}`, wpm: stats.wpm, rawWpm: stats.rawWpm, accuracy: stats.accuracy, consistency: stats.consistency, duration: stats.timeElapsed, timestamp: Date.now(), errors: stats.incorrectChars, errorKeys: stats.errorHeatmap, totalChars: stats.totalChars, correctChars: stats.correctChars, incorrectChars: stats.incorrectChars });
  };
  const engine = useTypingEngine({ targetText: text, initialOffset: sessionOffset, sessionKey: selected && active ? `${selected.id}-${active.id}-${sessionOffset}` : 'library', strictMode: settings.strictMode, onComplete: complete, onKeyPress });

  useEffect(() => { if (selected && active && engine.typed.length > sessionOffset && !engine.isFinished) { const timer = window.setTimeout(() => persist(engine.typed.length), 500); return () => window.clearTimeout(timer); } }, [active, engine.isFinished, engine.typed.length, persist, selected, sessionOffset]);

  const openBook = (book: ReaderBook) => {
    const saved = progress[book.id]; const nextChapter = saved && saved.chapterIndex < book.chapters.length ? saved.chapterIndex : 0;
    setSelected(book); setChapterIndex(nextChapter); setSessionOffset(saved?.chapterIndex === nextChapter ? saved.charOffset : 0); setResultOpen(false); engine.reset();
  };
  const moveChapter = (nextChapter: number) => { if (!selected || nextChapter < 0 || nextChapter >= selected.chapters.length) return; persist(engine.typed.length); setChapterIndex(nextChapter); const saved = progress[selected.id]; setSessionOffset(saved?.chapterIndex === nextChapter ? saved.charOffset : 0); setResultOpen(false); engine.reset(); };

  const startImport = async (file?: File) => {
    if (!file) return; setImportError(''); const controller = new AbortController(); abortRef.current = controller;
    try { const document = await importDocument(file, setImportState, controller.signal); await db.importedDocuments.put(document); window.dispatchEvent(new Event('keyhaven:sync')); setImportState(null); await reload(); }
    catch (error) { setImportState(null); if ((error as Error).name !== 'AbortError') setImportError((error as Error).message); }
  };

  if (!selected) return <section className="reader-workspace" style={readerStyle(settings)}><div className="library-shell">
    <header className="library-heading"><div><p className="eyebrow">Read</p><h1>Your library</h1><p>Classics and private imports, ready where you left them.</p></div><label className="import-button"><FileUp />Import EPUB or PDF<input type="file" accept=".epub,.pdf,application/epub+zip,application/pdf" onChange={event => { void startImport(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label></header>
    {importError && <div className="import-error"><span>{importError}</span><button onClick={() => setImportError('')}><X /></button></div>}
    {importState && <div className="import-progress"><div><span>{importState.message}</span><strong>{Math.round((importState.current / Math.max(1, importState.total)) * 100)}%</strong></div><progress value={importState.current} max={importState.total} /><button onClick={() => abortRef.current?.abort()}>Cancel</button></div>}
    <div className="book-grid">{[...importedBooks, ...builtInBooks].map(book => <article className="book-row" key={book.id}><button className="book-open" onClick={() => openBook(book)}><BookOpen /><span><strong>{book.title}</strong><small>{book.author} · {book.chapters.length} {book.chapters.length === 1 ? 'section' : 'sections'}</small></span><em>{progress[book.id]?.percent ?? 0}%</em></button>{book.imported && <button className="book-delete" aria-label={`Delete ${book.title}`} onClick={async () => { await db.importedDocuments.delete(book.id); await db.bookProgress.delete(book.id); await reload(); }}><Trash2 /></button>}</article>)}</div>
  </div></section>;

  return <section className="reader-workspace" style={readerStyle(settings)}><div className="reader-shell">
    <header className="reader-meta"><div><button className="reader-back" onClick={() => { persist(engine.typed.length); setSelected(null); }}><ArrowLeft />Library</button><p className="eyebrow">{active?.title} · {chapterIndex + 1} of {selected.chapters.length}</p><h1>{selected.title}</h1><p>{selected.author}</p></div><select className="reader-select" aria-label="Chapter" value={chapterIndex} onChange={event => moveChapter(Number(event.target.value))}>{selected.chapters.map((chapter, index) => <option key={chapter.id} value={index}>{chapter.title}</option>)}</select></header>
    <TypingArea targetText={text} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font={settings.font} fontSize={settings.fontSize} wrapMode="literary" feedbackMode="reader" viewportLines={9} viewportMode="pages" lineHeight={settings.readerLineHeight} onKeyDown={engine.handleKeyDown} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={engine.handleCompositionEnd} onReset={() => { setSessionOffset(0); engine.reset(undefined, 0); }} />
    <nav className="reader-pagination"><button disabled={chapterIndex === 0} onClick={() => moveChapter(chapterIndex - 1)}>Previous</button><span>{progress[selected.id]?.percent ?? 0}% read</span><button disabled={chapterIndex === selected.chapters.length - 1} onClick={() => moveChapter(chapterIndex + 1)}>Next</button></nav>
  </div><LiveStatsBar wpm={engine.wpm} accuracy={engine.accuracy} timeElapsed={engine.timeElapsed} onReset={() => engine.reset()} showLiveWpm={settings.showLiveWpm} showLiveAccuracy={settings.showLiveAccuracy} /><TestResultsModal stats={result} isOpen={resultOpen} title={`${selected.title} · ${active?.title}`} onRetry={() => { setResultOpen(false); engine.reset(); }} onNext={() => moveChapter(chapterIndex + 1)} /></section>;
};
