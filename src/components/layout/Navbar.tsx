'use client';

import React, { useState } from 'react';
import { 
  BookOpen, 
  Zap, 
  Quote as QuoteIcon, 
  Library, 
  GraduationCap, 
  Gamepad2, 
  Trophy, 
  User, 
  Volume2, 
  VolumeX, 
  Palette, 
  Type, 
  Eye, 
  EyeOff,
  CloudRain,
  Settings,
  ChevronDown
} from 'lucide-react';
import { TypingMode, ThemeId, SwitchSound, AmbientSound, FontFamily, CaretStyle, UserSettings } from '@/types';
import { THEMES, FONTS } from '@/lib/themes';

interface NavbarProps {
  currentMode: TypingMode;
  onSelectMode: (mode: TypingMode) => void;
  settings: UserSettings;
  onUpdateTheme: (theme: ThemeId) => void;
  onUpdateFont: (font: FontFamily) => void;
  onUpdateSwitchSound: (s: SwitchSound) => void;
  onUpdateSoundVolume: (v: number) => void;
  onUpdateAmbientSound: (a: AmbientSound) => void;
  onUpdateAmbientVolume: (v: number) => void;
  onUpdateCaretStyle: (c: CaretStyle) => void;
  onToggleZenMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onSelectMode,
  settings,
  onUpdateTheme,
  onUpdateFont,
  onUpdateSwitchSound,
  onUpdateSoundVolume,
  onUpdateAmbientSound,
  onUpdateAmbientVolume,
  onUpdateCaretStyle,
  onToggleZenMode
}) => {
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);

  const navItems: { mode: TypingMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'stories', label: 'Stories', icon: <BookOpen className="w-4 h-4" /> },
    { mode: 'speed-test', label: 'Speed Test', icon: <Zap className="w-4 h-4" /> },
    { mode: 'quotes', label: 'Quotes', icon: <QuoteIcon className="w-4 h-4" /> },
    { mode: 'library', label: 'Great Library', icon: <Library className="w-4 h-4" /> },
    { mode: 'learn', label: 'Academy', icon: <GraduationCap className="w-4 h-4" /> },
    { mode: 'arcade', label: 'Arcade', icon: <Gamepad2 className="w-4 h-4" /> },
    { mode: 'leaderboard', label: 'Ranks', icon: <Trophy className="w-4 h-4" /> },
    { mode: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> }
  ];

  const switchSounds: { id: SwitchSound; label: string }[] = [
    { id: 'off', label: 'Muted (Off)' },
    { id: 'holy-panda', label: 'Holy Panda (Deep Thock)' },
    { id: 'cherry-blue', label: 'Cherry MX Blue (Clicky)' },
    { id: 'gateron-brown', label: 'Gateron Brown (Tactile)' },
    { id: 'cherry-red', label: 'Cherry Red (Linear)' },
    { id: 'typewriter', label: 'Vintage Typewriter & Bell' },
    { id: 'raindrop', label: 'Raindrops (Plop)' }
  ];

  const ambientSounds: { id: AmbientSound; label: string }[] = [
    { id: 'none', label: 'None (Silent)' },
    { id: 'rain', label: 'Gentle Rain' },
    { id: 'fireplace', label: 'Cozy Fireplace' },
    { id: 'forest', label: 'Forest Wind' },
    { id: 'alpha-waves', label: 'Alpha Waves (Deep Focus)' },
    { id: 'zen-river', label: 'Zen River Flow' }
  ];

  if (settings.zenMode) {
    return (
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={onToggleZenMode}
          title="Exit Zen Mode"
          className="p-2.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--color-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-lg transition-all cursor-pointer opacity-40 hover:opacity-100"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <header className="w-full border-b border-[var(--color-border)] bg-[var(--bg-primary)]/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div 
          onClick={() => onSelectMode('stories')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-secondary)] flex items-center justify-center text-white font-serif font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
            K
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg text-[var(--text-primary)] tracking-tight flex items-center gap-1.5">
              KeyHaven
            </h1>
            <p className="text-[10px] text-[var(--text-muted)] -mt-1 hidden sm:block">
              Relax, Read & Type
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map(item => {
            const isActive = currentMode === item.mode;
            return (
              <button
                key={item.mode}
                onClick={() => onSelectMode(item.mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--bg-secondary)] text-[var(--color-accent)] border border-[var(--color-border)] font-semibold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Controls & Settings */}
        <div className="flex items-center gap-2">
          {/* Audio Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowAudioMenu(!showAudioMenu);
                setShowThemeMenu(false);
                setShowFontMenu(false);
              }}
              className={`p-2 rounded-xl border text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                settings.switchSound !== 'off' || settings.ambientSound !== 'none'
                  ? 'bg-[var(--bg-secondary)] border-[var(--color-border)] text-[var(--color-accent)]'
                  : 'bg-transparent border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Sound & Ambience Settings"
            >
              {settings.ambientSound !== 'none' ? (
                <CloudRain className="w-4 h-4 animate-pulse" />
              ) : settings.switchSound !== 'off' ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {showAudioMenu && (
              <div 
                className="absolute right-0 mt-2 w-72 p-4 rounded-2xl border shadow-xl z-50 animate-in fade-in slide-in-from-top-2"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)] mb-3">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Audio & Ambience
                  </span>
                  <button
                    onClick={() => setShowAudioMenu(false)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Key Switch Sound */}
                <div className="mb-4">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1.5">
                    Mechanical Switch Audio
                  </label>
                  <select
                    value={settings.switchSound}
                    onChange={e => onUpdateSwitchSound(e.target.value as SwitchSound)}
                    className="w-full text-xs p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--color-border)] text-[var(--text-primary)] outline-none"
                  >
                    {switchSounds.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>

                  {settings.switchSound !== 'off' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-[var(--text-muted)]">Volume:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.soundVolume}
                        onChange={e => onUpdateSoundVolume(parseFloat(e.target.value))}
                        className="w-full accent-[var(--color-accent)] h-1 rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Ambient Sound */}
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1.5">
                    Relaxing Background Ambience
                  </label>
                  <select
                    value={settings.ambientSound}
                    onChange={e => onUpdateAmbientSound(e.target.value as AmbientSound)}
                    className="w-full text-xs p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--color-border)] text-[var(--text-primary)] outline-none"
                  >
                    {ambientSounds.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>

                  {settings.ambientSound !== 'none' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-[var(--text-muted)]">Volume:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.ambientVolume}
                        onChange={e => onUpdateAmbientVolume(parseFloat(e.target.value))}
                        className="w-full accent-[var(--color-accent)] h-1 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowThemeMenu(!showThemeMenu);
                setShowAudioMenu(false);
                setShowFontMenu(false);
              }}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--color-border)] transition-all cursor-pointer"
              title="Select Aesthetic Theme"
            >
              <Palette className="w-4 h-4" />
            </button>

            {showThemeMenu && (
              <div 
                className="absolute right-0 mt-2 w-64 p-3 rounded-2xl border shadow-xl z-50 grid grid-cols-1 gap-1 max-h-96 overflow-y-auto"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div className="px-2 py-1 text-xs font-bold text-[var(--text-primary)] border-b border-[var(--color-border)] mb-1">
                  Themes ({Object.keys(THEMES).length})
                </div>
                {Object.values(THEMES).map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onUpdateTheme(t.id);
                      setShowThemeMenu(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                      settings.theme === t.id
                        ? 'bg-[var(--bg-secondary)] text-[var(--color-accent)] font-semibold border border-[var(--color-border)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{t.category}</div>
                    </div>
                    <div className="flex gap-1">
                      <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: t.colors.bg }} />
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.colors.accent }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font & Caret Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowFontMenu(!showFontMenu);
                setShowAudioMenu(false);
                setShowThemeMenu(false);
              }}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--color-border)] transition-all cursor-pointer"
              title="Typography & Caret"
            >
              <Type className="w-4 h-4" />
            </button>

            {showFontMenu && (
              <div 
                className="absolute right-0 mt-2 w-64 p-3 rounded-2xl border shadow-xl z-50"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div className="px-2 py-1 text-xs font-bold text-[var(--text-primary)] border-b border-[var(--color-border)] mb-2">
                  Typography & Caret
                </div>
                
                <div className="mb-3">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                    Font Family
                  </label>
                  <div className="grid grid-cols-1 gap-1">
                    {(Object.keys(FONTS) as FontFamily[]).map(f => (
                      <button
                        key={f}
                        onClick={() => onUpdateFont(f)}
                        className={`p-1.5 px-2 rounded-lg text-xs text-left transition-all cursor-pointer ${
                          settings.font === f
                            ? 'bg-[var(--bg-secondary)] text-[var(--color-accent)] font-semibold'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                        }`}
                      >
                        {FONTS[f].name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                    Caret Style
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {(['smooth', 'block', 'underline', 'glow', 'bar'] as CaretStyle[]).map(c => (
                      <button
                        key={c}
                        onClick={() => onUpdateCaretStyle(c)}
                        className={`p-1.5 rounded-lg text-xs capitalize text-center transition-all cursor-pointer ${
                          settings.caretStyle === c
                            ? 'bg-[var(--bg-secondary)] text-[var(--color-accent)] font-semibold border border-[var(--color-border)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zen Mode Toggle */}
          <button
            onClick={onToggleZenMode}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--color-border)] transition-all cursor-pointer"
            title="Toggle Zen Mode (Hide navigation)"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="lg:hidden flex items-center gap-1 px-4 py-2 border-t border-[var(--color-border)] overflow-x-auto">
        {navItems.map(item => {
          const isActive = currentMode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => onSelectMode(item.mode)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[var(--bg-secondary)] text-[var(--color-accent)] font-semibold'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
