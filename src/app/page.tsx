'use client';

import { useEffect, useState } from 'react';
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
import { useCloudSync } from '@/hooks/useCloudSync';
import { MODES } from '@/lib/navigation';

export function KeyHavenApp({ initialMode = 'stories' }: { initialMode?: TypingMode }) {
  const [currentMode, setCurrentMode] = useState<TypingMode>(initialMode);
  const settingsApi = useSettings();
  const { settings } = settingsApi;
  const { playKeyPress } = useSoundEngine(settings.switchSound, settings.soundVolume, settings.ambientSound, settings.ambientVolume);
  const syncStatus = useCloudSync(settings, currentMode, settingsApi.replaceSettings);

  useEffect(() => {
    const onBack = () => {
      const mode = window.location.pathname.slice(1) as TypingMode;
      if (MODES.includes(mode)) setCurrentMode(mode);
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  const selectMode = (mode: TypingMode) => {
    if (mode !== currentMode) window.history.pushState({}, '', `/${mode}`);
    setCurrentMode(mode);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        currentMode={currentMode}
        onSelectMode={selectMode}
        settings={settings}
        onUpdateTheme={settingsApi.setTheme}
        onUpdateFont={settingsApi.setFont}
        onUpdateSwitchSound={settingsApi.setSwitchSound}
        onUpdateSoundVolume={settingsApi.setSoundVolume}
        onUpdateAmbientSound={settingsApi.setAmbientSound}
        onUpdateAmbientVolume={settingsApi.setAmbientVolume}
        onUpdateCaretStyle={settingsApi.setCaretStyle}
        onUpdateSetting={settingsApi.updateSetting}
        onToggleZenMode={settingsApi.toggleZenMode}
      />
      <main className="relative flex-1 pb-20">
        {currentMode === 'stories' && <StoriesView settings={settings} onKeyPress={playKeyPress} />}
        {currentMode === 'speed-test' && <SpeedTestView settings={settings} onKeyPress={playKeyPress} />}
        {currentMode === 'quotes' && <QuotesView settings={settings} onKeyPress={playKeyPress} />}
        {currentMode === 'library' && <LibraryView settings={settings} onKeyPress={playKeyPress} />}
        {currentMode === 'learn' && <LearnView settings={settings} onKeyPress={playKeyPress} />}
        {currentMode === 'arcade' && <ArcadeView settings={settings} onKeyPress={playKeyPress} />}
        {currentMode === 'leaderboard' && <LeaderboardView />}
        {currentMode === 'profile' && <ProfileView />}
      </main>
      {!settings.zenMode && (
        <footer className="border-t border-[var(--color-border)] py-8 text-[11px] text-[var(--text-muted)]">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-6 sm:flex-row">
            <span className="font-serif text-sm text-[var(--text-secondary)]">KeyHaven <i className="ml-2 font-normal">A quieter way to practice.</i></span>
            <span className="uppercase tracking-[.16em]">{syncStatus === 'synced' ? 'Cloud synced' : syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'error' ? 'Saved locally · sync pending' : 'Saved locally · offline ready'}</span>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function HomePage() {
  return <KeyHavenApp />;
}
