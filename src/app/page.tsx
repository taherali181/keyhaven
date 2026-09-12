'use client';

import React, { useState } from 'react';
import { TypingMode } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useSoundEngine } from '@/hooks/useSoundEngine';
import { Navbar } from '@/components/layout/Navbar';
import { StoriesView } from '@/components/reader/StoriesView';
import { SpeedTestView } from '@/components/speed-test/SpeedTestView';
import { QuotesView } from '@/components/reader/QuotesView';
import { LibraryView } from '@/components/library/LibraryView';
import { LearnView } from '@/components/learn/LearnView';
import { ArcadeView } from '@/components/arcade/ArcadeView';
import { LeaderboardView } from '@/components/analytics/LeaderboardView';
import { ProfileView } from '@/components/analytics/ProfileView';

export default function HomePage() {
  const [currentMode, setCurrentMode] = useState<TypingMode>('stories');
  const {
    settings,
    mounted,
    setTheme,
    setFont,
    setSwitchSound,
    setSoundVolume,
    setAmbientSound,
    setAmbientVolume,
    setCaretStyle,
    toggleZenMode
  } = useSettings();

  const { playKeyPress } = useSoundEngine(
    settings.switchSound,
    settings.soundVolume,
    settings.ambientSound,
    settings.ambientVolume
  );

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-secondary)] font-serif">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-accent)] animate-spin opacity-80" />
          <p className="text-sm">Opening KeyHaven sanctuary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between transition-colors duration-300">
      <div>
        <Navbar
          currentMode={currentMode}
          onSelectMode={setCurrentMode}
          settings={settings}
          onUpdateTheme={setTheme}
          onUpdateFont={setFont}
          onUpdateSwitchSound={setSwitchSound}
          onUpdateSoundVolume={setSoundVolume}
          onUpdateAmbientSound={setAmbientSound}
          onUpdateAmbientVolume={setAmbientVolume}
          onUpdateCaretStyle={setCaretStyle}
          onToggleZenMode={toggleZenMode}
        />

        <main className="pb-16">
          {currentMode === 'stories' && (
            <StoriesView
              settings={settings}
              onKeyPress={playKeyPress}
            />
          )}

          {currentMode === 'speed-test' && (
            <SpeedTestView
              settings={settings}
              onKeyPress={playKeyPress}
            />
          )}

          {currentMode === 'quotes' && (
            <QuotesView
              settings={settings}
              onKeyPress={playKeyPress}
            />
          )}

          {currentMode === 'library' && (
            <LibraryView
              settings={settings}
              onKeyPress={playKeyPress}
            />
          )}

          {currentMode === 'learn' && (
            <LearnView
              settings={settings}
              onKeyPress={playKeyPress}
            />
          )}

          {currentMode === 'arcade' && (
            <ArcadeView
              settings={settings}
              onKeyPress={playKeyPress}
            />
          )}

          {currentMode === 'leaderboard' && (
            <LeaderboardView />
          )}

          {currentMode === 'profile' && (
            <ProfileView />
          )}
        </main>
      </div>

      {/* Subtle Footer (hidden in zen mode) */}
      {!settings.zenMode && (
        <footer className="w-full py-6 border-t border-[var(--color-border)] bg-[var(--bg-primary)] text-center text-xs text-[var(--text-muted)]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-[var(--text-primary)]">KeyHaven</span>
              <span>— Mindful Reading, Classical Literature & Typing Mastery</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span>Public Domain Stories & Books</span>
              <span>•</span>
              <span>Offline-First (IndexedDB)</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
