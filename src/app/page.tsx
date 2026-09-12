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
import { modeFromPath, pathForMode } from '@/lib/navigation';

export function KeyHavenApp({ initialMode = 'stories' }: { initialMode?: TypingMode }) {
  const [currentMode, setCurrentMode] = useState<TypingMode>(initialMode);
  const settingsApi = useSettings();
  const { settings } = settingsApi;
  const { playKeyPress } = useSoundEngine(settings.switchSound, settings.soundVolume, settings.ambientSound, settings.ambientVolume);
  const syncStatus = useCloudSync(settings, currentMode, settingsApi.replaceSettings);

  useEffect(() => {
    const onBack = () => {
      const mode = modeFromPath(window.location.pathname);
      if (mode) setCurrentMode(mode);
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  const selectMode = (mode: TypingMode) => {
    if (mode !== currentMode) window.history.pushState({}, '', pathForMode(mode));
    setCurrentMode(mode);
  };

  return (
    <div className="min-h-screen">
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
      <main className="app-content relative min-h-screen">
        {currentMode === 'stories' && <StoriesView settings={settings} onKeyPress={playKeyPress} />}
        {currentMode === 'speed-test' && <SpeedTestView settings={settings} onKeyPress={playKeyPress} />}
        {currentMode === 'quotes' && <QuotesView settings={settings} onKeyPress={playKeyPress} />}
        {currentMode === 'library' && <LibraryView settings={settings} onKeyPress={playKeyPress} />}
        {currentMode === 'learn' && <LearnView settings={settings} onKeyPress={playKeyPress} />}
        {currentMode === 'arcade' && <ArcadeView settings={settings} onKeyPress={playKeyPress} />}
        {currentMode === 'leaderboard' && <LeaderboardView />}
        {currentMode === 'profile' && <ProfileView />}
        {!settings.zenMode && <span className="sync-indicator">{syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'error' ? 'Local · sync pending' : 'Saved locally'}</span>}
      </main>
    </div>
  );
}

export default function HomePage() {
  return <KeyHavenApp />;
}
