'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Atom, BookOpen, Brain, Feather, Flag, Landmark, Layers, Leaf, Lightbulb, Maximize2, Minimize2, Shuffle, SlidersHorizontal, Smile, Star, Trees, Volume2, VolumeX } from 'lucide-react';
import { GlassSelect } from '@/components/ui/GlassSelect';
import type { Quote, ReaderStatId, TestResultRecord, TypingStats, UserSettings } from '@/types';
import { db } from '@/lib/db';
import { loadQuotes, quoteCategories, quoteKey } from '@/lib/quotes';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { useFullscreen } from '@/hooks/useFullscreen';
import { TypingArea } from '@/components/typing/TypingArea';
import { ResultPopup } from '@/components/reader/results/ResultPopup';
import { saveResult, useResultPopup, type ReaderResult } from '@/components/reader/results/useResultPopup';
import { ReaderBottomBar } from '@/components/reader/ReaderBottomBar';
import { StoryAtmosphere } from '@/components/reader/StoryAtmosphere';
import { openReaderSettings } from '@/lib/reader-events';
import { resolveReaderStats } from '@/lib/reader-stats';
import { countWords } from '@/lib/reading';
import { createClientId } from '@/lib/db';
import { readerSurfaceProps } from '@/lib/reader-style';

type UpdateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Stoicism: <Landmark aria-hidden="true" />,
  'Eastern Philosophy': <Leaf aria-hidden="true" />,
  Literature: <BookOpen aria-hidden="true" />,
  Poetry: <Feather aria-hidden="true" />,
  'Humour & Wit': <Smile aria-hidden="true" />,
  Philosophy: <Brain aria-hidden="true" />,
  Wisdom: <Lightbulb aria-hidden="true" />,
  Nature: <Trees aria-hidden="true" />,
  'Courage & Freedom': <Flag aria-hidden="true" />,
  'Science & Discovery': <Atom aria-hidden="true" />
};
/** A random position in a list of `length` (used from events and effects, never while rendering). */
const randomIndex = (length: number) => Math.floor(Math.random() * Math.max(1, length));
/** What the category picker filters by: every quote, saved ones, or a category. Stored in settings.quoteFilter. */
const ALL = 'all';
const SAVED = 'saved';
/** Shown until the quotes have loaded (and when nothing is saved yet), so the page keeps its shape. */
const PLACEHOLDER: Quote = { id: 'placeholder', text: '', author: 'Quotes', category: '', length: 'short' };
/** Bottom-bar items that mean something for a single quote. */
const QUOTE_STATS = new Set<ReaderStatId>(['wpm', 'accuracy', 'rawWpm', 'elapsed']);

