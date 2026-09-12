'use client';

import React, { useState } from 'react';
import { Quote as QuoteIcon, Shuffle, Sparkles, BookOpen } from 'lucide-react';
import { QUOTES } from '@/data/quotes';
import { Quote, UserSettings, TypingStats } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LiveStatsBar } from '@/components/typing/LiveStatsBar';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { db } from '@/lib/db';

interface QuotesViewProps {
  settings: UserSettings;
  onKeyPress: (key: string) => void;
}

const CATEGORIES = [
  'All',
  'Stoicism',
  'Eastern Philosophy',
  'Science & Tech',
  'Literature',
  'Motivational'
];

export const QuotesView: React.FC<QuotesViewProps> = ({
  settings,
  onKeyPress
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
  const [completedStats, setCompletedStats] = useState<TypingStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredQuotes = selectedCategory === 'All'
    ? QUOTES
    : QUOTES.filter(q => q.category === selectedCategory);

  const currentQuote: Quote = filteredQuotes[activeQuoteIndex % filteredQuotes.length] || QUOTES[0];

  const handleQuoteComplete = (stats: TypingStats) => {
    setCompletedStats(stats);
    setIsModalOpen(true);

    db.testResults.add({
      mode: 'quotes',
      subMode: currentQuote.category,
      title: `Quote by ${currentQuote.author}`,
      wpm: stats.wpm,
      rawWpm: stats.rawWpm,
      accuracy: stats.accuracy,
      consistency: stats.consistency,
      duration: stats.timeElapsed,
      timestamp: Date.now(),
      errors: stats.incorrectChars,
      errorKeys: stats.errorHeatmap
    }).catch(() => {});
  };

  const {
    typed,
    wpm,
    accuracy,
    isFinished,
    handleKeyDown,
    reset
  } = useTypingEngine({
    targetText: currentQuote.text,
    strictMode: settings.strictMode,
    onComplete: handleQuoteComplete,
    onKeyPress
  });

  const shuffleQuote = () => {
    setIsModalOpen(false);
    const nextIdx = Math.floor(Math.random() * filteredQuotes.length);
    setActiveQuoteIndex(nextIdx);
    reset();
  };

  const handleNextQuote = () => {
    setIsModalOpen(false);
    setActiveQuoteIndex(prev => (prev + 1) % filteredQuotes.length);
    reset();
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-300">
      {/* Category Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setActiveQuoteIndex(0);
                reset();
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[var(--color-accent)] text-white shadow-xs'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--color-border)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={shuffleQuote}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--color-border)] hover:bg-[var(--bg-card)] transition-all cursor-pointer shrink-0"
        >
          <Shuffle className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span>Shuffle Quote</span>
        </button>
      </div>

      {/* Quote Metadata Header */}
      <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-border)] mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
            <QuoteIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-serif font-bold text-base text-[var(--text-primary)]">
              {currentQuote.author}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {currentQuote.source ? `From "${currentQuote.source}"` : currentQuote.category}
            </div>
          </div>
        </div>

        <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--color-border)] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
          {currentQuote.category}
        </span>
      </div>

      {/* Live Stats */}
      <LiveStatsBar
        wpm={wpm}
        accuracy={accuracy}
        timeElapsed={0}
        onReset={() => reset()}
        showLiveWpm={settings.showLiveWpm}
        showLiveAccuracy={settings.showLiveAccuracy}
      />

      {/* Typing Canvas */}
      <TypingArea
        targetText={currentQuote.text}
        typed={typed}
        isFinished={isFinished}
        caretStyle={settings.caretStyle}
        font={settings.font}
        fontSize={settings.fontSize}
        onKeyDown={handleKeyDown}
      />

      {/* Modal */}
      <TestResultsModal
        stats={completedStats}
        isOpen={isModalOpen}
        title={`Wisdom from ${currentQuote.author}`}
        onRetry={() => {
          setIsModalOpen(false);
          reset();
        }}
        onNext={handleNextQuote}
      />
    </div>
  );
};
