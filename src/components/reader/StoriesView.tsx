'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Feather } from 'lucide-react';
import { STORIES } from '@/data/stories';
import { Story, UserSettings, TypingStats } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LiveStatsBar } from '@/components/typing/LiveStatsBar';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { createClientId, db } from '@/lib/db';

interface StoriesViewProps {
  settings: UserSettings;
  onKeyPress: (key: string) => void;
  onToggleAmbient?: () => void;
}

export const StoriesView: React.FC<StoriesViewProps> = ({
  settings,
  onKeyPress
}) => {
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const [completedStats, setCompletedStats] = useState<TypingStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeStory: Story = STORIES[selectedStoryIndex] || STORIES[0];
  const activeParagraph = activeStory.paragraphs[currentParagraphIndex] || activeStory.paragraphs[0];

  const handleParagraphComplete = (stats: TypingStats) => {
    setCompletedStats(stats);
    setIsModalOpen(true);

    // Save test result to local DB
    db.testResults.add({
      clientId: createClientId(),
      mode: 'stories',
      subMode: activeStory.title,
      title: `${activeStory.title} - Para ${currentParagraphIndex + 1}`,
      wpm: stats.wpm,
      rawWpm: stats.rawWpm,
      accuracy: stats.accuracy,
      consistency: stats.consistency,
      duration: stats.timeElapsed,
      timestamp: Date.now(),
      errors: stats.incorrectChars,
      errorKeys: stats.errorHeatmap
      ,totalChars: stats.totalChars, correctChars: stats.correctChars, incorrectChars: stats.incorrectChars
    }).catch(() => {});
  };

  const {
    typed,
    wpm,
    accuracy,
    timeElapsed,
    isFinished,
    handleKeyDown,
    reset
  } = useTypingEngine({
    targetText: activeParagraph,
    sessionKey: `${activeStory.id}-${currentParagraphIndex}`,
    strictMode: settings.strictMode,
    onComplete: handleParagraphComplete,
    onKeyPress
  });

  const handleNextParagraph = () => {
    setIsModalOpen(false);
    if (currentParagraphIndex < activeStory.paragraphs.length - 1) {
      setCurrentParagraphIndex(prev => prev + 1);
    } else {
      // Next story
      const nextStoryIdx = (selectedStoryIndex + 1) % STORIES.length;
      setSelectedStoryIndex(nextStoryIdx);
      setCurrentParagraphIndex(0);
    }
    reset();
  };

  const handleStoryChange = (idx: number) => {
    setSelectedStoryIndex(idx);
    setCurrentParagraphIndex(0);
    setIsModalOpen(false);
    reset();
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 animate-in fade-in duration-300">
      {/* Zen Story Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-secondary)] border border-[var(--color-border)] mb-8 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] shrink-0">
            <Feather className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-accent)]">
                Cozy Public Domain Stories
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-primary)] border border-[var(--color-border)] text-[var(--text-muted)]">
                Copyright-Free
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-[var(--text-primary)] mt-1">
              {activeStory.title}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              By <strong className="text-[var(--text-primary)]">{activeStory.author}</strong> ({activeStory.year}) • {activeStory.synopsis}
            </p>
          </div>
        </div>

        {/* Ambient indicator / quick controls */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <div className="text-right">
            <div className="text-xs font-medium text-[var(--text-primary)]">
              Part {currentParagraphIndex + 1} of {activeStory.paragraphs.length}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {activeStory.totalWords} words total
            </div>
          </div>
        </div>
      </div>

      {/* Story Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
        {STORIES.map((story, idx) => (
          <button
            key={story.id}
            onClick={() => handleStoryChange(idx)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
              selectedStoryIndex === idx
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-xs'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--color-border)] hover:text-[var(--text-primary)] hover:border-[var(--color-accent)]'
            }`}
          >
            {story.title}
          </button>
        ))}
      </div>

      {/* Live Stats Header */}
      <LiveStatsBar
        wpm={wpm}
        accuracy={accuracy}
        timeElapsed={timeElapsed}
        onReset={() => reset()}
        showLiveWpm={settings.showLiveWpm}
        showLiveAccuracy={settings.showLiveAccuracy}
      />

      {/* Primary Typing Canvas */}
      <TypingArea
        targetText={activeParagraph}
        typed={typed}
        isFinished={isFinished}
        caretStyle={settings.caretStyle}
        font={settings.font}
        fontSize={settings.fontSize}
        wrapMode="literary"
        onKeyDown={handleKeyDown}
        onReset={() => reset()}
      />

      {/* Paragraph Pagination Bar */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--color-border)]">
        <button
          onClick={() => {
            if (currentParagraphIndex > 0) {
              setCurrentParagraphIndex(prev => prev - 1);
              reset();
            }
          }}
          disabled={currentParagraphIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--color-border)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Paragraph</span>
        </button>

        <div className="flex items-center gap-1">
          {activeStory.paragraphs.map((_, pIdx) => (
            <span
              key={pIdx}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                pIdx === currentParagraphIndex
                  ? 'bg-[var(--color-accent)] scale-125'
                  : pIdx < currentParagraphIndex
                  ? 'bg-[var(--color-correct)]'
                  : 'bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (currentParagraphIndex < activeStory.paragraphs.length - 1) {
              setCurrentParagraphIndex(prev => prev + 1);
              reset();
            }
          }}
          disabled={currentParagraphIndex >= activeStory.paragraphs.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--color-border)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <span>Next Paragraph</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Results Modal */}
      <TestResultsModal
        stats={completedStats}
        isOpen={isModalOpen}
        title={`Finished Part ${currentParagraphIndex + 1} of ${activeStory.title}`}
        onRetry={() => {
          setIsModalOpen(false);
          reset();
        }}
        onNext={handleNextParagraph}
      />
    </div>
  );
};