/** Quotes in the reader layout: a glass title bar, one control box and the shared bottom bar. */
export const QuotesView = ({ settings, onKeyPress, onUpdateSetting }: { settings: UserSettings; onKeyPress: (key: string) => void; onUpdateSetting: UpdateSetting }) => {
  const [all, setAll] = useState<Quote[] | null>(null);
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [loadError, setLoadError] = useState(false);
  const category = settings.quoteFilter || ALL;
  const [index, setIndex] = useState(0);
  const showResultRef = useRef<(result: ReaderResult) => void>(() => {});
  const fullscreen = useFullscreen();

  // Quotes and your saved ones load after the first render; the first quote is picked at random then.
  useEffect(() => {
    let live = true;
    void Promise.all([loadQuotes(), db.favorites.where('kind').equals('quote').primaryKeys()]).then(([items, keys]) => {
      if (!live) return;
      setAll(items);
      setSaved(new Set(keys.map(String)));
      setIndex(randomIndex(items.length));
    }).catch(() => { if (live) setLoadError(true); });
    return () => { live = false; };
  }, []);

  const quotes = useMemo(() => {
    const items = all ?? [];
    if (category === SAVED) return items.filter(item => saved.has(quoteKey(item.id)));
    return category === ALL ? items : items.filter(item => item.category === category);
  }, [all, category, saved]);
  const position = quotes.length ? index % quotes.length : 0;
  const quote = quotes[position] ?? PLACEHOLDER;
  const isSaved = saved.has(quoteKey(quote.id));
  const emptySaved = all !== null && category === SAVED && !quotes.length;
  const categoryOptions = useMemo(() => [
    { value: ALL, label: 'All quotes', icon: <Layers aria-hidden="true" />, count: all?.length ?? 0 },
    { value: SAVED, label: 'Saved', icon: <Star aria-hidden="true" />, count: saved.size },
    ...quoteCategories(all ?? []).map(value => ({ value, label: value, icon: CATEGORY_ICONS[value] ?? <Layers aria-hidden="true" />, count: (all ?? []).filter(item => item.category === value).length }))
  ], [all, saved]);

  const toggleSaved = async () => {
    if (quote === PLACEHOLDER) return;
    const key = quoteKey(quote.id);
    const next = new Set(saved);
    if (next.has(key)) { next.delete(key); await db.favorites.delete(key); }
    else { next.add(key); const now = Date.now(); await db.favorites.put({ key, kind: 'quote', addedAt: now, updatedAt: now }); }
    setSaved(next);
  };
  const choose = (value: string) => { onUpdateSetting('quoteFilter', value); setIndex(0); engine.reset(); };

  const complete = (stats: TypingStats) => {
    const title = `Quote by ${quote.author}`;
    const record: TestResultRecord = { clientId: createClientId(), mode: 'quotes', subMode: quote.category, title, wpm: stats.wpm, rawWpm: stats.rawWpm, accuracy: stats.accuracy, consistency: stats.consistency, duration: stats.timeElapsed, timestamp: Date.now(), errors: stats.incorrectChars, errorKeys: stats.errorHeatmap, totalChars: stats.totalChars, correctChars: stats.correctChars, incorrectChars: stats.incorrectChars };
    void saveResult({
      record, stats,
      heading: 'Quote done',
      eyebrow: `Quote · ${quote.category}`,
      title: quote.author,
      nextLabel: 'Next quote',
      modes: ['quotes'],
      scopes: [
        { id: 'all', label: 'All quotes', match: () => true },
        { id: 'author', label: 'This author', match: item => item.title === title },
        { id: 'category', label: quote.category, match: item => item.subMode === quote.category }
      ]
    }).then(result => showResultRef.current(result)).catch(() => {});
  };
  const engine = useTypingEngine({ targetText: quote.text, sessionKey: `${category}-${quote.id}`, strictMode: settings.strictMode, onComplete: complete, onKeyPress });
  const popup = useResultPopup(engine.typed.length, engine.isFinished);
  useEffect(() => { showResultRef.current = popup.show; });
  const go = (next: number) => { setIndex(next); engine.reset(); };
  const advance = () => go((position + 1) % Math.max(1, quotes.length));
  const back = () => go(Math.max(0, position - 1));
  const shuffle = () => go(randomIndex(quotes.length));
  // A finished quote stays on screen: Enter, or starting to type, moves to the next one.
  const typingKeyDown = (event: React.KeyboardEvent) => {
    if (engine.isFinished && !event.ctrlKey && !event.metaKey && !event.altKey && (event.key === 'Enter' || event.key.length === 1)) {
      event.preventDefault();
      advance();
      return;
    }
    engine.handleKeyDown(event);
  };

  const words = countWords(quote.text);
  const stats = resolveReaderStats(settings.readerStats.type.filter(id => QUOTE_STATS.has(id)), {
    mode: 'type', isStory: true, unit: 'quote', sectionTitle: '', positionWords: 0, sectionStartWords: 0, sectionWords: words, totalWords: words,
    readingWpm: 0, typingWpm: engine.wpm, accuracy: engine.accuracy, rawWpm: engine.rawWpm, elapsedSeconds: engine.timeElapsed,
    bookPage: null, bookPages: null, part: 0, partCount: 1, now: 0, sessionStartedAt: 0
  }, settings.readerBarStyle.labels);
  const source = quote.source ?? '';

  return <section className="reader-workspace" {...readerSurfaceProps(settings)}>
    {settings.readerBackground !== 'plain' && <StoryAtmosphere withScenery={settings.readerBackground !== 'none'} motion={settings.ambientMotion} />}
    <div className="reader-shell stories-shell quotes-shell" data-titlebar="pinned">
      <div className="story-bar-row">
        <header className="story-bar">
          <span className="story-bar-surface glass" aria-hidden="true" />
          <div className="story-bar-title">
            <div key={quote.id} className="reader-meta-copy story-bar-copy">
              <p className="eyebrow">{quote === PLACEHOLDER ? (emptySaved ? 'Saved quotes' : 'Quotes') : `Quote · ${quote.category}`}</p>
              <div className="story-bar-heading">
                <h1>{quote.author}</h1>
                <span className="story-bar-byline">{source}</span>
              </div>
              <p className="story-bar-byline-open" aria-hidden="true">{source}</p>
            </div>
          </div>
        </header>
        <div className="story-side glass">
          <button type="button" className="story-bar-button is-icon quote-save" onClick={() => void toggleSaved()} disabled={quote === PLACEHOLDER} aria-pressed={isSaved} aria-label={isSaved ? 'Saved quote' : 'Save quote'} title={isSaved ? 'Remove from saved quotes' : 'Save this quote'}><Star aria-hidden="true" /></button>
          <GlassSelect variant="toolbar" align="right" ariaLabel="Quote category" value={category} options={categoryOptions} onChange={choose} />
          <span className="story-side-divider" aria-hidden="true" />
          {fullscreen.supported && <button type="button" className="story-bar-button is-icon" onClick={fullscreen.toggle} aria-label={fullscreen.active ? 'Exit full screen' : 'Enter full screen'} title={fullscreen.active ? 'Exit full screen' : 'Full screen'}>{fullscreen.active ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}</button>}
          <button type="button" className="story-bar-button is-icon" onClick={() => onUpdateSetting('muted', !settings.muted)} aria-label="Mute sound" aria-pressed={settings.muted} title={settings.muted ? 'Unmute sound' : 'Mute sound'}>{settings.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}</button>
          {!settings.zenMode && <button type="button" className="story-bar-button is-icon story-settings-button" onClick={openReaderSettings} aria-label="Reading settings" title="Reading settings"><SlidersHorizontal aria-hidden="true" /></button>}
        </div>
      </div>

      <div className="reader-stage">
        {emptySaved || loadError || all === null
          ? <div className="quotes-empty" role="status">
            {emptySaved ? <><Star aria-hidden="true" /><p><strong>No saved quotes yet</strong></p><p>Star a quote you love and it will wait for you here.</p><button type="button" className="rs-btn" onClick={() => choose(ALL)}>Show all quotes</button></>
              : loadError ? <p>Quotes could not be loaded. Check your connection and try again.</p>
                : <span className="skeleton quotes-skeleton" aria-label="Loading quotes" />}
          </div>
          : <TypingArea targetText={quote.text} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font={settings.font} fontSize={settings.fontSize} wrapMode="whole-word" layoutKey={`${settings.readerFontWeight}-${settings.readerLetterSpacing}-${settings.readerWordSpacing}-${settings.readerWidth}`} lineHeight={settings.readerLineHeight} onKeyDown={typingKeyDown} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={engine.handleCompositionEnd} onReset={() => engine.reset()} onEscape={() => (popup.view === 'toast' ? popup.collapse() : engine.reset())} />}
      </div>

      <ReaderBottomBar
        compact={false}
        barStyle={settings.readerBarStyle}
        navLabel="Quotes"
        previous={{ disabled: position === 0, onClick: back }}
        next={{ disabled: false, label: 'Next quote', onClick: advance }}
        onRandomStory={shuffle}
        randomLabel="Shuffle quote"
        randomIcon={<Shuffle aria-hidden="true" />}
        onReset={() => engine.reset()}
        stats={stats}
      >
        <ResultPopup popup={popup} onNext={advance} onRetry={() => engine.reset()} />
      </ReaderBottomBar>
    </div>
  </section>;
};
