'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Library, Maximize2, Minimize2, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import { ContentsMenu, type ContentsEntry } from '@/components/reader/ContentsMenu';
import { StoryModeToggle } from '@/components/reader/StoryModeToggle';
import { StoryReader, type ReaderLayout } from '@/components/reader/StoryReader';
import { ReaderBottomBar } from '@/components/reader/ReaderBottomBar';
import { StoryAtmosphere } from '@/components/reader/StoryAtmosphere';
import { TypingArea } from '@/components/typing/TypingArea';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { useFullscreen } from '@/hooks/useFullscreen';
import { openReaderSettings } from '@/lib/reader-events';
import { loadTypedParts } from '@/lib/reading-progress';
import { resolveReaderStats, type ReaderStatContext } from '@/lib/reader-stats';
import { chunkParagraphs, countWords, DEFAULT_READING_WPM, loadReadingSpeed, sectionName, updateReadingSpeed } from '@/lib/reading';
import { createClientId, db } from '@/lib/db';
import { readerSurfaceProps } from '@/lib/reader-style';
import type { BookProgressRecord, TypingStats, UserSettings, Work } from '@/types';

type UpdateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
/** Where reading mode should land once the reader has measured its pages. */
type PageAnchor = { kind: 'part'; part: number } | { kind: 'fraction'; value: number } | { kind: 'words'; value: number; part?: number };
type PageStep = 1 | -1 | 'start' | 'end';

