'use client';

import React, { useState, useEffect } from 'react';
import { Library, BookOpen, Bookmark, ChevronLeft, ChevronRight, CheckCircle, ArrowRight } from 'lucide-react';
import { BOOKS } from '@/data/books';
import { Book, BookChapter, UserSettings, TypingStats, BookProgressRecord } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LiveStatsBar } from '@/components/typing/LiveStatsBar';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { db } from '@/lib/db';

interface LibraryViewProps {
  settings: UserSettings;
  onKeyPress: (key: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  settings,
  onKeyPress
}) => {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [currentChapterIdx, setCurrentChapterIdx] = useState<number>(0);
  const [bookProgressMap, setBookProgressMap] = useState<Record<string, BookProgressRecord>>({});
  const [completedStats, setCompletedStats] = useState<TypingStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Load progress for books from IndexedDB
  useEffect(() => {
    db.bookProgress.toArray().then(records => {
      const map: Record<string, BookProgressRecord> = {};
      records.forEach(r => {
        map[r.bookId] = r;
      });
      setBookProgressMap(map);
    }).catch(() => {});
  }, []);

  const activeChapter: BookChapter | null = selectedBook
    ? selectedBook.chapters[currentChapterIdx] || selectedBook.chapters[0]
    : null;

  const targetText = activeChapter ? activeChapter.text : '';

  const handleChapterComplete = (stats: TypingStats) => {
    if (!selectedBook || !activeChapter) return;
    setCompletedStats(stats);
    setIsModalOpen(true);

    const percent = Math.min(100, Math.round(((currentChapterIdx + 1) / selectedBook.chapters.length) * 100));

    // Save bookmark progress in DB
    db.bookProgress.put({
      bookId: selectedBook.id,
      chapterIndex: currentChapterIdx,
      charOffset: targetText.length,
      percent,
      totalWordsTyped: activeChapter.wordCount,
      lastRead: Date.now()
    }).then(() => {
      setBookProgressMap(prev => ({
        ...prev,
        [selectedBook.id]: {
          bookId: selectedBook.id,
          chapterIndex: currentChapterIdx,
          charOffset: targetText.length,
          percent,
          totalWordsTyped: activeChapter.wordCount,
          lastRead: Date.now()
        }
      }));
    }).catch(() => {});

    // Save test result
    db.testResults.add({
      mode: 'library',
      subMode: selectedBook.title,
      title: `${selectedBook.title} - ${activeChapter.title}`,
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
    targetText,
    strictMode: settings.strictMode,
    onComplete: handleChapterComplete,
    onKeyPress
  });

  const handleOpenBook = (book: Book) => {
    const saved = bookProgressMap[book.id];
    const chIdx = saved && saved.chapterIndex < book.chapters.length ? saved.chapterIndex : 0;
    setSelectedBook(book);
    setCurrentChapterIdx(chIdx);
    setIsModalOpen(false);
    reset();
  };

  const handleNextChapter = () => {
    if (!selectedBook) return;
    setIsModalOpen(false);
    if (currentChapterIdx < selectedBook.chapters.length - 1) {
      setCurrentChapterIdx(prev => prev + 1);
      reset();
    }
  };

  // View: Bookshelf Gallery
  if (!selectedBook) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-accent)]">
                The Great Library
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--color-border)] text-[var(--text-muted)]">
                Public Domain Classics
              </span>
            </div>
            <h2 className="text-3xl font-serif font-bold text-[var(--text-primary)] mt-1">
              Classic Books & Philosophy
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Select a timeless masterwork to type chapter by chapter with automatic progress bookmarking.
            </p>
          </div>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BOOKS.map(book => {
            const progress = bookProgressMap[book.id];
            const percent = progress?.percent || 0;

            return (
              <div
                key={book.id}
                onClick={() => handleOpenBook(book)}
                className="group relative flex flex-col justify-between p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all duration-200 hover:shadow-xl cursor-pointer overflow-hidden"
              >
                {/* Top Book Header with Gradient Cover Badge */}
                <div>
                  <div className={`h-28 rounded-2xl bg-gradient-to-br ${book.coverGradient} p-4 flex flex-col justify-between text-white mb-4 shadow-md group-hover:scale-[1.02] transition-transform`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-black/30 backdrop-blur-xs">
                        {book.category}
                      </span>
                      <Bookmark className="w-4 h-4 text-white/80" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg leading-tight line-clamp-1">
                        {book.title}
                      </h3>
                      <p className="text-xs text-white/80 font-sans">{book.author}</p>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 mb-4 leading-relaxed">
                    {book.synopsis}
                  </p>
                </div>

                {/* Footer details */}
                <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
                  <div className="text-[var(--text-muted)]">
                    {book.chapters.length} Chapters • {book.totalWords} words
                  </div>

                  {percent > 0 ? (
                    <div className="flex items-center gap-1.5 text-[var(--color-correct)] font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{percent}% Read</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[var(--color-accent)] font-semibold group-hover:translate-x-1 transition-transform">
                      <span>Start Book</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // View: Book Chapter Reader & Typing View
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 animate-in fade-in duration-300">
      {/* Chapter Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-border)] mb-6">
        <div>
          <button
            onClick={() => setSelectedBook(null)}
            className="flex items-center gap-1 text-xs text-[var(--color-accent)] font-medium mb-1 hover:underline cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Library Bookshelf</span>
          </button>
          <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">
            {selectedBook.title}
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {activeChapter?.title} • Chapter {currentChapterIdx + 1} of {selectedBook.chapters.length}
          </p>
        </div>

        {/* Chapter Switcher */}
        <div className="flex items-center gap-2">
          <select
            value={currentChapterIdx}
            onChange={e => {
              setCurrentChapterIdx(parseInt(e.target.value));
              reset();
            }}
            className="text-xs p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--color-border)] text-[var(--text-primary)] outline-none cursor-pointer"
          >
            {selectedBook.chapters.map((ch, idx) => (
              <option key={ch.id} value={idx}>
                Chapter {idx + 1}: {ch.title}
              </option>
            ))}
          </select>
        </div>
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
        targetText={targetText}
        typed={typed}
        isFinished={isFinished}
        caretStyle={settings.caretStyle}
        font={settings.font}
        fontSize={settings.fontSize}
        onKeyDown={handleKeyDown}
      />

      {/* Chapter Pagination */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--color-border)]">
        <button
          onClick={() => {
            if (currentChapterIdx > 0) {
              setCurrentChapterIdx(prev => prev - 1);
              reset();
            }
          }}
          disabled={currentChapterIdx === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--color-border)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Chapter</span>
        </button>

        <span className="text-xs text-[var(--text-muted)]">
          {Math.min(100, Math.round(((currentChapterIdx + 1) / selectedBook.chapters.length) * 100))}% Book Completed
        </span>

        <button
          onClick={() => {
            if (currentChapterIdx < selectedBook.chapters.length - 1) {
              setCurrentChapterIdx(prev => prev + 1);
              reset();
            }
          }}
          disabled={currentChapterIdx >= selectedBook.chapters.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--color-border)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <span>Next Chapter</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Results Modal */}
      <TestResultsModal
        stats={completedStats}
        isOpen={isModalOpen}
        title={`Completed Chapter ${currentChapterIdx + 1} of ${selectedBook.title}`}
        onRetry={() => {
          setIsModalOpen(false);
          reset();
        }}
        onNext={currentChapterIdx < selectedBook.chapters.length - 1 ? handleNextChapter : undefined}
      />
    </div>
  );
};
