'use client';

import React, { useMemo, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { QUOTES } from '@/data/quotes';
import { UserSettings, TypingStats } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LiveStatsBar } from '@/components/typing/LiveStatsBar';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { createClientId, db } from '@/lib/db';
import { readerStyle } from '@/lib/reader-style';

const categories = ['All', 'Stoicism', 'Eastern Philosophy', 'Science & Tech', 'Literature', 'Motivational'];

export const QuotesView = ({ settings, onKeyPress }: { settings: UserSettings; onKeyPress: (key: string) => void }) => {
  const [category, setCategory] = useState('All');
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<TypingStats | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const quotes = useMemo(() => category === 'All' ? QUOTES : QUOTES.filter(quote => quote.category === category), [category]);
  const quote = quotes[index % quotes.length] ?? QUOTES[0];
  const complete = (stats: TypingStats) => {
    setResult(stats); setResultOpen(true);
    void db.testResults.add({ clientId: createClientId(), mode: 'quotes', subMode: quote.category, title: `Quote by ${quote.author}`, wpm: stats.wpm, rawWpm: stats.rawWpm, accuracy: stats.accuracy, consistency: stats.consistency, duration: stats.timeElapsed, timestamp: Date.now(), errors: stats.incorrectChars, errorKeys: stats.errorHeatmap, totalChars: stats.totalChars, correctChars: stats.correctChars, incorrectChars: stats.incorrectChars });
  };
  const engine = useTypingEngine({ targetText: quote.text, sessionKey: `${category}-${quote.id}`, strictMode: settings.strictMode, onComplete: complete, onKeyPress });
  const advance = () => { setIndex(value => (value + 1) % quotes.length); setResultOpen(false); engine.reset(); };
  const shuffle = () => { setIndex(Math.floor(Math.random() * quotes.length)); setResultOpen(false); engine.reset(); };

  return <section className="reader-workspace" style={readerStyle(settings)}><div className="reader-shell">
    <header className="reader-meta"><div><p className="eyebrow">Quote · {quote.category}</p><h1>{quote.author}</h1><p>{quote.source ?? 'Selected wisdom'}</p></div><div className="reader-actions"><select className="reader-select" aria-label="Quote category" value={category} onChange={event => { setCategory(event.target.value); setIndex(0); setResultOpen(false); engine.reset(); }}>{categories.map(item => <option key={item}>{item}</option>)}</select><button className="icon-action" onClick={shuffle} aria-label="Shuffle quote"><Shuffle /></button></div></header>
    <TypingArea targetText={quote.text} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font={settings.font} fontSize={settings.fontSize} wrapMode="whole-word" viewportLines={9} viewportMode="pages" lineHeight={settings.readerLineHeight} onKeyDown={engine.handleKeyDown} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={engine.handleCompositionEnd} onReset={() => engine.reset()} />
    <nav className="reader-pagination"><span>{index + 1} / {quotes.length}</span><button onClick={advance}>Next quote</button></nav>
  </div><LiveStatsBar wpm={engine.wpm} accuracy={engine.accuracy} timeElapsed={engine.timeElapsed} onReset={() => engine.reset()} showLiveWpm={settings.showLiveWpm} showLiveAccuracy={settings.showLiveAccuracy} /><TestResultsModal stats={result} isOpen={resultOpen} title={`Quote by ${quote.author}`} onRetry={() => { setResultOpen(false); engine.reset(); }} onNext={advance} /></section>;
};