export interface ReaderPosition {
  section: number;
  chunk: number;
  /** Reading mode page position within the section (0–1); null to start at the chunk. */
  pageFraction: number | null;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const prefixSums = (values: number[]) => values.reduce<number[]>((totals, value, index) => [...totals, (totals[index] ?? 0) + value], [0]);

/**
 * The reader for every work: stories (one section) and books (a section per chapter). Reading mode pages
 * through a whole section; typing mode works through it in chunks of about 180 words.
 */
export function ReaderView({ work, initial, settings, onKeyPress, onUpdateSetting, onOpenLibrary, onNextStory }: {
  work: Work;
  initial: ReaderPosition;
  settings: UserSettings;
  onKeyPress: (key: string) => void;
  onUpdateSetting: UpdateSetting;
  onOpenLibrary: () => void;
  onNextStory: () => void;
}) {
  const isStory = work.kind === 'story';
  const sectionCount = work.sections.length;
  const unit = isStory ? 'part' : work.kind === 'import' ? 'section' : 'chapter';
  const sectionLabel = work.kind === 'import' ? 'Section' : 'Chapter';

  const [sectionIndex, setSectionIndex] = useState(() => Math.min(Math.max(0, initial.section), sectionCount - 1));
  const section = work.sections[sectionIndex] ?? work.sections[0];
  const chunks = useMemo(() => chunkParagraphs(section.paragraphs), [section]);
  const [chunkIndex, setChunkIndex] = useState(() => Math.min(Math.max(0, initial.chunk), Math.max(0, chunkParagraphs((work.sections[initial.section] ?? work.sections[0]).paragraphs).length - 1)));
  const chunk = chunks[chunkIndex] ?? chunks[0];
  const text = chunk?.text ?? '';
  const parts = useMemo(() => chunks.map(item => item.paragraphs), [chunks]);
  const sectionParts = useMemo(() => work.sections.map(item => chunkParagraphs(item.paragraphs).map(chunk => chunk.paragraphs)), [work]);
  const chunkCount = chunks.length;

  const sectionWords = useMemo(() => work.sections.map(item => countWords(item.paragraphs.join(' '))), [work]);
  const wordsBeforeSection = useMemo(() => prefixSums(sectionWords), [sectionWords]);
  const totalWords = sum(sectionWords);
  const chunkWordsBefore = useMemo(() => prefixSums(chunks.map(item => item.words)), [chunks]);
  const chunkCharsBefore = useMemo(() => prefixSums(chunks.map(item => item.text.length + 1)), [chunks]);

  const reading = settings.storyMode === 'read';
  const fullscreen = useFullscreen();
  const [result, setResult] = useState<TypingStats | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  // Saved progress that isn't just the current position.
  const [readSections, setReadSections] = useState<number[]>([]);
  const [finishedAt, setFinishedAt] = useState<number | undefined>(undefined);
  const [typedParts, setTypedParts] = useState<Map<string, Set<number>>>(() => new Map());
  const resultMode = isStory ? 'stories' : 'library';
  const partPrefix = (index: number) => (isStory ? work.title : `${work.title} · ${work.sections[index]?.title}`);
  const refreshTypedParts = () => { void loadTypedParts(resultMode, work.title).then(setTypedParts).catch(() => {}); };
  useEffect(() => {
    void loadTypedParts(isStory ? 'stories' : 'library', work.title).then(setTypedParts).catch(() => {});
    void db.bookProgress.get(work.key).then(record => {
      setReadSections(record?.readSections ?? []);
      setFinishedAt(record?.finishedAt);
    }).catch(() => {});
  }, [isStory, work.key, work.title]);

  // Reading mode state.
  const [page, setPage] = useState(0);
  const [layout, setLayout] = useState<ReaderLayout | null>(null);
  // A part chosen from Contents stays "current" until the page turns, even if another part tops that page.
  const [pickedPart, setPickedPart] = useState<{ page: number; part: number } | null>(null);
  const [readingWpm, setReadingWpm] = useState(DEFAULT_READING_WPM);
  const layoutRef = useRef<ReaderLayout | null>(null);
  const anchorRef = useRef<PageAnchor | null>(initial.pageFraction !== null ? { kind: 'fraction', value: initial.pageFraction } : { kind: 'part', part: initial.chunk });
  const pageShownAtRef = useRef(0);
  useEffect(() => { queueMicrotask(() => setReadingWpm(loadReadingSpeed())); }, []);

  // A slow clock for time-of-day and session stats (only ticks on the client, so SSR stays stable).
  const [clock, setClock] = useState({ now: 0, sessionStartedAt: 0 });
  useEffect(() => {
    const tick = () => { const now = Date.now(); setClock(current => ({ now, sessionStartedAt: current.sessionStartedAt || now })); };
    queueMicrotask(tick);
    const timer = window.setInterval(tick, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  // Auto-hiding title bar: revealed by the top edge, the bar itself, or keyboard focus; never by typing.
  const [barRevealed, setBarRevealed] = useState(false);
  const revealTimerRef = useRef<number | undefined>(undefined);
  const barRowRef = useRef<HTMLDivElement>(null);
  const scheduleReveal = (show: boolean, delay: number) => {
    window.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = window.setTimeout(() => setBarRevealed(show), delay);
  };
  useEffect(() => () => window.clearTimeout(revealTimerRef.current), []);
  // Fit the text to the screen: typing shows as many lines as fit (more when the title bar hides), and
  // whatever is left under the last whole line is shared across the gaps around the text so they stay even.
  const stageRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const extraRef = useRef(0);
  const [typingLines, setTypingLines] = useState(12);
  useEffect(() => {
    const stage = stageRef.current;
    const shell = shellRef.current;
    if (!stage || !shell) return;
    const desktop = window.matchMedia('(min-width: 768px)');
    const setExtra = (value: number) => {
      if (Math.abs(value - extraRef.current) < 0.05) return;
      extraRef.current = value;
      shell.style.setProperty('--reader-extra', `${value}px`);
    };
    const measure = () => {
      if (!desktop.matches) { setExtra(0); if (!reading) setTypingLines(12); return; }
      const copy = stage.querySelector<HTMLElement>(reading ? '.story-reader-copy p' : '.typing-copy');
      if (!copy) return;
      const textStyle = getComputedStyle(copy);
      const line = Number.parseFloat(textStyle.lineHeight);
      if (!line) return;
      // Range metrics include the font's ascenders/descenders. Font-size alone overestimates this inset.
      const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
      let textNode: Node | null;
      while ((textNode = walker.nextNode()) && !textNode.textContent?.trim()) { /* skip empty spans */ }
      if (textNode) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const glyph = range.getClientRects()[0];
        if (glyph) {
          const top = Math.max(0, glyph.top - copy.getBoundingClientRect().top);
          shell.style.setProperty('--text-half-leading', `${top}px`);
          shell.style.setProperty('--text-bottom-leading', `${Math.max(0, line - glyph.height - top)}px`);
        }
      }
      // Pinned: the remainder is shared by the four gaps (above the title bar, below it, below the text, below the
      // bottom bar). Hidden: it is split between the space above the text and the space below it.
      const gaps = settings.readerBarPinned ? 4 : 2;
      const style = getComputedStyle(stage);
      const inner = stage.getBoundingClientRect().height - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom);
      const room = inner + gaps * extraRef.current;
      let used: number;
      if (reading) {
        used = Math.max(3, Math.floor((room - 0.5) / line)) * line;
      } else {
        const lines = Math.max(4, Math.floor((room - 0.5) / line));
        setTypingLines(lines);
        used = lines * line;
      }
      // Fractional DOM measurements avoid a resize feedback loop; leave half a pixel for layout rounding.
      setExtra(Math.max(0, Math.floor(((room - 0.5 - used) / gaps) * 100) / 100));
    };
    let frame = requestAnimationFrame(measure);
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const resize = new ResizeObserver(schedule);
    resize.observe(shell);
    // Line heights arrive once the text is measured (and change with typography); page controls come and go.
    const styleChange = new MutationObserver(schedule);
    const surface = stage.querySelector('.typing-surface');
    if (surface) styleChange.observe(surface, { attributes: true, attributeFilter: ['style'], childList: true });
    const reader = stage.querySelector('.story-reader');
    if (reader) resize.observe(reader);
    void document.fonts?.ready.then(schedule);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); styleChange.disconnect(); };
  }, [reading, settings.readerBarPinned, settings.font, settings.fontSize, settings.readerLineHeight, settings.readerFontWeight, settings.readerLetterSpacing, work.key, sectionIndex]);

