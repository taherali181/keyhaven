'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, BookMarked, BookOpen, BookOpenText, Check, Compass, ExternalLink, FileUp, Keyboard, Library, PenLine, Search, Sparkles, Trash2, X } from 'lucide-react';
import type { BookProgressRecord, CatalogAuthor, CatalogBook, ImportedDocumentRecord, ManuscriptRecord, ShelfRecord, StoryMeta, WorkKind } from '@/types';
import {
  authorLine, BOOK_CATEGORIES, bookKey, booksInCategory, importKey, lifeYears, loadAuthors, loadBookCatalog, loadFullIndex,
  loadStoryIndex, loadSummary, parseKey, rememberedWork, searchBooks, searchFullIndex, searchStories, STORY_LISTS, storyKey
} from '@/lib/catalog';
import { OPEN_LIBRARY_EVENT, openSection, openWork, type LibraryTab, type OpenLibraryDetail } from '@/lib/reader-events';
import { db } from '@/lib/db';
import { manuscriptKey, manuscriptSections, manuscriptTitle, manuscriptWords } from '@/lib/manuscript';
import { importDocument, type ImportProgress } from '@/lib/document-import';
import { DEFAULT_READING_WPM, formatReadTime, loadReadingSpeed } from '@/lib/reading';
import { fade, spring } from '@/lib/motion';
import { BookCover, EmptyState, ProgressRing, hueFor, shortTitle } from './LibraryBits';

const PAGE_SIZE = 48;
const ROW_SIZE = 14;

const TABS: Array<{ id: LibraryTab; label: string; icon: React.ReactNode }> = [
  { id: 'mine', label: 'My library', icon: <Library aria-hidden="true" /> },
  { id: 'stories', label: 'Stories', icon: <BookOpenText aria-hidden="true" /> },
  { id: 'discover', label: 'Discover', icon: <Compass aria-hidden="true" /> }
];

/** A book the detail pane can show: a catalog entry, or a bare search hit from the full index. */
interface BookRef { id: number; title: string; author: string; book?: CatalogBook }
interface WorkRef { key: string; kind: WorkKind; title: string; author: string }

