'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserSettings, ThemeId, FontFamily, SwitchSound, AmbientSound, CaretStyle } from '@/types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/db';

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

  const replaceSettings = useCallback((incoming: UserSettings) => {
    setSettingsState(previous => {
      if (incoming.updatedAt <= previous.updatedAt) return previous;
      saveSettings(incoming);
      applyTheme(incoming.theme);
      return incoming;
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
    replaceSettings
  };
}
