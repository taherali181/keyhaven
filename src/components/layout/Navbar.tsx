'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen, Focus, Gamepad2, GraduationCap, Menu, Moon, PanelLeftClose,
  Quote, Settings2, Sun, Timer, User, Volume2, X
} from 'lucide-react';
import { CaretStyle, SwitchSound, ThemeId, TypingMode, UserSettings } from '@/types';
import { useSidebarPinned } from '@/hooks/useSidebarPinned';
import { fade, slideInLeft, slideInRight, spring } from '@/lib/motion';
import { BrandIcon, BrandLogo } from '@/components/ui/BrandLogo';
import { GlassSelect } from '@/components/ui/GlassSelect';

interface NavbarProps {
  currentMode: TypingMode;
  onSelectMode: (mode: TypingMode) => void;
  settings: UserSettings;
  onUpdateTheme: (theme: ThemeId) => void;
  onUpdateSwitchSound: (sound: SwitchSound) => void;
  onUpdateCaretStyle: (caret: CaretStyle) => void;
  onUpdateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  onToggleZenMode: () => void;
}

const sections: Array<{ label: string; mode: TypingMode; icon: React.ReactNode }> = [
  { label: 'Read', mode: 'stories', icon: <BookOpen /> },
  { label: 'Quotes', mode: 'quotes', icon: <Quote /> },
  { label: 'Academy', mode: 'learn', icon: <GraduationCap /> },
  { label: 'Speed', mode: 'speed-test', icon: <Timer /> },
  { label: 'Arcade', mode: 'arcade', icon: <Gamepad2 /> }
];

const SHORTCUT_LABEL = 'Ctrl \\';
// Hover intent: a short delay before peeking so a quick flick to the screen edge doesn't open it,
// and a longer one before hiding so briefly overshooting the sidebar doesn't snap it shut.
const PEEK_OPEN_DELAY = 70;
const PEEK_CLOSE_DELAY = 320;

