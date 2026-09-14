'use client';

import React, { useMemo, useState } from 'react';
import { Maximize2, Minimize2, Shuffle, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { QUOTES } from '@/data/quotes';
import type { ReaderStatId, TypingStats, UserSettings } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { useFullscreen } from '@/hooks/useFullscreen';
import { TypingArea } from '@/components/typing/TypingArea';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { ReaderBottomBar } from '@/components/reader/ReaderBottomBar';
import { StoryAtmosphere } from '@/components/reader/StoryAtmosphere';
import { openReaderSettings } from '@/lib/reader-events';
import { resolveReaderStats } from '@/lib/reader-stats';
import { countWords } from '@/lib/reading';
import { createClientId, db } from '@/lib/db';
import { readerSurfaceProps } from '@/lib/reader-style';

type UpdateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;

const categories = ['All', 'Stoicism', 'Eastern Philosophy', 'Science & Tech', 'Literature', 'Motivational'];
/** Bottom-bar items that mean something for a single quote. */
const QUOTE_STATS = new Set<ReaderStatId>(['wpm', 'accuracy', 'rawWpm', 'elapsed']);

/** Quotes in the reader layout: a glass title bar, one control box and the shared bottom bar. */
export const QuotesView = ({ settings, onKeyPress, onUpdateSetting }: { settings: UserSettings; onKeyPress: (key: string) => void; onUpdateSetting: UpdateSetting }) => {
  const [category, setCategory] = useState('All');
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<TypingStats | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const fullscreen = useFullscreen();
  const quotes = useMemo(() => (category === 'All' ? QUOTES : QUOTES.filter(quote => quote.category === category)), [category]);
  const position = index % quotes.length;
  const quote = quotes[position] ?? QUOTES[0];

  const complete = (stats: TypingStats) => {
    setResult(stats); setResultOpen(true);
    void db.testResults.add({ clientId: createClientId(), mode: 'quotes', subMode: quote.category, title: `Quote by ${quote.author}`, wpm: stats.wpm, rawWpm: stats.rawWpm, accuracy: stats.accuracy, consistency: stats.consistency, duration: stats.timeElapsed, timestamp: Date.now(), errors: stats.incorrectChars, errorKeys: stats.errorHeatmap, totalChars: stats.totalChars, correctChars: stats.correctChars, incorrectChars: stats.incorrectChars });
  };
  const engine = useTypingEngine({ targetText: quote.text, sessionKey: `${category}-${quote.id}`, strictMode: settings.strictMode, onComplete: complete, onKeyPress });
  const go = (next: number) => { setIndex(next); setResultOpen(false); engine.reset(); };
  const advance = () => go((position + 1) % quotes.length);
  const back = () => go(Math.max(0, position - 1));
  const shuffle = () => go(Math.floor(Math.random() * quotes.length));

  const words = countWords(quote.text);
  const stats = resolveReaderStats(settings.readerStats.type.filter(id => QUOTE_STATS.has(id)), {
    mode: 'type', isStory: true, unit: 'quote', sectionTitle: '', positionWords: 0, sectionStartWords: 0, sectionWords: words, totalWords: words,
    readingWpm: 0, typingWpm: engine.wpm, accuracy: engine.accuracy, rawWpm: engine.rawWpm, elapsedSeconds: engine.timeElapsed,
    bookPage: null, bookPages: null, part: 0, partCount: 1, now: 0, sessionStartedAt: 0
  }, settings.readerBarStyle.labels);
  const source = quote.source ?? 'Selected wisdom';

  return <section className="reader-workspace" {...readerSurfaceProps(settings)}>
    {settings.readerBackground !== 'plain' && <StoryAtmosphere withScenery={settings.readerBackground !== 'none'} motion={settings.ambientMotion} />}
    <div className="reader-shell stories-shell quotes-shell" data-titlebar="pinned">
      <div className="story-bar-row">
        <header className="story-bar">
          <span className="story-bar-surface glass" aria-hidden="true" />
          <div className="story-bar-title">
            <div key={quote.id} className="reader-meta-copy story-bar-copy">
              <p className="eyebrow">Quote · {quote.category}</p>
              <div className="story-bar-heading">
                <h1>{quote.author}</h1>
                <span className="story-bar-byline">{source}</span>
              </div>
              <p className="story-bar-byline-open" aria-hidden="true">{source}</p>
            </div>
          </div>
        </header>
        <div className="story-side glass">
          <GlassSelect variant="pill" align="right" ariaLabel="Quote category" value={category} options={categories} onChange={value => { setCategory(value); go(0); }} />
          <span className="story-side-divider" aria-hidden="true" />
          {fullscreen.supported && <button type="button" className="story-bar-button is-icon" onClick={fullscreen.toggle} aria-label={fullscreen.active ? 'Exit full screen' : 'Enter full screen'} title={fullscreen.active ? 'Exit full screen' : 'Full screen'}>{fullscreen.active ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}</button>}
          <button type="button" className="story-bar-button is-icon" onClick={() => onUpdateSetting('muted', !settings.muted)} aria-label="Mute sound" aria-pressed={settings.muted} title={settings.muted ? 'Unmute sound' : 'Mute sound'}>{settings.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}</button>
          {!settings.zenMode && <button type="button" className="story-bar-button is-icon story-settings-button" onClick={openReaderSettings} aria-label="Reading settings" title="Reading settings"><SlidersHorizontal aria-hidden="true" /></button>}
        </div>
      </div>

      <div className="reader-stage">
        <TypingArea targetText={quote.text} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font={settings.font} fontSize={settings.fontSize} wrapMode="whole-word" layoutKey={`${settings.readerFontWeight}-${settings.readerLetterSpacing}`} lineHeight={settings.readerLineHeight} onKeyDown={engine.handleKeyDown} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={engine.handleCompositionEnd} onReset={() => engine.reset()} />
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
      />
    </div>
    <TestResultsModal stats={result} isOpen={resultOpen} title={`Quote by ${quote.author}`} onRetry={() => { setResultOpen(false); engine.reset(); }} onNext={advance} />
  </section>;
};
