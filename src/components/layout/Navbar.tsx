'use client';

import React, { useEffect, useState } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, Focus, Gamepad2, GraduationCap,
  Menu, Moon, Settings2, Sun, Timer, User, Volume2, X
} from 'lucide-react';
import { AmbientSound, CaretStyle, FontFamily, ReaderBackground, SwitchSound, ThemeId, TypingMode, UserSettings } from '@/types';
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

const sections: Array<{ label: string; mode: TypingMode; icon: React.ReactNode }> = [
  { label: 'Read', mode: 'stories', icon: <BookOpen /> },
  { label: 'Academy', mode: 'learn', icon: <GraduationCap /> },
  { label: 'Speed', mode: 'speed-test', icon: <Timer /> },
  { label: 'Arcade', mode: 'arcade', icon: <Gamepad2 /> }
];

const readModes: Array<{ label: string; mode: TypingMode }> = [
  { label: 'Stories', mode: 'stories' },
  { label: 'Quotes', mode: 'quotes' },
  { label: 'Library', mode: 'library' }
];

const backgrounds: Array<{ id: ReaderBackground; label: string }> = [
  { id: 'none', label: 'Quiet paper' },
  { id: 'cherry-blossoms', label: 'Cherry blossoms' },
  { id: 'misty-mountains', label: 'Misty mountains' },
  { id: 'quiet-lake', label: 'Quiet lake' },
  { id: 'soft-forest', label: 'Soft forest' }
];