const timestamp = () => Date.now();
const focusReader = () => requestAnimationFrame(() => document.querySelector<HTMLElement>('.typing-input, .story-library-trigger')?.focus());
/** The Library: your books and stories, the short-story catalog, and thousands of public-domain books. */
export function LibraryWindow({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [tab, setTab] = useState<LibraryTab>('mine');
  const reduce = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const focusSearchRef = useRef(false);

  // Catalogs (fetched once) and your own records (refreshed whenever the window opens).
  const [stories, setStories] = useState<StoryMeta[] | null>(null);
  const [books, setBooks] = useState<CatalogBook[] | null>(null);
  const [authors, setAuthors] = useState<CatalogAuthor[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [progress, setProgress] = useState<BookProgressRecord[]>([]);
  const [shelf, setShelf] = useState<ShelfRecord[]>([]);
  const [imports, setImports] = useState<ImportedDocumentRecord[]>([]);
  const [writing, setWriting] = useState<ManuscriptRecord[]>([]);
  const [bestWpm, setBestWpm] = useState<Map<string, number>>(() => new Map());
  const [wpm, setWpm] = useState(DEFAULT_READING_WPM);
  const [currentKey, setCurrentKey] = useState<string | null>(null);

  // Per-tab browsing state.
  const [storyQuery, setStoryQuery] = useState('');
  const [storyFilter, setStoryFilter] = useState<{ kind: 'list' | 'author'; value: string } | null>(null);
  const [bookQuery, setBookQuery] = useState('');
  const [category, setCategory] = useState('popular');
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [fullResults, setFullResults] = useState<Array<{ id: number; title: string; author: string }> | null>(null);
  const [fullLoading, setFullLoading] = useState(false);
  const [detail, setDetail] = useState<BookRef | null>(null);
  const detailRef = useRef<BookRef | null>(null);
  useEffect(() => { detailRef.current = detail; }, [detail]);
  const [summary, setSummary] = useState<string | null | undefined>(undefined);
  const [importState, setImportState] = useState<ImportProgress | null>(null);
  const [importError, setImportError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  // A book asked for before the catalog has loaded opens once it has.
  const pendingBookRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const [records, saved, documents, results, pieces] = await Promise.all([
      db.bookProgress.toArray(), db.shelf.toArray(), db.importedDocuments.orderBy('updatedAt').reverse().toArray(),
      db.testResults.where('mode').equals('stories').toArray(), db.manuscripts.orderBy('updatedAt').reverse().toArray()
    ]);
    const best = new Map<string, number>();
    for (const result of results) best.set(result.subMode, Math.max(best.get(result.subMode) ?? 0, result.wpm));
    setProgress(records); setShelf(saved); setImports(documents); setBestWpm(best); setWriting(pieces.filter(piece => manuscriptSections(piece).length));
  }, []);

  const show = useCallback((nextTab?: LibraryTab, focusSearch = false) => {
    if (nextTab) setTab(nextTab);
    focusSearchRef.current = focusSearch;
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    setDetail(null);
    focusReader();
  }, []);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenLibraryDetail>).detail ?? {};
      if (detail.category) { setCategory(detail.category); setAuthorName(null); setBookQuery(''); setVisible(PAGE_SIZE); }
      pendingBookRef.current = detail.bookId ?? null;
      show(detail.tab, detail.focusSearch);
    };
    const onKey = (event: KeyboardEvent) => {
      // Escape closes the detail pane, then the window, wherever focus happens to be.
      if (open && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (detailRef.current) setDetail(null); else close();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) { close(); return; }
        setTab(current => (current === 'mine' ? 'discover' : current));
        show(undefined, true);
      }
    };
    window.addEventListener(OPEN_LIBRARY_EVENT, onOpen);
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener(OPEN_LIBRARY_EVENT, onOpen); window.removeEventListener('keydown', onKey, true); };
  }, [close, open, show]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => { setWpm(loadReadingSpeed()); setCurrentKey(rememberedWork()); void refresh().catch(() => {}); });
    Promise.all([loadStoryIndex().then(setStories), loadBookCatalog().then(setBooks), loadAuthors().then(setAuthors)])
      .then(() => setLoadError(''))
      .catch(() => setLoadError('The catalog could not be loaded. Check your connection and try again.'));
  }, [open, refresh]);

  // Focus: the search field when asked (Ctrl K), otherwise the selected tab.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (focusSearchRef.current && searchRef.current) searchRef.current.focus();
      else dialogRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
      focusSearchRef.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [open, tab]);

  useEffect(() => {
    const id = pendingBookRef.current;
    if (!open || !books || id === null) return;
    pendingBookRef.current = null;
    const book = books.find(item => item.id === id);
    if (book) queueMicrotask(() => setDetail({ id: book.id, title: book.title, author: authorLine(book), book }));
  }, [open, books]);

  useEffect(() => {
    if (!detail) return;
    let cancelled = false;
    queueMicrotask(() => setSummary(undefined));
    void loadSummary(detail.id).then(text => { if (!cancelled) setSummary(text); });
    return () => { cancelled = true; };
  }, [detail]);

  const onDialogKey = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    // Keep keyboard focus inside the window.
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(element => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  // ── Your records ──
  const records = useMemo(() => new Map(progress.map(record => [record.bookId, record])), [progress]);
  const shelfByKey = useMemo(() => new Map(shelf.map(entry => [entry.key, entry])), [shelf]);
  const bookById = useMemo(() => new Map((books ?? []).map((book, index) => [book.id, { book, rank: index + 1 }])), [books]);
  const storyById = useMemo(() => new Map((stories ?? []).map(story => [story.id, story])), [stories]);

  const start = (key: string, mode?: 'read' | 'type') => { openWork(key, mode); close(); };

  const describe = (key: string, record?: BookProgressRecord): WorkRef | null => {
    const parsed = parseKey(key);
    if (!parsed) return null;
    if (parsed.kind === 'story') {
      const story = storyById.get(parsed.id);
      return { key, kind: 'story', title: story?.title ?? record?.title ?? 'Story', author: story?.author ?? record?.author ?? '' };
    }
    if (parsed.kind === 'import') {
      const document = imports.find(item => item.id === parsed.id);
      return document ? { key, kind: 'import', title: document.title, author: document.author } : null;
    }
    if (parsed.kind === 'manuscript') {
      const piece = writing.find(item => item.id === parsed.id);
      return piece ? { key, kind: 'manuscript', title: manuscriptTitle(piece), author: 'You' } : null;
    }
    const entry = bookById.get(Number(parsed.id))?.book;
    return { key, kind: 'book', title: entry?.title ?? record?.title ?? `Book ${parsed.id}`, author: entry ? authorLine(entry) : record?.author ?? '' };
  };

  const toggleWant = async (work: WorkRef) => {
    const entry = shelfByKey.get(work.key);
    if (entry?.want) await db.shelf.delete(work.key);
    else await db.shelf.put({ key: work.key, kind: work.kind, title: work.title, author: work.author, want: true, addedAt: timestamp(), updatedAt: timestamp() });
    await refresh();
  };
  const toggleFinished = async (work: WorkRef) => {
    const record = await db.bookProgress.get(work.key);
    if (record?.finishedAt) await db.bookProgress.update(work.key, { finishedAt: undefined, percent: 0, lastRead: timestamp() });
    else await db.bookProgress.put({ bookId: work.key, chapterIndex: 0, charOffset: 0, totalWordsTyped: 0, ...record, kind: work.kind, title: work.title, author: work.author, percent: 100, finishedAt: timestamp(), lastRead: timestamp() });
    await refresh();
    window.dispatchEvent(new Event('keyhaven:sync'));
  };

  const startImport = async (file?: File) => {
    if (!file) return;
    setImportError('');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { document, assets, file: original } = await importDocument(file, setImportState, controller.signal);
      await db.transaction('rw', [db.importedDocuments, db.documentAssets, db.documentFiles], async () => {
        await db.importedDocuments.put(document);
        if (assets.length) await db.documentAssets.bulkPut(assets);
        if (original) await db.documentFiles.put(original);
      });
      window.dispatchEvent(new Event('keyhaven:sync'));
      setImportState(null);
      await refresh();
    } catch (error) {
      setImportState(null);
      if ((error as Error).name !== 'AbortError') setImportError((error as Error).message);
    }
  };
  const deleteImport = async (document: ImportedDocumentRecord) => {
    await db.importedDocuments.delete(document.id);
    await db.documentAssets.where('documentId').equals(document.id).delete();
    await db.documentFiles.delete(document.id);
    await db.bookProgress.delete(importKey(document.id));
    await db.shelf.delete(importKey(document.id));
    await refresh();
  };

  // ── Pieces ──
  const WorkCard = ({ work, record }: { work: WorkRef; record?: BookProgressRecord }) => (
    <button type="button" className="library-book" onClick={() => start(work.key)}>
      <BookCover title={work.title} author={work.author} />
      <span className="library-book-text"><strong>{shortTitle(work.title)}</strong><small>{work.author}</small></span>
      {record && <ProgressRing percent={record.percent} finished={Boolean(record.finishedAt)} />}
    </button>
  );

  const StoryCard = ({ story }: { story: StoryMeta }) => {
    const record = records.get(storyKey(story.id));
    const best = bestWpm.get(story.title);
    return <button type="button" className="library-story" onClick={() => start(storyKey(story.id))}>
      <span className="library-story-top">
        <span className="library-story-length">{formatReadTime(story.words, wpm)}</span>
        {record && (record.finishedAt || record.percent > 0) && <ProgressRing percent={record.percent} finished={Boolean(record.finishedAt)} />}
      </span>
      <strong>{story.title}</strong>
      <small>{story.author} · {story.year}</small>
      <span className="library-story-meta">{story.words.toLocaleString()} words{best ? ` · best ${best} wpm` : ''}</span>
    </button>;
  };

  const CatalogBookCard = ({ book }: { book: CatalogBook }) => {
    const record = records.get(bookKey(book.id));
    return <button type="button" className="library-book" onClick={() => setDetail({ id: book.id, title: book.title, author: authorLine(book), book })}>
      <BookCover title={book.title} author={authorLine(book)} />
      <span className="library-book-text"><strong>{shortTitle(book.title)}</strong><small>{authorLine(book)}</small></span>
      {record && <ProgressRing percent={record.percent} finished={Boolean(record.finishedAt)} />}
    </button>;
  };

  const Shelf = ({ title, count, action, children }: { title: string; count?: number; action?: React.ReactNode; children: React.ReactNode }) => (
    <section className="library-shelf">
      <header><h3>{title}{count !== undefined && <span>{count}</span>}</h3>{action}</header>
      {children}
    </section>
  );

  // ── Tabs ──
  const renderMine = () => {
    const current = currentKey ? records.get(currentKey) : undefined;
    const currentWork = currentKey && current && !current.finishedAt ? describe(currentKey, current) : null;
    const bookRecords = progress.filter(record => record.kind !== 'story' && parseKey(record.bookId));
    const reading = bookRecords.filter(record => !record.finishedAt).sort((a, b) => b.lastRead - a.lastRead);
    const finished = bookRecords.filter(record => record.finishedAt).sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
    const wanted = shelf.filter(entry => entry.want && !records.get(entry.key)?.finishedAt).sort((a, b) => b.addedAt - a.addedAt);
    const storiesRead = progress.filter(record => record.kind === 'story' && record.finishedAt).length;
    const nothing = !currentWork && !reading.length && !finished.length && !wanted.length && !imports.length && !writing.length;

    return <>
      {currentWork && current && <section className="library-continue">
        <BookCover title={currentWork.title} author={currentWork.author} large />
        <div>
          <p className="eyebrow">Continue {currentWork.kind === 'story' ? 'your story' : 'reading'}</p>
          <h3>{currentWork.title}</h3>
          <p>{currentWork.author}</p>
          <div className="library-progress-line"><span style={{ transform: `scaleX(${current.percent / 100})` }} /></div>
          <small>{current.percent}% read</small>
          <div className="library-actions">
            <button type="button" className="library-primary" onClick={() => start(currentWork.key)}><BookOpen aria-hidden="true" />Resume</button>
          </div>
        </div>
      </section>}

      {nothing && <EmptyState icon={<Library aria-hidden="true" />} title="Your library is empty">
        <p>Books you open, save for later or finish will gather here.</p>
        <button type="button" className="library-primary" onClick={() => setTab('discover')}><Compass aria-hidden="true" />Discover books</button>
      </EmptyState>}

      {reading.length > 0 && <Shelf title="Reading now" count={reading.length}>
        <div className="library-grid">{reading.map(record => { const work = describe(record.bookId, record); return work && <WorkCard key={record.bookId} work={work} record={record} />; })}</div>
      </Shelf>}
      {wanted.length > 0 && <Shelf title="Want to read" count={wanted.length}>
        <div className="library-grid">{wanted.map(entry => <WorkCard key={entry.key} work={entry} record={records.get(entry.key)} />)}</div>
      </Shelf>}
      {finished.length > 0 && <Shelf title="Finished" count={finished.length}>
        <div className="library-grid">{finished.map(record => { const work = describe(record.bookId, record); return work && <WorkCard key={record.bookId} work={work} record={record} />; })}</div>
      </Shelf>}

      <Shelf title="Your files" count={imports.length} action={<label className="library-secondary library-import"><FileUp aria-hidden="true" />Import EPUB or PDF<input type="file" accept=".epub,.pdf,application/epub+zip,application/pdf" onChange={event => { void startImport(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>}>
        {importError && <div className="library-notice is-error" role="alert"><span>{importError}</span><button type="button" onClick={() => setImportError('')} aria-label="Dismiss"><X aria-hidden="true" /></button></div>}
        {importState && <div className="library-notice" role="status">
          <span>{importState.message}</span><strong>{Math.round((importState.current / Math.max(1, importState.total)) * 100)}%</strong>
          <button type="button" onClick={() => abortRef.current?.abort()}>Cancel</button>
        </div>}
        {imports.length
          ? <div className="library-list">{imports.map(document => {
            const key = importKey(document.id);
            const record = records.get(key);
            return <div key={document.id} className="library-list-row">
              <button type="button" className="library-list-open" onClick={() => start(key)}>
                <BookCover title={document.title} author={document.author} />
                <span><strong>{document.title}</strong><small>{document.author} · {document.sections.length} {document.sections.length === 1 ? 'section' : 'sections'} · {document.format.toUpperCase()}</small></span>
                {record && <ProgressRing percent={record.percent} finished={Boolean(record.finishedAt)} />}
              </button>
              <button type="button" className="library-icon-button" aria-label={`Delete ${document.title}`} onClick={() => void deleteImport(document)}><Trash2 aria-hidden="true" /></button>
            </div>;
          })}</div>
          : !importState && <p className="library-hint">Import your own EPUB or PDF files. They stay on this device and sync to your account.</p>}
      </Shelf>

      {writing.length > 0 && <Shelf title="Your writing" count={writing.length} action={<button type="button" className="library-secondary" onClick={() => { openSection('manuscript'); close(); }}><PenLine aria-hidden="true" />Open Write</button>}>
        <div className="library-list">{writing.map(piece => {
          const key = manuscriptKey(piece.id);
          const record = records.get(key);
          const title = manuscriptTitle(piece);
          const words = manuscriptWords(piece.body);
          return <div key={piece.id} className="library-list-row">
            <button type="button" className="library-list-open" onClick={() => start(key)}>
              <BookCover title={title} author="You" />
              <span><strong>{title}</strong><small>{words.toLocaleString()} {words === 1 ? 'word' : 'words'} · edited {new Date(piece.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></span>
              {record && <ProgressRing percent={record.percent} finished={Boolean(record.finishedAt)} />}
            </button>
          </div>;
        })}</div>
      </Shelf>}

      {storiesRead > 0 && <p className="library-hint">You&apos;ve finished {storiesRead} {storiesRead === 1 ? 'story' : 'stories'}. <button type="button" className="library-link" onClick={() => setTab('stories')}>See your stories</button></p>}
    </>;
  };

  const renderStories = () => {
    if (!stories) return <div className="library-grid">{Array.from({ length: 8 }, (_, index) => <span key={index} className="library-story skeleton" />)}</div>;
    const inProgress = stories.filter(story => { const record = records.get(storyKey(story.id)); return record && !record.finishedAt && record.percent > 0; });
    const read = stories.filter(story => records.get(storyKey(story.id))?.finishedAt);
    const authorCounts = [...stories.reduce((counts, story) => counts.set(story.author, (counts.get(story.author) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);

    let results: StoryMeta[] | null = null;
    let heading = '';
    if (storyQuery.trim()) { results = searchStories(stories, storyQuery); heading = `${results.length} ${results.length === 1 ? 'story' : 'stories'} for “${storyQuery.trim()}”`; }
    else if (storyFilter?.kind === 'author') { results = stories.filter(story => story.author === storyFilter.value); heading = storyFilter.value; }
    else if (storyFilter?.kind === 'list') { const list = STORY_LISTS.find(item => item.id === storyFilter.value); results = list ? stories.filter(list.test) : []; heading = list?.label ?? ''; }

    if (results) return <Shelf title={heading} action={(storyFilter || storyQuery) && <button type="button" className="library-link" onClick={() => { setStoryFilter(null); setStoryQuery(''); }}><ArrowLeft aria-hidden="true" />All stories</button>}>
      {results.length ? <div className="library-grid is-stories">{results.map(story => <StoryCard key={story.id} story={story} />)}</div> : <EmptyState icon={<Search aria-hidden="true" />} title="No stories match"><p>Try a title, an author or a theme like “ghost”.</p></EmptyState>}
    </Shelf>;

    return <>
      {(inProgress.length > 0 || read.length > 0) && <Shelf title="Your stories" count={inProgress.length + read.length}>
        <div className="library-row">{[...inProgress, ...read].map(story => <StoryCard key={story.id} story={story} />)}</div>
      </Shelf>}
      {STORY_LISTS.map(list => {
        const items = stories.filter(list.test);
        if (!items.length) return null;
        return <Shelf key={list.id} title={list.label} count={items.length} action={items.length > ROW_SIZE && <button type="button" className="library-link" onClick={() => setStoryFilter({ kind: 'list', value: list.id })}>See all</button>}>
          <div className="library-row">{items.slice(0, ROW_SIZE).map(story => <StoryCard key={story.id} story={story} />)}</div>
        </Shelf>;
      })}
      <Shelf title="By author" count={authorCounts.length}>
        <div className="library-chips">{authorCounts.map(([name, count]) => <button key={name} type="button" className="library-chip" onClick={() => setStoryFilter({ kind: 'author', value: name })}>{name}<span>{count}</span></button>)}</div>
      </Shelf>
    </>;
  };

  const renderDiscover = () => {
    if (!books || !authors) return <div className="library-grid">{Array.from({ length: 12 }, (_, index) => <span key={index} className="library-book skeleton" />)}</div>;
    const query = bookQuery.trim();
    const known = new Set(books.map(book => book.id));
    // On wide screens the categories live in the rail; narrow screens keep them as a row of chips.
    const chips = <div className="library-chips is-scroll library-inline-cats" role="group" aria-label="Categories">
      {BOOK_CATEGORIES.map(item => <button key={item.id} type="button" className="library-chip" aria-pressed={!query && category === item.id && !authorName} onClick={() => { setBookQuery(''); setCategory(item.id); setAuthorName(null); setVisible(PAGE_SIZE); setFullResults(null); }}>{item.label}</button>)}
    </div>;

    if (query) {
      const matches = searchBooks(books, query, 120);
      return <>
        {chips}
        <Shelf title={`${matches.length === 120 ? '120+' : matches.length} popular ${matches.length === 1 ? 'book' : 'books'} for “${query}”`}>
          {matches.length ? <div className="library-grid">{matches.map(book => <CatalogBookCard key={book.id} book={book} />)}</div> : <p className="library-hint">No popular books match. Search the whole catalog below.</p>}
        </Shelf>
        <Shelf title="More from Project Gutenberg">
          {fullResults === null
            ? <button type="button" className="library-secondary" disabled={fullLoading} onClick={() => { setFullLoading(true); void loadFullIndex().then(index => setFullResults(searchFullIndex(index, known, query))).catch(() => setFullResults([])).finally(() => setFullLoading(false)); }}>
              <Search aria-hidden="true" />{fullLoading ? 'Searching 60,000+ titles…' : 'Search all 60,000+ titles'}
            </button>
            : fullResults.length
              ? <div className="library-list">{fullResults.map(item => <button key={item.id} type="button" className="library-list-open" onClick={() => setDetail(item)}>
                <BookCover title={item.title} author={item.author} />
                <span><strong>{item.title}</strong><small>{item.author || 'Anonymous'}</small></span>
              </button>)}</div>
              : <p className="library-hint">Nothing else matches “{query}”.</p>}
        </Shelf>
      </>;
    }

    if (category === 'authors' && !authorName) return <>
      {chips}
      <Shelf title="Famous authors" count={authors.length}>
        <div className="library-authors">{authors.map(author => <button key={author.name} type="button" className="library-author" onClick={() => { setAuthorName(author.name); setVisible(PAGE_SIZE); }}>
          <span className="library-author-initial" style={{ '--cover-hue': hueFor(author.name) } as React.CSSProperties} aria-hidden="true">{author.name.split(' ').at(-1)?.[0]}</span>
          <span><strong>{author.name}</strong><small>{[lifeYears(author), `${author.books.length} ${author.books.length === 1 ? 'book' : 'books'}`].filter(Boolean).join(' · ')}</small></span>
        </button>)}</div>
      </Shelf>
    </>;

    const list = authorName ? books.filter(book => book.authors.some(author => author.name === authorName)) : booksInCategory(books, category);
    const title = authorName ?? BOOK_CATEGORIES.find(item => item.id === category)?.label ?? 'Books';
    return <>
      {chips}
      <Shelf title={title} count={list.length} action={authorName && <button type="button" className="library-link" onClick={() => setAuthorName(null)}><ArrowLeft aria-hidden="true" />All authors</button>}>
        <div className="library-grid">{list.slice(0, visible).map(book => <CatalogBookCard key={book.id} book={book} />)}</div>
        {list.length > visible && <button type="button" className="library-secondary library-more" onClick={() => setVisible(count => count + PAGE_SIZE)}>Show more<span>{(list.length - visible).toLocaleString()} more</span></button>}
      </Shelf>
    </>;
  };

  const renderDetail = (ref: BookRef) => {
    const key = bookKey(ref.id);
    const record = records.get(key);
    const entry = ref.book ?? bookById.get(ref.id)?.book;
    const rank = bookById.get(ref.id)?.rank;
    const work: WorkRef = { key, kind: 'book', title: ref.title, author: ref.author || 'Anonymous' };
    const wanted = Boolean(shelfByKey.get(key)?.want);
    return <motion.aside
      className="library-detail"
      aria-label={`About ${ref.title}`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0, transition: spring.soft }}
      exit={{ opacity: 0, x: reduce ? 0 : 16, transition: { duration: 0.14 } }}
    >
      <button type="button" className="library-link library-detail-back" onClick={() => setDetail(null)}><ArrowLeft aria-hidden="true" />Back</button>
      <div className="library-detail-head">
        <BookCover title={ref.title} author={work.author} large />
        <div>
          <h3>{entry?.title ?? ref.title}</h3>
          {entry?.subtitle && <p className="library-detail-subtitle">{entry.subtitle}</p>}
          <p className="library-detail-author">{entry ? entry.authors.map(author => [author.name, lifeYears(author)].filter(Boolean).join(', ')).join(' · ') || 'Anonymous' : work.author}</p>
          {record && <p className="library-detail-progress"><ProgressRing percent={record.percent} finished={Boolean(record.finishedAt)} />{record.finishedAt ? 'Finished' : `${record.percent}% read`}</p>}
        </div>
      </div>
      <div className="library-actions">
        <button type="button" className="library-primary" onClick={() => start(key, 'read')}><BookOpen aria-hidden="true" />{record && !record.finishedAt ? 'Continue reading' : 'Read'}</button>
        <button type="button" className="library-secondary" onClick={() => start(key, 'type')}><Keyboard aria-hidden="true" />Type</button>
        <button type="button" className="library-secondary" aria-pressed={wanted} onClick={() => void toggleWant(work)}><BookMarked aria-hidden="true" />{wanted ? 'Saved' : 'Want to read'}</button>
        <button type="button" className="library-secondary" aria-pressed={Boolean(record?.finishedAt)} onClick={() => void toggleFinished(work)}><Check aria-hidden="true" />{record?.finishedAt ? 'Finished' : 'Mark finished'}</button>
      </div>
      <div className="library-detail-body">
        {summary === undefined
          ? <div className="library-detail-summary is-loading"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>
          : summary && <p className="library-detail-summary">{summary}</p>}
        {entry && entry.subjects.length > 0 && <div className="library-chips">{entry.subjects.map(subject => <span key={subject} className="library-chip is-static">{subject}</span>)}</div>}
        <dl className="library-facts">
          {rank && <div><dt>Popularity</dt><dd><Sparkles aria-hidden="true" />#{rank.toLocaleString()} on Project Gutenberg</dd></div>}
          {entry && <div><dt>Downloads</dt><dd>{entry.downloads.toLocaleString()} this month</dd></div>}
          <div><dt>Source</dt><dd><a href={`https://www.gutenberg.org/ebooks/${ref.id}`} target="_blank" rel="noopener noreferrer">Project Gutenberg #{ref.id}<ExternalLink aria-hidden="true" /></a></dd></div>
        </dl>
      </div>
    </motion.aside>;
  };

  const searchPlaceholder = tab === 'stories' ? 'Search stories, authors or themes' : 'Search books and authors';
  const query = tab === 'stories' ? storyQuery : bookQuery;
  const setQuery = (value: string) => {
    if (tab === 'stories') { setStoryQuery(value); if (value) setStoryFilter(null); }
    else { setBookQuery(value); setFullResults(null); }
  };

  return <AnimatePresence>
    {open && <motion.div key="library-scrim" className="library-scrim" variants={fade} initial="hidden" animate="show" exit="exit" onClick={close} />}
    {open && <motion.div
      key="library-window"
      ref={dialogRef}
      className="library-window glass glass-panel"
      data-detail={detail ? 'open' : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Library"
      onKeyDown={onDialogKey}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0, transition: spring.soft }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.14 } }}
    >
      <nav className="library-rail">
        <h2><Library aria-hidden="true" />Library</h2>
        <div role="tablist" aria-label="Library sections" aria-orientation="vertical">
          {TABS.map(item => <button key={item.id} type="button" role="tab" id={`library-tab-${item.id}`} aria-selected={tab === item.id} aria-controls="library-panel" className="library-tab" onClick={() => { setTab(item.id); setDetail(null); }}>
            {tab === item.id && <motion.span layoutId="library-tab-pill" className="library-tab-pill" transition={spring.snappy} />}
            {item.icon}<span>{item.label}</span>
          </button>)}
        </div>
        {tab === 'discover' && <div className="library-rail-group">
          <p className="library-rail-label">Browse</p>
          <div className="library-rail-list" role="group" aria-label="Browse categories">
            {BOOK_CATEGORIES.map(item => <button key={item.id} type="button" className="library-rail-item" aria-pressed={!bookQuery.trim() && category === item.id && !authorName} onClick={() => { setBookQuery(''); setCategory(item.id); setAuthorName(null); setVisible(PAGE_SIZE); setFullResults(null); setDetail(null); }}>{item.label}</button>)}
          </div>
        </div>}
        {tab === 'stories' && <div className="library-rail-group">
          <p className="library-rail-label">Collections</p>
          <div className="library-rail-list" role="group" aria-label="Story collections">
            <button type="button" className="library-rail-item" aria-pressed={!storyFilter && !storyQuery} onClick={() => { setStoryFilter(null); setStoryQuery(''); }}>All stories</button>
            {STORY_LISTS.map(list => <button key={list.id} type="button" className="library-rail-item" aria-pressed={storyFilter?.kind === 'list' && storyFilter.value === list.id} onClick={() => { setStoryQuery(''); setStoryFilter({ kind: 'list', value: list.id }); }}>{list.label}</button>)}
          </div>
        </div>}
        <p className="library-rail-note">
          {(books?.length ?? 5000).toLocaleString()} popular books, 60,000+ titles and {(stories?.length ?? 300).toLocaleString()} short stories, all public domain via Project Gutenberg.
        </p>
      </nav>

      <div className="library-main">
        <header className="library-header">
          {tab === 'mine'
            ? <div className="library-title"><p className="eyebrow">Your shelves</p><h2>My library</h2></div>
            : <label className="library-search">
              <Search aria-hidden="true" />
              <input ref={searchRef} type="search" aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={query} onChange={event => setQuery(event.target.value)} />
              {query && <button type="button" className="library-icon-button" aria-label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus(); }}><X aria-hidden="true" /></button>}
            </label>}
          <button type="button" className="library-icon-button library-close" aria-label="Close library" onClick={close}><X aria-hidden="true" /></button>
        </header>
        <div id="library-panel" role="tabpanel" aria-labelledby={`library-tab-${tab}`} className="library-panel" key={tab}>
          {loadError && tab !== 'mine' ? <EmptyState icon={<Compass aria-hidden="true" />} title="Catalog unavailable"><p>{loadError}</p></EmptyState>
            : tab === 'mine' ? renderMine() : tab === 'stories' ? renderStories() : renderDiscover()}
        </div>
      </div>

      <AnimatePresence>{detail && renderDetail(detail)}</AnimatePresence>
    </motion.div>}
  </AnimatePresence>;
}