  // The hidden bar takes no room; its height is kept in a variable so the page can slide under it.
  useEffect(() => {
    const row = barRowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(() => row.parentElement?.style.setProperty('--bar-row-h', `${row.offsetHeight}px`));
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  const markSectionRead = (index: number) => {
    setReadSections(current => (current.includes(index) ? current : [...current, index]));
  };
  const markFinished = () => { const now = Date.now(); setFinishedAt(current => current ?? now); };

  const complete = (stats: TypingStats) => {
    setResult(stats); setResultOpen(true);
    const prefix = partPrefix(sectionIndex);
    setTypedParts(current => new Map(current).set(prefix, new Set([...(current.get(prefix) ?? []), chunkIndex])));
    if (chunkIndex === chunkCount - 1) {
      markSectionRead(sectionIndex);
      if (sectionIndex === sectionCount - 1) markFinished();
    }
    void db.testResults.add({ clientId: createClientId(), mode: resultMode, subMode: work.title, title: `${prefix} · Part ${chunkIndex + 1}`, wpm: stats.wpm, rawWpm: stats.rawWpm, accuracy: stats.accuracy, consistency: stats.consistency, duration: stats.timeElapsed, timestamp: Date.now(), errors: stats.incorrectChars, errorKeys: stats.errorHeatmap, totalChars: stats.totalChars, correctChars: stats.correctChars, incorrectChars: stats.incorrectChars });
  };
  const engine = useTypingEngine({ targetText: text, sessionKey: `${work.key}-${sectionIndex}-${chunkIndex}`, strictMode: settings.strictMode, onComplete: complete, onKeyPress });

  /** Moves to another section; reading mode lands on the anchor once the new section is measured. */
  const openSection = (index: number, anchor: PageAnchor) => {
    if (index < 0 || index >= sectionCount) return;
    const count = chunkParagraphs(work.sections[index].paragraphs).length;
    anchorRef.current = anchor;
    layoutRef.current = null;
    setLayout(null);
    setPage(0);
    setPickedPart(null);
    setSectionIndex(index);
    setChunkIndex(anchor.kind === 'part' ? Math.min(anchor.part, count - 1) : anchor.kind === 'fraction' && anchor.value >= 1 ? count - 1 : 0);
    setResultOpen(false);
    engine.reset();
  };

  const move = (direction: -1 | 1) => {
    const next = chunkIndex + direction;
    if (next >= 0 && next < chunkCount) { setChunkIndex(next); setResultOpen(false); engine.reset(); return; }
    if (direction === 1 && sectionIndex < sectionCount - 1) openSection(sectionIndex + 1, { kind: 'part', part: 0 });
    if (direction === -1 && sectionIndex > 0) openSection(sectionIndex - 1, { kind: 'part', part: Number.MAX_SAFE_INTEGER });
  };
  const atEnd = sectionIndex === sectionCount - 1 && chunkIndex === chunkCount - 1;
  const next = () => {
    if (!atEnd) move(1);
    else if (isStory) onNextStory();
    else setResultOpen(false);
  };

  // The reader re-measures on resize and typography changes; keep the reader on the same spot.
  const handleLayout = useCallback((nextLayout: ReaderLayout) => {
    const previous = layoutRef.current;
    const anchor = anchorRef.current;
    if (!anchor && previous && JSON.stringify(previous) === JSON.stringify(nextLayout)) return;
    anchorRef.current = null;
    layoutRef.current = nextLayout;
    setLayout(current => (current && JSON.stringify(current) === JSON.stringify(nextLayout) ? current : nextLayout));
    const last = nextLayout.pageCount - 1;
    if (anchor) {
      let target = 0;
      if (anchor.kind === 'part') target = nextLayout.partStartPage[Math.min(anchor.part, nextLayout.partStartPage.length - 1)] ?? 0;
      else if (anchor.kind === 'fraction') target = Math.round(anchor.value * last);
      // The page holding that word: the last page that starts at or before it.
      else while (target < last && nextLayout.wordsBefore[target + 1] <= anchor.value) target++;
      target = Math.min(last, Math.max(0, target));
      setPage(target);
      // Coming from typing, the part being typed stays current on its first page.
      if (anchor.kind === 'words' && anchor.part !== undefined) setPickedPart({ page: target, part: anchor.part });
    } else {
      setPage(current => (previous && previous.pageCount !== nextLayout.pageCount ? Math.min(last, Math.round((current / Math.max(1, previous.pageCount - 1)) * last)) : Math.min(last, current)));
    }
    pageShownAtRef.current = Date.now();
  }, []);

  const pageCount = layout?.pageCount ?? 1;
  const onLastPage = page >= pageCount - 1;

  // One position for both modes, in words from the start of the section. Reading counts the pages before
  // this one (or the start of a part picked from Contents); typing counts whole parts plus what's typed.
  const partFill = Math.min(1, engine.typed.length / Math.max(1, text.length));
  const picked = pickedPart && pickedPart.page === page ? pickedPart.part : null;
  const positionInSection = reading && layout
    ? Math.max(layout.wordsBefore[page] ?? 0, picked !== null ? chunkWordsBefore[picked] ?? 0 : 0)
    : (chunkWordsBefore[chunkIndex] ?? 0) + (chunk?.words ?? 0) * partFill;
  const partAtWords = (words: number) => {
    let index = 0;
    while (index < chunkCount - 1 && chunkWordsBefore[index + 1] <= words) index++;
    return index;
  };
  const currentPart = reading && layout ? (picked ?? partAtWords(positionInSection)) : chunkIndex;

  const goToPage = (target: number) => {
    if (!layout) return;
    const last = layout.pageCount - 1;
    if (target > last) {
      markSectionRead(sectionIndex);
      if (sectionIndex < sectionCount - 1) openSection(sectionIndex + 1, { kind: 'fraction', value: 0 });
      else if (isStory) { markFinished(); onNextStory(); }
      else markFinished();
      return;
    }
    if (target < 0) {
      if (sectionIndex > 0) openSection(sectionIndex - 1, { kind: 'fraction', value: 1 });
      return;
    }
    if (target === page) return;
    if (target === page + 1) {
      const words = layout.wordsBefore[page + 1] - layout.wordsBefore[page];
      setReadingWpm(updateReadingSpeed(readingWpm, words, Date.now() - pageShownAtRef.current));
    }
    pageShownAtRef.current = Date.now();
    setPage(target);
    if (target === last) {
      markSectionRead(sectionIndex);
      if (sectionIndex === sectionCount - 1) markFinished();
    }
  };

  const pagerRef = useRef<(step: PageStep) => void>(() => {});
  useEffect(() => {
    pagerRef.current = step => goToPage(step === 'start' ? 0 : step === 'end' ? pageCount - 1 : page + step);
  });
  useEffect(() => {
    if (!reading) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      // Leave keys alone in fields, menus and open panels (e.g. the library, reading settings).
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="listbox"], [role="dialog"], .settings-panel, .story-switcher-menu')) return;
      const onButton = Boolean(target?.closest('button, a'));
      let step: PageStep | null = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown') step = 1;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') step = -1;
      else if (event.key === ' ' && !onButton) step = event.shiftKey ? -1 : 1;
      else if (event.key === 'Home') step = 'start';
      else if (event.key === 'End') step = 'end';
      if (step === null) return;
      event.preventDefault();
      pagerRef.current(step);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reading]);

