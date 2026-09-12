'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen, ChevronDown, Eye, EyeOff, Gamepad2, GraduationCap, Library,
  Moon, Palette, Quote, SlidersHorizontal, Sun, Trophy, User, Volume2, Zap
} from 'lucide-react';
import { AmbientSound, CaretStyle, FontFamily, SwitchSound, ThemeId, TypingMode, UserSettings } from '@/types';
import { FONTS } from '@/lib/themes';

interface NavbarProps {
  currentMode: TypingMode;
  onSelectMode: (mode: TypingMode) => void;
  settings: UserSettings;
  onUpdateTheme: (theme: ThemeId) => void;
  onUpdateFont: (font: FontFamily) => void;
  onUpdateSwitchSound: (sound: SwitchSound) => void;
  onUpdateSoundVolume: (volume: number) => void;
  onUpdateAmbientSound: (ambient: AmbientSound) => void;
  onUpdateAmbientVolume: (volume: number) => void;
  onUpdateCaretStyle: (caret: CaretStyle) => void;
  onUpdateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  onToggleZenMode: () => void;
}

const destinations: Record<string, Array<{ mode: TypingMode; label: string; icon: React.ReactNode }>> = {
  Practice: [
    { mode: 'stories', label: 'Stories', icon: <BookOpen /> },
    { mode: 'quotes', label: 'Quotes', icon: <Quote /> },
    { mode: 'learn', label: 'Academy', icon: <GraduationCap /> }
  ],
  Compete: [
    { mode: 'speed-test', label: 'Speed Test', icon: <Zap /> },
    { mode: 'arcade', label: 'Arcade', icon: <Gamepad2 /> },
    { mode: 'leaderboard', label: 'Leaderboards', icon: <Trophy /> }
  ],
  Progress: [{ mode: 'profile', label: 'My Progress', icon: <User /> }]
};

