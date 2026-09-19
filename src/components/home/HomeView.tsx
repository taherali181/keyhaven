'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Compass, FileText, Gamepad2, GraduationCap, Keyboard, Library, PenLine, Quote, Search, Sparkles, Timer } from 'lucide-react';
import type { BookProgressRecord, CatalogBook, ShelfRecord, StoryMeta, TypingMode } from '@/types';
import { authorLine, BOOK_CATEGORIES, bookKey, loadBookCatalog, loadStoryIndex, parseKey, rememberedWork, STORY_LISTS, storyKey } from '@/lib/catalog';
import { db } from '@/lib/db';
import { migrateAcademy, isPassed } from '@/lib/academy/progress';
import { ALL_LESSONS } from '@/data/academy/units';
import { openLibrary, openLibraryAt, openWork } from '@/lib/reader-events';
import { DEFAULT_READING_WPM, formatReadTime, loadReadingSpeed } from '@/lib/reading';
import { BookCover, ProgressRing, shortTitle } from '@/components/library/LibraryBits';

interface Work { key: string; title: string; author: string; record?: BookProgressRecord }
interface Practice { bestSpeed: number | null; lessonsPassed: number; arcadeGames: number; quotesTyped: number; pieces: number; pdfs: number }

const ROW_LIMIT = 16;

/** The day's number, so the story of the day changes at midnight and is the same all day. */
const dayNumber = (now: number) => Math.floor((now - new Date(now).getTimezoneOffset() * 60_000) / 86_400_000);