  const changeMode = (mode: UserSettings['storyMode']) => {
    if (mode === settings.storyMode) return;
    if (mode === 'read') {
      // Open reading mode on the page holding the typing position, with the typed part still current.
      anchorRef.current = { kind: 'words', value: positionInSection, part: chunkIndex };
      layoutRef.current = null;
      setLayout(null);
      setPickedPart(null);
    } else {
      // And come back to typing on the part the reading position is in.
      setChunkIndex(currentPart);
      setPickedPart(null);
    }
    setResultOpen(false); engine.reset();
    onUpdateSetting('storyMode', mode);
  };

  // Progress.
  const sectionReadWords = Math.round(positionInSection);
  const positionWords = wordsBeforeSection[sectionIndex] + sectionReadWords;
  const percent = Math.min(100, Math.round((positionWords / Math.max(1, totalWords)) * 100));
  // The last page of a section fills its bar: the whole of it is on screen.
  const fillWords = reading && layout && onLastPage ? sectionWords[sectionIndex] : positionInSection;
  const partFills = chunks.map((item, index) => Math.min(1, Math.max(0, (fillWords - (chunkWordsBefore[index] ?? 0)) / Math.max(1, item.words))));
  const fills = reading ? Array.from({ length: pageCount }, (_, index) => index <= page ? 1 : 0) : partFills;