export const Navbar: React.FC<NavbarProps> = props => {
  const { currentMode, onSelectMode, settings } = props;
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const shellRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpenMenu(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  if (settings.zenMode) {
    return (
      <button onClick={props.onToggleZenMode} className="fixed right-5 top-5 z-50 rounded-full border border-[var(--color-border)] bg-[var(--bg-card)] p-3 text-[var(--text-secondary)] shadow-xl" title="Exit focus mode">
        <EyeOff className="h-4 w-4" />
      </button>
    );
  }

  const choose = (mode: TypingMode) => {
    onSelectMode(mode);
    setOpenMenu(null);
  };

  return (
    <header ref={shellRef} className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--bg-primary)_88%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-5 px-4 sm:px-6">
        <button onClick={() => choose('stories')} className="group flex shrink-0 items-center gap-3 text-left">
          <span className="relative grid h-9 w-9 place-items-center border border-[var(--color-accent)] text-lg font-semibold text-[var(--color-accent)] before:absolute before:inset-1 before:border before:border-[var(--color-border)]">K</span>
          <span>
            <span className="block font-serif text-xl font-semibold leading-none tracking-[-.02em]">KeyHaven</span>
            <span className="mt-1 hidden text-[9px] uppercase tracking-[.2em] text-[var(--text-muted)] sm:block">Read deeply · type beautifully</span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {Object.entries(destinations).map(([group, items]) => {
            const active = items.some(item => item.mode === currentMode);
            return (
              <div className="relative" key={group}>
                <button onClick={() => setOpenMenu(openMenu === group ? null : group)} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${active ? 'text-[var(--color-accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} aria-expanded={openMenu === group}>
                  {group}<ChevronDown className="h-3 w-3" />
                </button>
                {openMenu === group && (
                  <div className="absolute left-0 top-full mt-3 min-w-52 rounded-xl border border-[var(--color-border)] bg-[var(--bg-card)] p-2 shadow-2xl">
                    {items.map(item => (
                      <button key={item.mode} onClick={() => choose(item.mode)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors [&_svg]:h-4 [&_svg]:w-4 ${currentMode === item.mode ? 'bg-[var(--color-highlight)] text-[var(--color-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'}`}>
                        {item.icon}{item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <button onClick={() => choose('library')} className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold ${currentMode === 'library' ? 'text-[var(--color-accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            <Library className="h-4 w-4" />Library
          </button>
        </nav>

        <div className="flex items-center gap-1.5">
          <button onClick={() => props.onUpdateTheme(settings.theme === 'reading-room' ? 'daylight' : 'reading-room')} className="rounded-lg p-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--color-accent)]" title="Toggle daylight">
            {settings.theme === 'reading-room' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === 'settings' ? null : 'settings')} className="rounded-lg p-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--color-accent)]" title="Reading and typing settings">
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            {openMenu === 'settings' && (
              <div className="absolute right-0 top-full mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-[var(--color-border)] bg-[var(--bg-card)] p-5 shadow-2xl">
                <div className="mb-5 flex items-center gap-2 border-b border-[var(--color-border)] pb-3"><Palette className="h-4 w-4 text-[var(--color-accent)]" /><span className="text-xs font-bold uppercase tracking-widest">Preferences</span></div>
                <label className="mb-4 block text-[11px] text-[var(--text-secondary)]">Typeface
                  <select value={settings.font} onChange={event => props.onUpdateFont(event.target.value as FontFamily)} className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--bg-secondary)] p-2 text-xs text-[var(--text-primary)]">
                    {(Object.keys(FONTS) as FontFamily[]).filter(font => font !== 'fira').map(font => <option value={font} key={font}>{FONTS[font].name}</option>)}
                  </select>
                </label>
                <label className="mb-4 block text-[11px] text-[var(--text-secondary)]">Caret
                  <select value={settings.caretStyle} onChange={event => props.onUpdateCaretStyle(event.target.value as CaretStyle)} className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--bg-secondary)] p-2 text-xs text-[var(--text-primary)]">
                    {(['smooth', 'bar', 'block', 'underline', 'glow'] as CaretStyle[]).map(value => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <label className="mb-4 block text-[11px] text-[var(--text-secondary)]"><span className="flex items-center gap-2"><Volume2 className="h-3.5 w-3.5" />Key sound</span>
                  <select value={settings.switchSound} onChange={event => props.onUpdateSwitchSound(event.target.value as SwitchSound)} className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--bg-secondary)] p-2 text-xs text-[var(--text-primary)]">
                    {['off', 'holy-panda', 'cherry-blue', 'gateron-brown', 'cherry-red', 'typewriter', 'raindrop'].map(value => <option key={value} value={value}>{value.replaceAll('-', ' ')}</option>)}
                  </select>
                </label>
                <label className="flex items-center justify-between gap-4 border-t border-[var(--color-border)] py-3 text-xs text-[var(--text-secondary)]">Strict typing
                  <input type="checkbox" checked={settings.strictMode} onChange={event => props.onUpdateSetting('strictMode', event.target.checked)} className="accent-[var(--color-accent)]" />
                </label>
                <button onClick={props.onToggleZenMode} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><Eye className="h-4 w-4" />Enter focus mode</button>
              </div>
            )}
          </div>
          <button onClick={() => choose('profile')} className="ml-1 grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--bg-card)] text-[var(--color-accent)]" title="Account and progress"><User className="h-4 w-4" /></button>
        </div>
      </div>

      <nav className="flex w-full max-w-full gap-1 overflow-x-auto border-t border-[var(--color-border)] px-3 py-2 md:hidden" aria-label="Mobile navigation">
        {[...Object.values(destinations).flat(), { mode: 'library' as TypingMode, label: 'Library', icon: <Library /> }].map(item => (
          <button key={item.mode} onClick={() => choose(item.mode)} className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] [&_svg]:h-3.5 [&_svg]:w-3.5 ${currentMode === item.mode ? 'bg-[var(--color-highlight)] text-[var(--color-accent)]' : 'text-[var(--text-secondary)]'}`}>{item.icon}{item.label}</button>
        ))}
      </nav>
    </header>
  );
};
