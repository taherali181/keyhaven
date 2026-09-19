'use client';

import { startTransition, useEffect, useState, ViewTransition } from 'react';
import { MotionConfig } from 'framer-motion';
import { TypingMode } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useSoundEngine } from '@/hooks/useSoundEngine';
import { Navbar } from '@/components/layout/Navbar';
import { AmbientBackdrop } from '@/components/layout/AmbientBackdrop';
import { Tooltips } from '@/components/ui/Tooltips';
import { ReaderSettings } from '@/components/reader/ReaderSettings';
import { ReaderHome } from '@/components/reader/ReaderHome';
import { LibraryWindow } from '@/components/library/LibraryWindow';
import { SpeedTestView } from '@/components/speed-test/SpeedTestView';
import { QuotesView } from '@/components/reader/QuotesView';
import { LearnView } from '@/components/learn/LearnView';
import { ArcadeView } from '@/components/arcade/ArcadeView';
import { LeaderboardView } from '@/components/analytics/LeaderboardView';
import { ProfileView } from '@/components/profile/ProfileView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { rememberWork } from '@/lib/catalog';
import { useBackupSync } from '@/hooks/useBackupSync';
import { useBackupStatus, type BackupState } from '@/lib/sync/status';
import { modeFromPath, pathForMode } from '@/lib/navigation';
import { hasSceneryImage, readerSurfaceProps } from '@/lib/reader-style';
import { SECTION_LABELS, sectionUpdate, settingsForSection } from '@/lib/section-settings';
import type { UserSettings } from '@/types';

/** Views that draw their own scenery and have a reading-settings button in their title bar. */
const READER_VIEWS: TypingMode[] = ['stories', 'quotes'];

const BACKUP_LABELS: Record<BackupState, string> = {
  off: 'Saved on this device',
  'signed-out': 'Saved on this device',
  syncing: 'Backing up…',
  'up-to-date': 'Backed up',
  offline: 'Offline · backs up later',
  error: 'Backup paused'
};

export function KeyHavenApp({ initialMode = 'stories', initialLibraryOpen = false }: { initialMode?: TypingMode; initialLibraryOpen?: boolean }) {
  const [currentMode, setCurrentMode] = useState<TypingMode>(initialMode);
  const settingsApi = useSettings();
  const { settings } = settingsApi;
  const { playKeyPress } = useSoundEngine(settings.switchSound, settings.soundVolume, settings.ambientSound, settings.ambientVolume, settings.muted);
  useBackupSync(settings, settingsApi.replaceSettings);
  const backup = useBackupStatus();

  useEffect(() => {
    const onBack = () => {
      const mode = modeFromPath(window.location.pathname);
      if (mode) startTransition(() => setCurrentMode(mode));
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  // Each section renders with its own typography and bottom bar; changes made from it are saved to that section.
  const sectionSettings = settingsForSection(settings, currentMode);
  const updateSectionSettings = (patch: Partial<UserSettings>) => settingsApi.updateSettingsWith(previous =>
    (Object.entries(patch) as Array<[keyof UserSettings, UserSettings[keyof UserSettings]]>).reduce<Partial<UserSettings>>(
      (change, [key, value]) => ({ ...change, ...sectionUpdate({ ...previous, ...change }, currentMode, key, value) }),
      {}
    ));
  const updateSectionSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => updateSectionSettings({ [key]: value } as Partial<UserSettings>);

  // Mode changes run inside a transition so <ViewTransition> animates between views.
  const selectMode = (mode: TypingMode) => {
    if (mode !== currentMode) window.history.pushState({}, '', pathForMode(mode));
    startTransition(() => setCurrentMode(mode));
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen app-surface" data-motion={settings.ambientMotion ? 'on' : 'off'}>
        {/* The global theme colors every surface; scenery remains scoped to page content. */}
        <div className="page-surface" {...readerSurfaceProps(sectionSettings)}>
          <AmbientBackdrop />
          {!READER_VIEWS.includes(currentMode) && hasSceneryImage(settings.readerBackground) && <div className="app-scenery" aria-hidden="true" />}
          <main className="app-content">
            <ViewTransition key={currentMode} enter="mode-enter" exit="mode-exit" default="none">
              <div className="mode-view-root">
                {currentMode === 'stories' && <ReaderHome settings={sectionSettings} onKeyPress={playKeyPress} onUpdateSetting={updateSectionSetting} />}
                {currentMode === 'speed-test' && <SpeedTestView settings={sectionSettings} onKeyPress={playKeyPress} />}
                {currentMode === 'quotes' && <QuotesView settings={sectionSettings} onKeyPress={playKeyPress} onUpdateSetting={updateSectionSetting} />}
                {currentMode === 'learn' && <LearnView settings={sectionSettings} onKeyPress={playKeyPress} onUpdateSetting={updateSectionSetting} />}
                {currentMode === 'arcade' && <ArcadeView settings={sectionSettings} onKeyPress={playKeyPress} />}
                {currentMode === 'leaderboard' && <LeaderboardView />}
                {/* PDFs and Write are being built; they stay reachable by address only until then. */}
                {currentMode === 'pdf' && <section className="speed-shell"><SectionHeader eyebrow="Your documents" title="PDFs" description="Read PDFs as their original pages or as reflowed text. Coming soon." /></section>}
                {currentMode === 'manuscript' && <section className="speed-shell"><SectionHeader eyebrow="Your writing" title="Write" description="Write your own pieces, then read or type them back. Coming soon." /></section>}
                {currentMode === 'profile' && <ProfileView
                  settings={settings}
                  onUpdateSetting={settingsApi.updateSetting}
                  onNavigate={selectMode}
                  onOpenWork={key => { rememberWork(key); selectMode('stories'); }}
                  onImportSettings={settingsApi.replaceSettings}
                />}
              </div>
            </ViewTransition>
          </main>
        </div>
        <Tooltips />
        {!settings.zenMode && <span className="sync-indicator" role="status">{BACKUP_LABELS[backup.state]}</span>}
        <Navbar
          currentMode={currentMode}
          onSelectMode={selectMode}
          settings={settings}
          onUpdateTheme={settingsApi.setTheme}
          onUpdateSwitchSound={settingsApi.setSwitchSound}
          onUpdateCaretStyle={settingsApi.setCaretStyle}
          onUpdateSetting={settingsApi.updateSetting}
          onToggleZenMode={settingsApi.toggleZenMode}
        />
        {/* The library is part of Read: a window over the reader, opened from its title bar or with Ctrl K. */}
        {currentMode === 'stories' && <LibraryWindow initialOpen={initialLibraryOpen} />}
        {!settings.zenMode && <ReaderSettings settings={sectionSettings} onUpdateSetting={updateSectionSetting} onUpdateSettings={updateSectionSettings} sectionLabel={SECTION_LABELS[currentMode] ?? 'Read'} showTrigger={!READER_VIEWS.includes(currentMode)} />}
      </div>
    </MotionConfig>
  );
}
