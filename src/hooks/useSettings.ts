'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserSettings, ThemeId, FontFamily, SwitchSound, AmbientSound, CaretStyle } from '@/types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/db';
import { THEMES } from '@/lib/themes';

export function useSettings() {
  const [settings, setSettingsState] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loaded = loadSettings();
    setSettingsState(loaded);
    applyThemeCss(loaded.theme);
    setMounted(true);
  }, []);

  const applyThemeCss = (themeId: ThemeId) => {
    if (typeof document === 'undefined') return;
    const theme = THEMES[themeId] || THEMES['zen-sand'];
    const root = document.documentElement;

    root.style.setProperty('--bg-primary', theme.colors.bg);
    root.style.setProperty('--bg-secondary', theme.colors.bgSecondary);
    root.style.setProperty('--bg-card', theme.colors.bgCard);
    root.style.setProperty('--text-primary', theme.colors.text);
    root.style.setProperty('--text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--text-muted', theme.colors.textMuted);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-accent-secondary', theme.colors.accentSecondary);
    root.style.setProperty('--color-caret', theme.colors.caret);
    root.style.setProperty('--color-correct', theme.colors.correct);
    root.style.setProperty('--color-incorrect', theme.colors.incorrect);
    root.style.setProperty('--color-border', theme.colors.border);
    root.style.setProperty('--color-highlight', theme.colors.highlight);
  };

  const updateSetting = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettingsState(prev => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      if (key === 'theme') {
        applyThemeCss(value as ThemeId);
      }
      return next;
    });
  }, []);

  const setTheme = (theme: ThemeId) => updateSetting('theme', theme);
  const setFont = (font: FontFamily) => updateSetting('font', font);
  const setSwitchSound = (s: SwitchSound) => updateSetting('switchSound', s);
  const setSoundVolume = (v: number) => updateSetting('soundVolume', v);
  const setAmbientSound = (a: AmbientSound) => updateSetting('ambientSound', a);
  const setAmbientVolume = (v: number) => updateSetting('ambientVolume', v);
  const setCaretStyle = (c: CaretStyle) => updateSetting('caretStyle', c);
  const toggleZenMode = () => updateSetting('zenMode', !settings.zenMode);

  return {
    settings,
    mounted,
    setTheme,
    setFont,
    setSwitchSound,
    setSoundVolume,
    setAmbientSound,
    setAmbientVolume,
    setCaretStyle,
    toggleZenMode,
    updateSetting
  };
}
