'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserSettings, ThemeId, FontFamily, SwitchSound, AmbientSound, CaretStyle } from '@/types';
import { DEFAULT_SETTINGS, loadSettings, normalizeSettings, saveSettings } from '@/lib/db';
import { resolveTone, THEME_VARIABLE_NAMES } from '@/lib/reader-style';

function applyTheme(theme: ThemeId, customTones: UserSettings['customTones']) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const resolved = resolveTone(theme, customTones);
  root.dataset.theme = resolved.attr;
  root.dataset.themeScheme = resolved.scheme;
  THEME_VARIABLE_NAMES.forEach(property => root.style.removeProperty(property));
  root.style.removeProperty('color-scheme');
  Object.entries(resolved.vars).forEach(([property, value]) => {
    if (property === 'colorScheme') root.style.colorScheme = String(value);
    else root.style.setProperty(property, String(value));
  });
}

export function useSettings() {
  const [settings, setSettingsState] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    queueMicrotask(() => {
      const loaded = loadSettings();
      applyTheme(loaded.theme, loaded.customTones);
      setSettingsState(loaded);
    });
  }, []);

  const updateSetting = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettingsState(previous => {
      const next = { ...previous, [key]: value, updatedAt: Date.now() };
      saveSettings(next);
      applyTheme(next.theme, next.customTones);
      return next;
    });
  }, []);

  /** Several changes in one update, computed from the latest settings (so batched section changes don't overwrite each other). */
  const updateSettingsWith = useCallback((change: (previous: UserSettings) => Partial<UserSettings>) => {
    setSettingsState(previous => {
      const patch = change(previous);
      const next = { ...previous, ...patch, updatedAt: Date.now() };
      saveSettings(next);
      applyTheme(next.theme, next.customTones);
      return next;
    });
  }, []);

  const replaceSettings = useCallback((incoming: UserSettings) => {
    setSettingsState(previous => {
      if (incoming.updatedAt <= previous.updatedAt) return previous;
      // Settings from another device may predate the current typography model.
      const next = normalizeSettings(incoming);
      saveSettings(next);
      applyTheme(next.theme, next.customTones);
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