export const Navbar: React.FC<NavbarProps> = props => {
  const { currentMode, onSelectMode, settings } = props;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const readActive = ['stories', 'quotes', 'library'].includes(currentMode);

  useEffect(() => {
    document.documentElement.dataset.sidebar = collapsed ? 'compact' : 'open';
    return () => { delete document.documentElement.dataset.sidebar; };
  }, [collapsed]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileOpen(false); setSettingsOpen(false); }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);

  const choose = (mode: TypingMode) => {
    onSelectMode(mode);
    setMobileOpen(false);
    setSettingsOpen(false);
  };

  if (settings.zenMode) {
    return <button onClick={props.onToggleZenMode} className="focus-exit" title="Exit focus mode"><Focus /></button>;
  }

  const sidebar = (
    <>
      <div className="sidebar-wordmark" aria-label="KeyHaven"><span>KeyHaven</span></div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {sections.map(item => {
          const active = item.mode === 'stories' ? readActive : currentMode === item.mode;
          return (
            <div key={item.label}>
              <button className={`sidebar-link ${active ? 'active' : ''}`} onClick={() => choose(item.mode)} title={collapsed ? item.label : undefined}>
                {item.icon}<span>{item.label}</span>
              </button>
              {item.mode === 'stories' && readActive && !collapsed && <div className="sidebar-subnav">{readModes.map(read => <button key={read.mode} className={currentMode === read.mode ? 'active' : ''} onClick={() => choose(read.mode)}>{read.label}</button>)}</div>}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <button className="sidebar-link" onClick={() => setSettingsOpen(true)} title="Settings"><Settings2 /><span>Settings</span></button>
        <button className={`sidebar-link ${currentMode === 'profile' ? 'active' : ''}`} onClick={() => choose('profile')} title="Profile and progress"><User /><span>My progress</span></button>
        <button className="sidebar-collapse" onClick={() => setCollapsed(value => !value)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight /> : <ChevronLeft />}<span>{collapsed ? '' : 'Collapse'}</span></button>
      </div>
    </>
  );

  return (
    <>
      <aside className={`app-sidebar ${collapsed ? 'is-collapsed' : ''}`}>{sidebar}</aside>
      <header className="mobile-bar"><button onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button><span>KeyHaven</span><button onClick={() => choose('profile')} aria-label="Profile and progress"><User /></button></header>
      {mobileOpen && <div className="mobile-scrim" onClick={() => setMobileOpen(false)}><aside className="mobile-drawer" onClick={event => event.stopPropagation()}><button className="drawer-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button>{sidebar}</aside></div>}
      {settingsOpen && <div className="panel-scrim" onClick={() => setSettingsOpen(false)}><aside className="settings-panel" onClick={event => event.stopPropagation()} aria-label="Settings"><SettingsPanel {...props} onClose={() => setSettingsOpen(false)} onProgress={() => choose('profile')} /></aside></div>}
    </>
  );
};

function SettingsPanel(props: NavbarProps & { onClose: () => void; onProgress: () => void }) {
  const { settings } = props;
  return <div className="settings-stack">
    <header><div><p className="eyebrow">Your space</p><h2>Settings</h2></div><button onClick={props.onClose} aria-label="Close settings"><X /></button></header>
    <details open><summary>Reading</summary><div className="setting-group">
      <label>Typeface<select value={settings.font} onChange={event => props.onUpdateFont(event.target.value as FontFamily)}>{(Object.keys(FONTS) as FontFamily[]).filter(font => font !== 'fira').map(font => <option value={font} key={font}>{FONTS[font].name}</option>)}</select></label>
      <label>Text size<select value={settings.fontSize} onChange={event => props.onUpdateSetting('fontSize', event.target.value as UserSettings['fontSize'])}><option value="sm">Small</option><option value="base">Comfortable</option><option value="lg">Large</option><option value="xl">Extra large</option></select></label>
      <label>Page width<select value={settings.readerWidth} onChange={event => props.onUpdateSetting('readerWidth', event.target.value as UserSettings['readerWidth'])}><option value="narrow">Narrow</option><option value="balanced">Balanced</option><option value="wide">Wide</option></select></label>
      <label>Page tone<select value={settings.readerPaper} onChange={event => props.onUpdateSetting('readerPaper', event.target.value as UserSettings['readerPaper'])}><option value="system">Match theme</option><option value="paper">Soft paper</option><option value="sepia">Sepia</option><option value="night">Night</option></select></label>
      <label>Line spacing<input type="range" min="1.5" max="2.2" step="0.1" value={settings.readerLineHeight} onChange={event => props.onUpdateSetting('readerLineHeight', Number(event.target.value))} /></label>
      <label>Scenery<select value={settings.readerBackground} onChange={event => props.onUpdateSetting('readerBackground', event.target.value as ReaderBackground)}>{backgrounds.map(background => <option key={background.id} value={background.id}>{background.label}</option>)}</select></label>
      {settings.readerBackground !== 'none' && <><label>Readability veil<input type="range" min="55" max="95" value={settings.readerOverlay} onChange={event => props.onUpdateSetting('readerOverlay', Number(event.target.value))} /></label><label>Soft focus<input type="range" min="0" max="8" value={settings.readerBlur} onChange={event => props.onUpdateSetting('readerBlur', Number(event.target.value))} /></label></>}
    </div></details>
    <details><summary>Typing</summary><div className="setting-group">
      <label>Caret<select value={settings.caretStyle} onChange={event => props.onUpdateCaretStyle(event.target.value as CaretStyle)}>{(['smooth', 'bar', 'block', 'underline', 'glow'] as CaretStyle[]).map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="toggle-row">Strict typing<input type="checkbox" checked={settings.strictMode} onChange={event => props.onUpdateSetting('strictMode', event.target.checked)} /></label>
      <label className="toggle-row">Show live WPM<input type="checkbox" checked={settings.showLiveWpm} onChange={event => props.onUpdateSetting('showLiveWpm', event.target.checked)} /></label>
    </div></details>
    <details><summary>Sound</summary><div className="setting-group"><label><span className="label-icon"><Volume2 />Key sound</span><select value={settings.switchSound} onChange={event => props.onUpdateSwitchSound(event.target.value as SwitchSound)}>{['off', 'holy-panda', 'cherry-blue', 'gateron-brown', 'cherry-red', 'typewriter', 'raindrop'].map(value => <option key={value} value={value}>{value.replaceAll('-', ' ')}</option>)}</select></label><label>Ambient<select value={settings.ambientSound} onChange={event => props.onUpdateAmbientSound(event.target.value as AmbientSound)}>{['none', 'rain', 'fireplace', 'cafe', 'forest', 'zen-river', 'alpha-waves'].map(value => <option key={value}>{value.replaceAll('-', ' ')}</option>)}</select></label></div></details>
    <button className="quiet-action" onClick={props.onToggleZenMode}><Focus />Enter focus mode</button>
    <button className="quiet-action" onClick={props.onProgress}><User />Open my progress</button>
    <button className="theme-action" onClick={() => props.onUpdateTheme(settings.theme === 'reading-room' ? 'daylight' : 'reading-room')}>{settings.theme === 'reading-room' ? <Sun /> : <Moon />}Switch to {settings.theme === 'reading-room' ? 'light' : 'dark'}</button>
  </div>;
}
