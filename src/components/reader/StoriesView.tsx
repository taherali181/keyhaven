'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { STORIES } from '@/data/stories';
import { UserSettings, TypingStats } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LiveStatsBar } from '@/components/typing/LiveStatsBar';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { StoryAtmosphere } from '@/components/reader/StoryAtmosphere';
import { createClientId, db } from '@/lib/db';
import { readerStyle } from '@/lib/reader-style';
import { fadeUp, stagger } from '@/lib/motion';

const MAX_DOTS = 14;

export const StoriesView = ({ settings, onKeyPress }: { settings: UserSettings; onKeyPress: (key: string) => void }) => {
  const [storyIndex, setStoryIndex] = useState(0);
  const [partIndex, setPartIndex] = useState(0);
  const [result, setResult] = useState<TypingStats | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const story = STORIES[storyIndex] ?? STORIES[0];
  const text = story.paragraphs[partIndex] ?? story.paragraphs[0];
  const partCount = story.paragraphs.length;

  const complete = (stats: TypingStats) => {
    setResult(stats); setResultOpen(true);
    void db.testResults.add({ clientId: createClientId(), mode: 'stories', subMode: story.title, title: `${story.title} · Part ${partIndex + 1}`, wpm: stats.wpm, rawWpm: stats.rawWpm, accuracy: stats.accuracy, consistency: stats.consistency, duration: stats.timeElapsed, timestamp: Date.now(), errors: stats.incorrectChars, errorKeys: stats.errorHeatmap, totalChars: stats.totalChars, correctChars: stats.correctChars, incorrectChars: stats.incorrectChars });
  };
  const engine = useTypingEngine({ targetText: text, sessionKey: `${story.id}-${partIndex}`, strictMode: settings.strictMode, onComplete: complete, onKeyPress });

  const move = (direction: -1 | 1) => {
    const next = partIndex + direction;
    if (next < 0 || next >= partCount) return;
    setPartIndex(next); setResultOpen(false); engine.reset();
  };
  const next = () => {
    if (partIndex < partCount - 1) move(1);
    else { setStoryIndex(value => (value + 1) % STORIES.length); setPartIndex(0); setResultOpen(false); engine.reset(); }
  };

  const progress = Math.min(1, (partIndex + Math.min(1, engine.typed.length / Math.max(1, text.length))) / partCount);

  return <section className="reader-workspace" style={readerStyle(settings)}>
    <StoryAtmosphere withScenery={settings.readerBackground !== 'none'} />
    <motion.div className="reader-shell" variants={stagger(0.08)} initial="hidden" animate="show">
      <motion.header className="reader-meta glass glass-card" variants={fadeUp}>
        <motion.div key={story.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
          <p className="eyebrow">Story · Part {partIndex + 1} of {partCount}</p>
          <h1>{story.title}</h1>
          <p>{story.author} · {story.year}</p>
        </motion.div>
        <div className="story-picker">
          <BookOpen aria-hidden="true" />
          <label className="sr-only" htmlFor="story-choice">Choose a story</label>
          <select id="story-choice" className="reader-select" value={storyIndex} onChange={event => { setStoryIndex(Number(event.target.value)); setPartIndex(0); setResultOpen(false); engine.reset(); }}>{STORIES.map((item, index) => <option key={item.id} value={index}>{item.title}</option>)}</select>
        </div>
      </motion.header>

      <div className="reader-pane glass">
        <div className="story-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
        <TypingArea targetText={text} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font={settings.font} fontSize={settings.fontSize} wrapMode="literary" feedbackMode="reader" viewportLines={9} viewportMode="pages" lineHeight={settings.readerLineHeight} onKeyDown={engine.handleKeyDown} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={engine.handleCompositionEnd} onReset={() => engine.reset()} />
      </div>

      <motion.nav className="reader-pagination glass glass-pill" aria-label="Story parts" variants={fadeUp}>
        <button disabled={partIndex === 0} onClick={() => move(-1)}><ChevronLeft />Previous</button>
        <span className="pagination-status">
          {partCount <= MAX_DOTS && <span className="pagination-dots" aria-hidden="true">{story.paragraphs.map((_, index) => <i key={index} className={index === partIndex ? 'is-current' : index < partIndex ? 'is-done' : ''} />)}</span>}
          <span>{partIndex + 1} / {partCount}</span>
        </span>
        <button disabled={partIndex === partCount - 1} onClick={() => move(1)}>Next<ChevronRight /></button>
      </motion.nav>
    </motion.div>
    <LiveStatsBar wpm={engine.wpm} accuracy={engine.accuracy} timeElapsed={engine.timeElapsed} onReset={() => engine.reset()} showLiveWpm={settings.showLiveWpm} showLiveAccuracy={settings.showLiveAccuracy} />
    <TestResultsModal stats={result} isOpen={resultOpen} title={`${story.title} · Part ${partIndex + 1}`} onRetry={() => { setResultOpen(false); engine.reset(); }} onNext={next} />
  </section>;
};
