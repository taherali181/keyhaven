'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserSettings, ThemeId, FontFamily, SwitchSound, AmbientSound, CaretStyle } from '@/types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/db';
import { sanitizeSectionPrefs } from '@/lib/section-settings';
import { normalizeTypography } from '@/lib/typography';

function applyTheme(theme: ThemeId) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}

export function useSettings() {
  const [settings, setSettingsState] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    queueMicrotask(() => {
      const loaded = loadSettings();
      applyTheme(loaded.theme);
      setSettingsState(loaded);
    });
  }, []);

  const updateSetting = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettingsState(previous => {
      const next = { ...previous, [key]: value, updatedAt: Date.now() };
      saveSettings(next);
      if (key === 'theme') applyTheme(value as ThemeId);
      return next;
    });
  }, []);

  /** Several changes in one update, computed from the latest settings (so batched section changes don't overwrite each other). */
  const updateSettingsWith = useCallback((change: (previous: UserSettings) => Partial<UserSettings>) => {
    setSettingsState(previous => {
      const patch = change(previous);
      const next = { ...previous, ...patch, updatedAt: Date.now() };
      saveSettings(next);
      if ('theme' in patch) applyTheme(next.theme);
      return next;
    });
  }, []);

  const replaceSettings = useCallback((incoming: UserSettings) => {
    setSettingsState(previous => {
      if (incoming.updatedAt <= previous.updatedAt) return previous;
      // Settings from another device may predate the current typography model.
      const next = { ...incoming, ...normalizeTypography(incoming), sectionPrefs: sanitizeSectionPrefs(incoming.sectionPrefs) };
      saveSettings(next);
      applyTheme(next.theme);
      return next;
    });
  }, []);

  return {
    settings,
    mounted: true,
    setTheme: (theme: ThemeId) => updateSetting('theme', theme),
    setFont: (font: FontFamily) => updateSetting('font', font),
    setSwitchSound: (sound: SwitchSound) => updateSetting('switchSound', sound),
    setSoundVolume: (volume: number) => updateSetting('soundVolume', volume),
    setAmbientSound: (ambient: AmbientSound) => updateSetting('ambientSound', ambient),
    setAmbientVolume: (volume: number) => updateSetting('ambientVolume', volume),
    setCaretStyle: (caret: CaretStyle) => updateSetting('caretStyle', caret),
    toggleZenMode: () => updateSetting('zenMode', !settings.zenMode),
    updateSetting,
    updateSettingsWith,
    replaceSettings
  };
}