function greetingFor(now: number) {
  const hour = new Date(now).getHours();
  return hour < 5 ? 'Reading late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** Your records and the catalogs the home page draws on. Loaded after mount (the page is the same on the server). */
function useHomeData() {
  const [progress, setProgress] = useState<BookProgressRecord[] | null>(null);
  const [shelf, setShelf] = useState<ShelfRecord[]>([]);
  const [stories, setStories] = useState<StoryMeta[] | null>(null);
  const [books, setBooks] = useState<CatalogBook[] | null>(null);
  const [practice, setPractice] = useState<Practice | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [wpm, setWpm] = useState(DEFAULT_READING_WPM);

  const load = useCallback(async () => {
    const [records, saved, speed, academy, arcade, quotes, pieces, pdfs] = await Promise.all([
      db.bookProgress.toArray(), db.shelf.toArray(),
      db.testResults.where('mode').equals('speed-test').toArray(),
      db.academyState.get('academy'), db.arcadeScores.count(),
      db.testResults.where('mode').equals('quotes').count(),
      db.manuscripts.count(), db.importedDocuments.where('format').equals('pdf').count()
    ]);
    const state = migrateAcademy(academy);
    setProgress(records);
    setShelf(saved);
    setPractice({
      bestSpeed: speed.length ? Math.max(...speed.map(result => result.wpm)) : null,
      lessonsPassed: ALL_LESSONS.filter(lesson => isPassed(state, lesson.id)).length,
      arcadeGames: arcade,
      quotesTyped: quotes,
      pieces, pdfs
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setNow(Date.now()); setCurrent(rememberedWork()); setWpm(loadReadingSpeed());
      void load().catch(() => setProgress([]));
    });
    void loadStoryIndex().then(setStories).catch(() => setStories([]));
    void loadBookCatalog().then(setBooks).catch(() => setBooks([]));
  }, [load]);

  return { progress, shelf, stories, books, practice, current, now, wpm };
}

function WorkCard({ work, tag, onOpen }: { work: Work; tag?: string; onOpen: (key: string) => void }) {
  return <button type="button" className="library-book home-card" onClick={() => onOpen(work.key)}>
    <BookCover title={work.title} author={work.author} />
    <span className="library-book-text"><strong>{shortTitle(work.title)}</strong><small>{tag ?? work.author}</small></span>
    {work.record && (work.record.percent > 0 || work.record.finishedAt) && <ProgressRing percent={work.record.percent} finished={Boolean(work.record.finishedAt)} />}
  </button>;
}

function Row({ title, note, action, children }: { title: string; note?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="home-section">
    <header className="home-section-head"><div><h2>{title}</h2>{note && <p>{note}</p>}</div>{action}</header>
    {children}
  </section>;
}

/** The front door: what you're reading, your shelves, something new to read, and the practice rooms. */
export function HomeView({ onNavigate }: { onNavigate: (mode: TypingMode) => void }) {
  const { progress, shelf, stories, books, practice, current, now, wpm } = useHomeData();
  const records = useMemo(() => new Map((progress ?? []).map(record => [record.bookId, record])), [progress]);
  const storyById = useMemo(() => new Map((stories ?? []).map(story => [story.id, story])), [stories]);
  const bookById = useMemo(() => new Map((books ?? []).map(book => [book.id, book])), [books]);

  // Titles come from the record itself, falling back to the catalogs.
  const describe = (key: string, record?: BookProgressRecord): Work | null => {
    const parsed = parseKey(key);
    if (!parsed) return null;
    if (parsed.kind === 'story') {
      const story = storyById.get(parsed.id);
      return { key, title: story?.title ?? record?.title ?? 'Story', author: story?.author ?? record?.author ?? '', record };
    }
    const book = parsed.kind === 'book' ? bookById.get(Number(parsed.id)) : undefined;
    return { key, title: record?.title ?? book?.title ?? 'Untitled', author: record?.author ?? (book ? authorLine(book) : ''), record };
  };

  const open = (key: string, mode?: 'read' | 'type') => openWork(key, mode);
  const currentRecord = current ? records.get(current) : undefined;
  const continuing = current && currentRecord && !currentRecord.finishedAt ? describe(current, currentRecord) : null;
  const reading = (progress ?? []).filter(record => !record.finishedAt && record.bookId !== current && record.percent > 0).sort((a, b) => b.lastRead - a.lastRead);
  const wanted = shelf.filter(entry => entry.want && !records.get(entry.key)?.finishedAt).sort((a, b) => b.addedAt - a.addedAt);
  const finished = (progress ?? []).filter(record => record.finishedAt).sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));

  const unread = (stories ?? []).filter(story => !records.get(storyKey(story.id))?.finishedAt);
  const todays = now !== null && unread.length ? unread[dayNumber(now) % unread.length] : null;
  const popular = (stories ?? []).filter(STORY_LISTS[0].test).filter(story => story.id !== todays?.id).slice(0, ROW_LIMIT);
  const classics = (books ?? []).slice(0, ROW_LIMIT);

  const tiles: Array<{ mode: TypingMode; label: string; icon: React.ReactNode; stat: string }> = [
    { mode: 'speed-test', label: 'Speed', icon: <Timer aria-hidden="true" />, stat: practice?.bestSpeed ? `Best ${practice.bestSpeed} wpm` : 'Take a test' },
    { mode: 'learn', label: 'Academy', icon: <GraduationCap aria-hidden="true" />, stat: practice ? `${practice.lessonsPassed} of ${ALL_LESSONS.length} lessons` : '' },
    { mode: 'arcade', label: 'Arcade', icon: <Gamepad2 aria-hidden="true" />, stat: practice?.arcadeGames ? `${practice.arcadeGames} ${practice.arcadeGames === 1 ? 'game' : 'games'} played` : 'Three games' },
    { mode: 'quotes', label: 'Quotes', icon: <Quote aria-hidden="true" />, stat: practice?.quotesTyped ? `${practice.quotesTyped} typed` : 'Type a line' },
    { mode: 'manuscript', label: 'Write', icon: <PenLine aria-hidden="true" />, stat: practice?.pieces ? `${practice.pieces} ${practice.pieces === 1 ? 'piece' : 'pieces'}` : 'Write your own' },
    { mode: 'pdf', label: 'PDFs', icon: <FileText aria-hidden="true" />, stat: practice?.pdfs ? `${practice.pdfs} ${practice.pdfs === 1 ? 'PDF' : 'PDFs'}` : 'Original pages' }
  ];

  const loading = progress === null;

  return <section className="home-shell">
    <header className="home-head">
      <div>
        <p className="eyebrow">{now === null ? ' ' : greetingFor(now)}</p>
        <h1>Your library</h1>
      </div>
      <button type="button" className="home-search" onClick={() => openLibrary('discover', true)}>
        <Search aria-hidden="true" /><span>Search books and stories</span><kbd>Ctrl K</kbd>
      </button>
    </header>

    {loading
      ? <div className="home-hero skeleton" aria-busy="true" aria-label="Loading your library" />
      : continuing
        ? <section className="home-hero" aria-label="Continue reading">
          <BookCover title={continuing.title} author={continuing.author} large />
          <div className="home-hero-body">
            <p className="eyebrow">Continue {parseKey(continuing.key)?.kind === 'story' ? 'your story' : 'reading'}</p>
            <h2>{continuing.title}</h2>
            <p className="home-hero-author">{continuing.author}</p>
            <div className="home-progress" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={currentRecord?.percent ?? 0}><span style={{ transform: `scaleX(${(currentRecord?.percent ?? 0) / 100})` }} /></div>
            <small>{currentRecord?.percent ?? 0}% read</small>
            <div className="home-hero-actions">
              <button type="button" className="rs-btn is-primary" onClick={() => open(continuing.key, 'read')}><BookOpen aria-hidden="true" />Resume reading</button>
              <button type="button" className="rs-btn" onClick={() => open(continuing.key, 'type')}><Keyboard aria-hidden="true" />Type it</button>
            </div>
          </div>
        </section>
        : todays && <section className="home-hero" aria-label="Story of the day">
          <BookCover title={todays.title} author={todays.author} large />
          <div className="home-hero-body">
            <p className="eyebrow"><Sparkles aria-hidden="true" />Story of the day</p>
            <h2>{todays.title}</h2>
            <p className="home-hero-author">{todays.author}{todays.year ? ` · ${todays.year}` : ''}</p>
            <small>{formatReadTime(todays.words, wpm)} · {todays.words.toLocaleString()} words</small>
            <div className="home-hero-actions">
              <button type="button" className="rs-btn is-primary" onClick={() => open(storyKey(todays.id), 'read')}><BookOpen aria-hidden="true" />Start reading</button>
              <button type="button" className="rs-btn" onClick={() => open(storyKey(todays.id), 'type')}><Keyboard aria-hidden="true" />Type it</button>
            </div>
          </div>
        </section>}

    {(reading.length > 0 || wanted.length > 0) && <Row title="On your shelf" note={[reading.length && `${reading.length} in progress`, wanted.length && `${wanted.length} to read`].filter(Boolean).join(' · ')} action={<button type="button" className="home-more" onClick={() => openLibrary('mine')}><Library aria-hidden="true" />Your library</button>}>
      <div className="home-row">
        {reading.slice(0, ROW_LIMIT).map(record => { const work = describe(record.bookId, record); return work && <WorkCard key={record.bookId} work={work} onOpen={key => open(key)} />; })}
        {wanted.slice(0, ROW_LIMIT).map(entry => <WorkCard key={entry.key} work={{ key: entry.key, title: entry.title, author: entry.author, record: records.get(entry.key) }} tag="Want to read" onOpen={key => open(key)} />)}
      </div>
    </Row>}

    {continuing && todays && <Row title="Story of the day" note={`${todays.author} · ${formatReadTime(todays.words, wpm)}`}>
      <button type="button" className="home-feature" onClick={() => open(storyKey(todays.id), 'read')}>
        <Sparkles aria-hidden="true" /><span><strong>{todays.title}</strong><small>{todays.words.toLocaleString()} words{todays.year ? ` · ${todays.year}` : ''}</small></span><ArrowRight aria-hidden="true" />
      </button>
    </Row>}

    {popular.length > 0 && <Row title="Popular short stories" action={<button type="button" className="home-more" onClick={() => openLibrary('stories')}>All stories<ArrowRight aria-hidden="true" /></button>}>
      <div className="home-row is-stories">{popular.map(story => {
        const record = records.get(storyKey(story.id));
        return <button key={story.id} type="button" className="library-story home-story" onClick={() => open(storyKey(story.id))}>
          <span className="library-story-top"><span className="library-story-length">{formatReadTime(story.words, wpm)}</span>{record && (record.finishedAt || record.percent > 0) && <ProgressRing percent={record.percent} finished={Boolean(record.finishedAt)} />}</span>
          <strong>{story.title}</strong>
          <small>{story.author} · {story.year}</small>
        </button>;
      })}</div>
    </Row>}

    {classics.length > 0 && <Row title="Classics to discover" note="Public-domain books, free to read" action={<button type="button" className="home-more" onClick={() => openLibrary('discover')}>Discover<ArrowRight aria-hidden="true" /></button>}>
      <div className="home-row">{classics.map(book => <WorkCard key={book.id} work={{ key: bookKey(book.id), title: book.title, author: authorLine(book), record: records.get(bookKey(book.id)) }} onOpen={() => openLibraryAt({ bookId: book.id })} />)}</div>
    </Row>}

    <Row title="Browse by kind">
      <div className="home-chips">{BOOK_CATEGORIES.filter(category => category.id !== 'popular').map(category => <button key={category.id} type="button" className="home-chip" onClick={() => openLibraryAt({ category: category.id })}>{category.label}</button>)}</div>
    </Row>

    {finished.length > 0 && <Row title="Finished" note={`${finished.length} ${finished.length === 1 ? 'work' : 'works'}`} action={undefined}>
      <div className="home-row">{finished.slice(0, ROW_LIMIT).map(record => { const work = describe(record.bookId, record); return work && <WorkCard key={record.bookId} work={work} onOpen={key => open(key)} />; })}</div>
    </Row>}

    <Row title="Practice">
      <div className="home-tiles">{tiles.map(tile => <button key={tile.mode} type="button" className="home-tile" onClick={() => onNavigate(tile.mode)}>
        {tile.icon}<span><strong>{tile.label}</strong><small>{tile.stat || ' '}</small></span><ArrowRight aria-hidden="true" className="home-tile-go" />
      </button>)}</div>
    </Row>

    {!loading && !continuing && !reading.length && !wanted.length && !finished.length && <p className="home-hint"><Compass aria-hidden="true" />Books you open, save or finish will gather on this page.</p>}
  </section>;
}