export const Navbar: React.FC<NavbarProps> = props => {
  const { currentMode, onSelectMode, settings } = props;
  // Pinned: the sidebar stays open and the content makes room for it.
  // Unpinned (default): it hides, and "peeks" over the content while the pointer is at the left edge.
  const [pinned, setPinned] = useSidebarPinned();
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef<number | undefined>(undefined);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const peeking = !pinned && peek;
  const hidden = !pinned && !peek;

  const schedulePeek = (open: boolean, delay: number) => {
    window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(() => setPeek(open), delay);
  };
  const pin = (next: boolean) => {
    window.clearTimeout(peekTimer.current);
    setPeek(false);
    setPinned(next);
  };

  useEffect(() => () => window.clearTimeout(peekTimer.current), []);

  // Only pinning changes the layout; peeking overlays, so the content never moves on hover.
  useEffect(() => {
    document.documentElement.dataset.sidebar = settings.zenMode ? 'zen' : pinned ? 'open' : 'hidden';
  }, [pinned, settings.zenMode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileOpen(false); setSettingsOpen(false); setPeek(false); }
      if ((event.ctrlKey || event.metaKey) && event.key === '\\' && !settings.zenMode) {
        event.preventDefault();
        window.clearTimeout(peekTimer.current);
        setPeek(false);
        setPinned(!pinned);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pinned, setPinned, settings.zenMode]);

  const choose = (mode: TypingMode) => {
    onSelectMode(mode);
    setMobileOpen(false);
    setSettingsOpen(false);
  };

  if (settings.zenMode) {
    return <button onClick={props.onToggleZenMode} className="focus-exit glass" title="Exit focus mode"><Focus /></button>;
  }

  // Rendered twice (desktop sidebar + mobile drawer); scope keeps their layoutIds apart.
  const renderNav = (scope: 'desktop' | 'mobile') => (
    <>
      <div className="sidebar-brand">
        <button className="brand-home" onClick={() => choose('stories')} aria-label="KeyHaven home"><BrandLogo /></button>
        <div className="sidebar-brand-actions">
          <button
            className="sidebar-icon-button"
            onClick={() => props.onUpdateTheme(settings.theme === 'reading-room' ? 'daylight' : 'reading-room')}
            aria-label={`Switch to ${settings.theme === 'reading-room' ? 'light' : 'dark'} theme`}
            title={settings.theme === 'reading-room' ? 'Switch to daylight' : 'Switch to reading room'}
          >
            {settings.theme === 'reading-room' ? <Sun /> : <Moon />}
          </button>
          {scope === 'desktop' && (
            <button
              className="sidebar-icon-button"
              onClick={() => pin(false)}
              aria-label="Hide sidebar"
              title={`Hide sidebar (${SHORTCUT_LABEL})`}
            >
              <PanelLeftClose />
            </button>
          )}
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        <p className="sidebar-section-label">Practice</p>
        {sections.map(item => {
          const active = currentMode === item.mode;
          return (
            <button key={item.label} className={`sidebar-link ${active ? 'active' : ''}`} onClick={() => choose(item.mode)} aria-current={active ? 'page' : undefined}>
              {active && <motion.span layoutId={`${scope}-nav-pill`} className="sidebar-pill" transition={spring.snappy} />}
              {item.icon}<span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <button className="sidebar-link" onClick={() => setSettingsOpen(true)} title="Settings"><Settings2 /><span>Settings</span></button>
        <button className={`sidebar-link ${currentMode === 'profile' ? 'active' : ''}`} onClick={() => choose('profile')} title="Profile and progress">
          {currentMode === 'profile' && <motion.span layoutId={`${scope}-nav-pill`} className="sidebar-pill" transition={spring.snappy} />}
          <User /><span>My progress</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside
        className="app-sidebar glass glass-panel"
        inert={hidden}
        data-peek={peeking ? 'true' : undefined}
        style={{ viewTransitionName: 'app-sidebar' }}
        onPointerEnter={() => { if (!pinned) schedulePeek(true, 0); }}
        onPointerLeave={() => { if (!pinned) schedulePeek(false, PEEK_CLOSE_DELAY); }}
      >{renderNav('desktop')}</aside>

      {/* Invisible strip along the left edge: resting the pointer here peeks the sidebar in. */}
      {!pinned && (
        <div
          className="sidebar-hotzone"
          aria-hidden="true"
          onPointerEnter={() => schedulePeek(true, PEEK_OPEN_DELAY)}
          onPointerLeave={() => schedulePeek(false, peek ? PEEK_CLOSE_DELAY : 0)}
        />
      )}

      <AnimatePresence>
        {hidden && (
          <motion.button
            key="sidebar-trigger"
            className="sidebar-dock glass"
            onClick={() => pin(true)}
            aria-label="Pin sidebar"
            title={`Pin sidebar open (${SHORTCUT_LABEL})`}
            initial={{ opacity: 0, x: -12, scale: 0.88 }}
            animate={{ opacity: 1, x: 0, scale: 1, transition: spring.snappy }}
            exit={{ opacity: 0, x: -10, scale: 0.88, transition: { duration: 0.14 } }}
          >
            <BrandIcon size={22} />
          </motion.button>
        )}
      </AnimatePresence>

      <header className="mobile-bar glass glass-pill">
        <button onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button>
        <button className="brand-home" onClick={() => choose('stories')} aria-label="KeyHaven home"><BrandLogo /></button>
        <button onClick={() => choose('profile')} aria-label="Profile and progress"><User /></button>
      </header>

      <AnimatePresence>
        {mobileOpen && <motion.div key="mobile-scrim" className="mobile-scrim" variants={fade} initial="hidden" animate="show" exit="exit" onClick={() => setMobileOpen(false)} />}
        {mobileOpen && (
          <motion.aside key="mobile-drawer" className="mobile-drawer glass glass-panel" variants={slideInLeft} initial="hidden" animate="show" exit="exit">
            <button className="drawer-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button>
            {renderNav('mobile')}
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && <motion.div key="settings-scrim" className="panel-scrim" variants={fade} initial="hidden" animate="show" exit="exit" onClick={() => setSettingsOpen(false)} />}
        {settingsOpen && (
          <motion.aside key="settings-panel" className="settings-panel glass glass-panel" aria-label="Settings" variants={slideInRight} initial="hidden" animate="show" exit="exit">
            <SettingsPanel {...props} onClose={() => setSettingsOpen(false)} onProgress={() => choose('profile')} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

function SettingsPanel(props: NavbarProps & { onClose: () => void; onProgress: () => void }) {
  const { settings } = props;
  const caretOptions: Array<{ value: CaretStyle; label: string }> = [
    { value: 'smooth', label: 'Smooth' },
    { value: 'bar', label: 'Bar' },
    { value: 'block', label: 'Block' },
    { value: 'underline', label: 'Underline' },
    { value: 'glow', label: 'Glow' }
  ];

  const soundOptions: Array<{ value: SwitchSound; label: string }> = [
    { value: 'off', label: 'Off' },
    { value: 'holy-panda', label: 'Holy Panda' },
    { value: 'cherry-blue', label: 'Cherry Blue' },
    { value: 'gateron-brown', label: 'Gateron Brown' },
    { value: 'cherry-red', label: 'Cherry Red' },
    { value: 'typewriter', label: 'Typewriter' },
    { value: 'raindrop', label: 'Raindrop' }
  ];

  return <div className="settings-stack">
    <header><div><p className="eyebrow">Your space</p><h2>Settings</h2></div><button onClick={props.onClose} aria-label="Close settings"><X /></button></header>
    <details open><summary>Typing</summary><div className="setting-group">
      <label>Caret
        <GlassSelect
          value={settings.caretStyle}
          options={caretOptions}
          onChange={props.onUpdateCaretStyle}
        />
      </label>
      <label className="toggle-row">Strict typing<input type="checkbox" checked={settings.strictMode} onChange={event => props.onUpdateSetting('strictMode', event.target.checked)} /></label>
      <label className="toggle-row">Show live WPM<input type="checkbox" checked={settings.showLiveWpm} onChange={event => props.onUpdateSetting('showLiveWpm', event.target.checked)} /></label>
    </div></details>
    <details><summary>Sound</summary><div className="setting-group">
      <label>
        <span className="label-icon"><Volume2 />Key sound</span>
        <GlassSelect
          value={settings.switchSound}
          options={soundOptions}
          onChange={props.onUpdateSwitchSound}
        />
      </label>
      <label className="toggle-row">Mute all sound<input type="checkbox" checked={settings.muted} onChange={event => props.onUpdateSetting('muted', event.target.checked)} /></label>
    </div></details>
    <p className="settings-note">Themes, fonts, scenery and background sound are in <strong>Reading settings</strong> on any Read page.</p>
    <div className="settings-actions">
      <button className="quiet-action" onClick={props.onToggleZenMode}><Focus />Enter focus mode</button>
      <button className="quiet-action" onClick={props.onProgress}><User />Open my progress</button>
    </div>
  </div>;
}
