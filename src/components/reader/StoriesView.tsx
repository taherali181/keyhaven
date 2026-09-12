'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { STORIES } from '@/data/stories';
import { UserSettings, TypingStats } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LiveStatsBar } from '@/components/typing/LiveStatsBar';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { createClientId, db } from '@/lib/db';
import { readerStyle } from '@/lib/reader-style';

export const StoriesView = ({ settings, onKeyPress }: { settings: UserSettings; onKeyPress: (key: string) => void }) => {
  const [storyIndex, setStoryIndex] = useState(0);
  const [partIndex, setPartIndex] = useState(0);
  const [result, setResult] = useState<TypingStats | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const story = STORIES[storyIndex] ?? STORIES[0];
  const text = story.paragraphs[partIndex] ?? story.paragraphs[0];

  const complete = (stats: TypingStats) => {
    setResult(stats); setResultOpen(true);
    void db.testResults.add({ clientId: createClientId(), mode: 'stories', subMode: story.title, title: `${story.title} · Part ${partIndex + 1}`, wpm: stats.wpm, rawWpm: stats.rawWpm, accuracy: stats.accuracy, consistency: stats.consistency, duration: stats.timeElapsed, timestamp: Date.now(), errors: stats.incorrectChars, errorKeys: stats.errorHeatmap, totalChars: stats.totalChars, correctChars: stats.correctChars, incorrectChars: stats.incorrectChars });
  };
  const engine = useTypingEngine({ targetText: text, sessionKey: `${story.id}-${partIndex}`, strictMode: settings.strictMode, onComplete: complete, onKeyPress });

  const move = (direction: -1 | 1) => {
    const next = partIndex + direction;
    if (next < 0 || next >= story.paragraphs.length) return;
    setPartIndex(next); setResultOpen(false); engine.reset();
  };
  const next = () => {
    if (partIndex < story.paragraphs.length - 1) move(1);
    else { setStoryIndex(value => (value + 1) % STORIES.length); setPartIndex(0); setResultOpen(false); engine.reset(); }
  };

  return <section className="reader-workspace" style={readerStyle(settings)}>
    <div className="reader-shell">
      <header className="reader-meta">
        <div><p className="eyebrow">Story · Part {partIndex + 1} of {story.paragraphs.length}</p><h1>{story.title}</h1><p>{story.author} · {story.year}</p></div>
        <label className="sr-only" htmlFor="story-choice">Choose a story</label>
        <select id="story-choice" className="reader-select" value={storyIndex} onChange={event => { setStoryIndex(Number(event.target.value)); setPartIndex(0); setResultOpen(false); engine.reset(); }}>{STORIES.map((item, index) => <option key={item.id} value={index}>{item.title}</option>)}</select>
      </header>
      <TypingArea targetText={text} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font={settings.font} fontSize={settings.fontSize} wrapMode="literary" feedbackMode="reader" viewportLines={9} viewportMode="pages" lineHeight={settings.readerLineHeight} onKeyDown={engine.handleKeyDown} onReset={() => engine.reset()} />
      <nav className="reader-pagination" aria-label="Story parts"><button disabled={partIndex === 0} onClick={() => move(-1)}><ChevronLeft />Previous</button><span>{partIndex + 1} / {story.paragraphs.length}</span><button disabled={partIndex === story.paragraphs.length - 1} onClick={() => move(1)}>Next<ChevronRight /></button></nav>
    </div>
    <LiveStatsBar wpm={engine.wpm} accuracy={engine.accuracy} timeElapsed={engine.timeElapsed} onReset={() => engine.reset()} showLiveWpm={settings.showLiveWpm} showLiveAccuracy={settings.showLiveAccuracy} />
    <TestResultsModal stats={result} isOpen={resultOpen} title={`${story.title} · Part ${partIndex + 1}`} onRetry={() => { setResultOpen(false); engine.reset(); }} onNext={next} />
  </section>;
};