  // Save where the reader is, shortly after it changes.
  const typedBucket = Math.floor(engine.typed.length / 40);
  useEffect(() => {
    if (reading && !layout) return;
    const timer = window.setTimeout(() => {
      const pageFraction = reading && layout ? (layout.pageCount > 1 ? page / (layout.pageCount - 1) : 0) : undefined;
      const record: BookProgressRecord = {
        bookId: work.key, kind: work.kind, title: work.title, author: work.author,
        chapterId: section.id, chapterIndex: sectionIndex, chunkIndex: reading ? currentPart : chunkIndex,
        charOffset: chunkCharsBefore[reading ? currentPart : chunkIndex] + (reading ? 0 : engine.typed.length),
        pageFraction, readSections, finishedAt,
        percent: finishedAt ? 100 : percent, totalWordsTyped: 0, lastRead: Date.now()
      };
      void db.bookProgress.get(work.key).then(previous => db.bookProgress.put({ ...previous, ...record, totalWordsTyped: previous?.totalWordsTyped ?? 0 })).then(() => window.dispatchEvent(new Event('keyhaven:sync'))).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- typed length is bucketed so typing doesn't write on every key
  }, [work.key, sectionIndex, chunkIndex, page, layout, reading, readSections, finishedAt, typedBucket, percent]);

  // Contents: story parts, or book chapters.
  const sectionChunkCounts = useMemo(() => (isStory ? [] : work.sections.map(item => chunkParagraphs(item.paragraphs).length)), [isStory, work]);
  const contents: ContentsEntry[] = isStory
    ? chunks.map((item, index) => {
      const current = index === currentPart;
      const fraction = current ? partFills[index] ?? 0 : 0;
      const done = Boolean(typedParts.get(work.title)?.has(index)) || (reading && index < currentPart);
      return { id: `${work.key}-${index}`, title: `Part ${index + 1}`, words: item.words, status: current ? 'current' : done ? 'done' : 'todo', percent: Math.round((current ? fraction : done ? 1 : 0) * 100) };
    })
    : work.sections.map((item, index) => {
      const current = index === sectionIndex;
      const typedAll = (typedParts.get(partPrefix(index))?.size ?? 0) >= (sectionChunkCounts[index] ?? Infinity);
      const done = readSections.includes(index) || typedAll;
      const fraction = current ? sectionReadWords / Math.max(1, sectionWords[index]) : done ? 1 : 0;
      return { id: item.id, title: sectionName(item.title) || `${sectionLabel} ${index + 1}`, words: sectionWords[index] ?? 0, status: current ? 'current' : done ? 'done' : 'todo', percent: Math.round(Math.min(1, fraction) * 100) };
    });
  const openContentsEntry = (index: number) => {
    if (!isStory) { if (index !== sectionIndex) openSection(index, { kind: 'part', part: 0 }); return; }
    if (reading) {
      if (!layout) return;
      const target = layout.partStartPage[index] ?? 0;
      goToPage(target);
      setPickedPart({ page: target, part: index });
      return;
    }
    if (index === chunkIndex) return;
    setChunkIndex(index); setResultOpen(false); engine.reset();
  };

  const chapterName = sectionName(section.title);
  const peekLabel = isStory ? work.title : `${sectionLabel} ${sectionIndex + 1}${chapterName ? ` · ${chapterName}` : ''}`;
  const eyebrow = isStory
    ? `Story · Part ${currentPart + 1} of ${chunkCount}`
    : `${sectionLabel} ${sectionIndex + 1} of ${sectionCount}${chapterName ? ` · ${chapterName}` : ''}${reading ? '' : ` · Part ${chunkIndex + 1} of ${chunkCount}`}`;
  const byline = `${work.author}${work.year ? ` · ${work.year}` : ''}`;
  const bylineOpen = byline;
  const lastSection = sectionIndex === sectionCount - 1;
  const nextPageLabel = !onLastPage ? 'Next' : !lastSection ? `Next ${unit}` : isStory ? 'Next story' : 'Finish';
  const pinned = settings.readerBarPinned;
  const resultTitle = `${partPrefix(sectionIndex)} · Part ${chunkIndex + 1}`;

  // Bottom bar stats, from the same position as the progress bar.
  const statContext: ReaderStatContext = {
    mode: reading ? 'read' : 'type', isStory, unit: isStory ? 'story' : unit, sectionTitle: chapterName,
    positionWords, sectionStartWords: wordsBeforeSection[sectionIndex], sectionWords: sectionWords[sectionIndex] ?? 0, totalWords,
    readingWpm, typingWpm: engine.wpm, accuracy: engine.accuracy, rawWpm: engine.rawWpm, elapsedSeconds: engine.timeElapsed,
    bookPage: layout ? (isStory ? 0 : sum(layout.sectionPageCounts.slice(0, sectionIndex))) + page + 1 : null,
    bookPages: layout ? (isStory ? layout.pageCount : sum(layout.sectionPageCounts)) : null,
    part: currentPart, partCount: chunkCount, now: clock.now, sessionStartedAt: clock.sessionStartedAt
  };
  const stats = resolveReaderStats(settings.readerStats[reading ? 'read' : 'type'], statContext, settings.readerBarStyle.labels);

  return <section className="reader-workspace" {...readerSurfaceProps(settings)}>
    {settings.readerBackground !== 'plain' && <StoryAtmosphere withScenery={settings.readerBackground !== 'none'} motion={settings.ambientMotion} />}
    {/* Entrances are CSS keyframes so they play on first paint instead of waiting for hydration. */}
    <div ref={shellRef} className={`reader-shell stories-shell ${reading ? 'is-reading' : ''}`} data-titlebar={settings.readerBarPinned ? 'pinned' : 'auto'}>
      {!settings.readerBarPinned && <>
        <div className="story-bar-hotzone" aria-hidden="true" onPointerEnter={() => scheduleReveal(true, 60)} onPointerLeave={() => scheduleReveal(false, 1500)} />
        <button type="button" className="story-bar-handle" aria-label="Show title bar" onPointerEnter={() => scheduleReveal(true, 40)} onPointerLeave={() => scheduleReveal(false, 1500)} onClick={() => { setBarRevealed(true); scheduleReveal(false, 4000); }}><span aria-hidden="true" /></button>
        <span className="story-bar-peek">{peekLabel}</span>
      </>}
      {/* The title bar, then one box of controls. */}
      <div
        ref={barRowRef}
        className="story-bar-row"
        data-revealed={!settings.readerBarPinned && barRevealed ? 'true' : undefined}
        onPointerEnter={() => { if (!settings.readerBarPinned) scheduleReveal(true, 0); }}
        onPointerLeave={() => { if (!settings.readerBarPinned) scheduleReveal(false, 1500); }}
        onFocus={() => { if (!settings.readerBarPinned) { window.clearTimeout(revealTimerRef.current); setBarRevealed(true); } }}
        onBlur={event => { if (!settings.readerBarPinned && !event.currentTarget.contains(event.relatedTarget as Node | null)) scheduleReveal(false, 1500); }}
      >
        <header className="story-bar">
          {/* The glass lives on its own layer so hovering the title can grow it over the page without moving the passage. */}
          <span className="story-bar-surface glass" aria-hidden="true" />
          <div className="story-bar-title">
            {/* Keyed so opening another work or chapter replays the short rise-in. */}
            <div key={`${work.key}-${sectionIndex}`} className="reader-meta-copy story-bar-copy">
              <p className="eyebrow" title={eyebrow}>{eyebrow}</p>
              <div className="story-bar-heading">
                <h1>{work.title}</h1>
                <span className="story-bar-byline">{byline}</span>
              </div>
              <p className="story-bar-byline-open" aria-hidden="true">{bylineOpen}</p>
            </div>
          </div>
          <ContentsMenu entries={contents} currentIndex={isStory ? currentPart : sectionIndex} unit={unit} wpm={readingWpm} onSelect={openContentsEntry} onOpen={refreshTypedParts} />
        </header>
        {/* One control box: how you read, the library, then view controls. */}
        <div className="story-side glass">
          <StoryModeToggle mode={settings.storyMode} onChange={changeMode} />
          <span className="story-side-divider" aria-hidden="true" />
          <button type="button" className="story-bar-button story-library-trigger" onClick={onOpenLibrary} aria-label="Library" title="Library (Ctrl K)">
            <Library aria-hidden="true" /><span>Library</span><kbd className="story-switcher-hint" aria-hidden="true">Ctrl K</kbd>
          </button>
          <span className="story-side-divider" aria-hidden="true" />
          {fullscreen.supported && <button type="button" className="story-bar-button is-icon" onClick={fullscreen.toggle} aria-label={fullscreen.active ? 'Exit full screen' : 'Enter full screen'} title={fullscreen.active ? 'Exit full screen' : 'Full screen'}>{fullscreen.active ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}</button>}
          <button type="button" className="story-bar-button is-icon" onClick={() => onUpdateSetting('muted', !settings.muted)} aria-label="Mute sound" aria-pressed={settings.muted} title={settings.muted ? 'Unmute sound' : 'Mute sound'}>{settings.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}</button>
          {!settings.zenMode && <button type="button" className="story-bar-button is-icon story-settings-button" onClick={openReaderSettings} aria-label="Reading settings" title="Reading settings"><SlidersHorizontal aria-hidden="true" /></button>}
          <button type="button" className="story-bar-button is-icon story-hide-button" onClick={event => { onUpdateSetting('readerBarPinned', !pinned); setBarRevealed(false); if (pinned) event.currentTarget.blur(); }} aria-label="Auto-hide title bar" aria-pressed={!pinned} title={pinned ? 'Hide title bar' : 'Keep title bar shown'}>{pinned ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}</button>
        </div>
      </div>

      <div ref={stageRef} className="reader-stage">
        {reading
          ? <>
            <StoryReader parts={parts} sections={sectionParts} page={page} font={settings.font} fontSize={settings.fontSize} lineHeight={settings.readerLineHeight} layoutKey={`${settings.readerFontWeight}-${settings.readerLetterSpacing}`} onLayout={handleLayout} />
            <p className="typing-hint reading-hint"><kbd aria-label="Left arrow">←</kbd><kbd aria-label="Right arrow">→</kbd> turn pages</p>
          </>
          : <TypingArea targetText={text} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font={settings.font} fontSize={settings.fontSize} wrapMode="literary" feedbackMode="reader" viewportLines={typingLines} viewportMode="pages" layoutKey={`${settings.readerFontWeight}-${settings.readerLetterSpacing}`} lineHeight={settings.readerLineHeight} onKeyDown={engine.handleKeyDown} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={engine.handleCompositionEnd} onReset={() => engine.reset()} />}
      </div>

      <ReaderBottomBar
        compact={!pinned}
        barStyle={settings.readerBarStyle}
        navLabel={reading ? (isStory ? 'Story pages' : 'Chapter pages') : (isStory ? 'Story parts' : 'Chapter parts')}
        progress={{
          label: isStory ? 'Story progress' : 'Chapter progress',
          percent,
          valueText: reading ? `Page ${page + 1} of ${pageCount}, ${percent}% read` : `Part ${chunkIndex + 1} of ${chunkCount}, ${percent}% of the ${isStory ? 'story' : 'book'}`,
          fills,
          partLabel: reading ? undefined : <>Part <strong>{chunkIndex + 1}</strong>/{chunkCount}</>
        }}
        previous={reading
          ? { disabled: page === 0 && sectionIndex === 0, onClick: () => goToPage(page - 1) }
          : { disabled: chunkIndex === 0 && sectionIndex === 0, onClick: () => move(-1) }}
        next={reading
          ? { disabled: !layout || (onLastPage && lastSection && !isStory && Boolean(finishedAt)), label: nextPageLabel, onClick: () => goToPage(page + 1) }
          : { disabled: atEnd && !isStory, label: atEnd ? 'Next story' : !lastSection && chunkIndex === chunkCount - 1 ? `Next ${unit}` : 'Next', onClick: () => (atEnd ? onNextStory() : move(1)) }}
        onRandomStory={onNextStory}
        onReset={reading ? undefined : () => engine.reset()}
        stats={stats}
      />
    </div>
    <TestResultsModal stats={result} isOpen={resultOpen} title={resultTitle} onRetry={() => { setResultOpen(false); engine.reset(); }} onNext={next} />
  </section>;
}
