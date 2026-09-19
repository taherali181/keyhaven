'use client';

import { startTransition, useEffect, useRef, useState, ViewTransition } from 'react';
import { MotionConfig } from 'framer-motion';
import { TypingMode } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useSoundEngine } from '@/hooks/useSoundEngine';
import { Navbar } from '@/components/layout/Navbar';
import { AmbientBackdrop } from '@/components/layout/AmbientBackdrop';
import { Tooltips } from '@/components/ui/Tooltips';
import { ReaderSettings } from '@/components/reader/ReaderSettings';
import { ReaderHome } from '@/components/reader/ReaderHome';
import { HomeView } from '@/components/home/HomeView';
import { LibraryWindow } from '@/components/library/LibraryWindow';
import { SpeedTestView } from '@/components/speed-test/SpeedTestView';
import { QuotesView } from '@/components/reader/QuotesView';
import { LearnView } from '@/components/learn/LearnView';
import { ArcadeView } from '@/components/arcade/ArcadeView';
import { LeaderboardView } from '@/components/analytics/LeaderboardView';
import { ProfileView } from '@/components/profile/ProfileView';
import { SectionSettings, isSettingsSection } from '@/components/settings/SectionSettings';
import { rememberWork } from '@/lib/catalog';
import { OPEN_SECTION_EVENT, OPEN_WORK_EVENT } from '@/lib/reader-events';
import { ManuscriptView } from '@/components/manuscript/ManuscriptView';
import { PdfView } from '@/components/pdf/PdfView';
import { useBackupSync } from '@/hooks/useBackupSync';
import { BACKUP_LABELS, useBackupStatus } from '@/lib/sync/status';
import { modeFromPath, pathForMode } from '@/lib/navigation';
import { hasSceneryImage, readerSurfaceProps } from '@/lib/reader-style';
import { SECTION_LABELS, sectionTypographyDefaults, sectionUpdate, settingsForSection } from '@/lib/section-settings';
import type { UserSettings } from '@/types';

/** Views that draw their own scenery and have a reading-settings button in their title bar. */
const READER_VIEWS: TypingMode[] = ['stories', 'quotes'];


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

  // Other parts of the app can ask for a section (the reader's "Original pages" opens PDFs).
  const selectModeRef = useRef<(mode: TypingMode) => void>(() => {});
  useEffect(() => {
    const onOpenSection = (event: Event) => selectModeRef.current((event as CustomEvent<{ mode: TypingMode }>).detail.mode);
    window.addEventListener(OPEN_SECTION_EVENT, onOpenSection);
    return () => window.removeEventListener(OPEN_SECTION_EVENT, onOpenSection);
  }, []);

  // Opening a work from outside the reader (Home, the Library, Profile) switches to Read, which then opens it.
  const updateSettingRef = useRef(settingsApi.updateSetting);
  useEffect(() => { updateSettingRef.current = settingsApi.updateSetting; });
  useEffect(() => {
    if (currentMode === 'stories') return;
    const onOpenWork = (event: Event) => {
      const { key, mode } = (event as CustomEvent<{ key: string; mode?: UserSettings['storyMode'] }>).detail;
      rememberWork(key);
      if (mode) updateSettingRef.current('storyMode', mode);
      window.history.pushState({}, '', pathForMode('stories'));
      startTransition(() => setCurrentMode('stories'));
    };
    window.addEventListener(OPEN_WORK_EVENT, onOpenWork);
    return () => window.removeEventListener(OPEN_WORK_EVENT, onOpenWork);
  }, [currentMode]);

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
  useEffect(() => { selectModeRef.current = selectMode; });

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
                {currentMode === 'home' && <HomeView onNavigate={selectMode} />}
                {currentMode === 'stories' && <ReaderHome settings={sectionSettings} onKeyPress={playKeyPress} onUpdateSetting={updateSectionSetting} />}
                {currentMode === 'speed-test' && <SpeedTestView settings={sectionSettings} onKeyPress={playKeyPress} onUpdateSetting={updateSectionSetting} />}
                {currentMode === 'quotes' && <QuotesView settings={sectionSettings} onKeyPress={playKeyPress} onUpdateSetting={updateSectionSetting} />}
                {currentMode === 'learn' && <LearnView settings={sectionSettings} onKeyPress={playKeyPress} onUpdateSetting={updateSectionSetting} />}
                {currentMode === 'arcade' && <ArcadeView settings={sectionSettings} onKeyPress={playKeyPress} />}
                {currentMode === 'leaderboard' && <LeaderboardView />}
                {/* PDFs and Write are being built; they stay reachable by address only until then. */}
                {currentMode === 'pdf' && <PdfView settings={sectionSettings} />}
                {currentMode === 'manuscript' && <ManuscriptView settings={settings} />}
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
          onReplaceSettings={settingsApi.replaceSettings}
        />
        {/* The library is part of Read: a window over the reader, opened from its title bar or with Ctrl K. */}
        {(currentMode === 'stories' || currentMode === 'home') && <LibraryWindow initialOpen={initialLibraryOpen} />}
        {/* Read and Quotes open the full reading settings from their title bar; practice sections have their own small sheet. */}
        {!settings.zenMode && <ReaderSettings settings={sectionSettings} onUpdateSetting={updateSectionSetting} onUpdateSettings={updateSectionSettings} sectionLabel={SECTION_LABELS[currentMode] ?? 'Read'} typographyDefaults={sectionTypographyDefaults(currentMode)} />}
        {!settings.zenMode && isSettingsSection(currentMode) && <SectionSettings key={currentMode} mode={currentMode} settings={sectionSettings} onUpdateSetting={updateSectionSetting} onUpdateSettings={updateSectionSettings} />}
      </div>
    </MotionConfig>
  );
}
