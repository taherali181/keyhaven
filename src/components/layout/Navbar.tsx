'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen, Focus, Gamepad2, GraduationCap, Menu, Moon, PanelLeftClose,
  Quote, Settings2, Sun, Timer, User, X
} from 'lucide-react';
import { CaretStyle, SwitchSound, ThemeId, TypingMode, UserSettings } from '@/types';
import { useSidebarPinned } from '@/hooks/useSidebarPinned';
import { fade, slideInLeft, slideInRight, spring } from '@/lib/motion';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { AppSettings } from '@/components/settings/AppSettings';
import { AccountMenu } from '@/components/layout/AccountMenu';
import { isLightTheme } from '@/lib/reader-style';

interface NavbarProps {
  currentMode: TypingMode;
  onSelectMode: (mode: TypingMode) => void;
  settings: UserSettings;
  onUpdateTheme: (theme: ThemeId) => void;
  onUpdateSwitchSound: (sound: SwitchSound) => void;
  onUpdateCaretStyle: (caret: CaretStyle) => void;
  onUpdateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  onToggleZenMode: () => void;
  onReplaceSettings: (settings: UserSettings) => void;
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
  const lightTheme = isLightTheme(settings.theme, settings.customTones);
  // Pinned: the sidebar stays open and the content makes room for it.
  // Unpinned (default): it hides, and "peeks" over the content while the pointer is at the left edge.
  const [pinned, setPinned] = useSidebarPinned();
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef<number | undefined>(undefined);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [introMobile, setIntroMobile] = useState(false);
  const peeking = !pinned && (peek || (introOpen && !introMobile));
  const hidden = !pinned && !peeking;
  const mobileVisible = mobileOpen || (introOpen && introMobile);

  useEffect(() => {
    // Reveal on each page load; navigating within the app keeps this component mounted.
    const start = window.setTimeout(() => {
      setIntroMobile(window.matchMedia('(max-width: 767px)').matches);
      setIntroOpen(true);
    }, 0);
    return () => {
      window.clearTimeout(start);
    };
  }, []);

  useEffect(() => {
    if (!introOpen) return;
    const dismiss = () => {
      window.clearTimeout(peekTimer.current);
      setIntroOpen(false);
      setPeek(false);
    };
    const onContentPointer = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('main.app-content, .mobile-scrim')) dismiss();
    };
    const expiry = window.setTimeout(dismiss, 10_000);
    document.addEventListener('pointerdown', onContentPointer);
    return () => {
      window.clearTimeout(expiry);
      document.removeEventListener('pointerdown', onContentPointer);
    };
  }, [introOpen]);

  const schedulePeek = (open: boolean, delay: number) => {
    window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(() => setPeek(open), delay);
  };
  const pin = (next: boolean) => {
    setIntroOpen(false);
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
      if (event.key === 'Escape') { setIntroOpen(false); setMobileOpen(false); setSettingsOpen(false); setPeek(false); }
      if ((event.ctrlKey || event.metaKey) && event.key === '\\' && !settings.zenMode) {
        event.preventDefault();
        window.clearTimeout(peekTimer.current);
        setPeek(false);
        setIntroOpen(false);
        setPinned(!pinned);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pinned, setPinned, settings.zenMode]);

  const choose = (mode: TypingMode) => {
    setIntroOpen(false);
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
            onClick={() => props.onUpdateTheme(lightTheme ? 'night' : 'paper')}
            aria-label={`Switch to ${lightTheme ? 'dark' : 'light'} theme`}
            title={lightTheme ? 'Switch to Night' : 'Switch to Soft paper'}
          >
            {lightTheme ? <Moon /> : <Sun />}
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
        <AccountMenu onOpenProfile={() => choose('profile')} />
        <button className="sidebar-link" onClick={() => setSettingsOpen(true)} title="Settings"><Settings2 /><span>Settings</span></button>
        <button className={`sidebar-link ${currentMode === 'profile' ? 'active' : ''}`} onClick={() => choose('profile')} aria-current={currentMode === 'profile' ? 'page' : undefined}>
          {currentMode === 'profile' && <motion.span layoutId={`${scope}-nav-pill`} className="sidebar-pill" transition={spring.snappy} />}
          <User /><span>Profile</span>
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
            <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>

      <header className="mobile-bar glass glass-pill">
        <button onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button>
        <button className="brand-home" onClick={() => choose('stories')} aria-label="KeyHaven home"><BrandLogo /></button>
        <button onClick={() => choose('profile')} aria-label="Profile"><User /></button>
      </header>

      <AnimatePresence>
        {mobileVisible && <motion.div key="mobile-scrim" className="mobile-scrim" variants={fade} initial="hidden" animate="show" exit="exit" onClick={() => { setIntroOpen(false); setMobileOpen(false); }} />}
        {mobileVisible && (
          <motion.aside key="mobile-drawer" className="mobile-drawer glass glass-panel" variants={slideInLeft} initial="hidden" animate="show" exit="exit">
            <button className="drawer-close" onClick={() => { setIntroOpen(false); setMobileOpen(false); }} aria-label="Close navigation"><X /></button>
            {renderNav('mobile')}
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && <motion.div key="settings-scrim" className="panel-scrim" variants={fade} initial="hidden" animate="show" exit="exit" onClick={() => setSettingsOpen(false)} />}
        {settingsOpen && (
          <motion.aside key="settings-panel" className="settings-panel glass glass-panel" aria-label="Settings" variants={slideInRight} initial="hidden" animate="show" exit="exit">
            <AppSettings settings={props.settings} onUpdateSetting={props.onUpdateSetting} onUpdateTheme={props.onUpdateTheme} onReplaceSettings={props.onReplaceSettings} onToggleZenMode={() => { setSettingsOpen(false); props.onToggleZenMode(); }} onOpenProfile={() => { setSettingsOpen(false); choose('profile'); }} onClose={() => setSettingsOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};
