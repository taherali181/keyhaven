'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import type { CaretStyle, FontFamily, TypingMode, UserSettings } from '@/types';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { SliderField } from '@/components/ui/SliderField';
import { FONTS } from '@/lib/themes';
import { fade, slideInRight } from '@/lib/motion';
import { SECTION_LABELS, sectionTypographyDefaults } from '@/lib/section-settings';
import { TYPE_RANGES } from '@/lib/typography';

type UpdateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;

/** Sections with their own settings sheet (Read and Quotes use the full reading settings instead). */
export type SettingsSection = 'speed-test' | 'learn' | 'arcade';

export const SECTION_SETTINGS: Record<SettingsSection, { liveStats: boolean; guide: boolean; note?: string }> = {
  'speed-test': { liveStats: true, guide: false },
  learn: { liveStats: true, guide: true },
  arcade: { liveStats: false, guide: false, note: 'Text settings apply to Ghost Racer.' }
};

export const isSettingsSection = (mode: TypingMode): mode is SettingsSection => mode in SECTION_SETTINGS;

/** Typefaces suited to typing drills: even monospace first, then clear sans and serif faces. */
const TYPING_FACES: FontFamily[] = ['jetbrains', 'jetbrains-mono', 'sans', 'inter', 'serif', 'atkinson'];

const CARETS: Array<{ value: CaretStyle; label: string }> = [
  { value: 'smooth', label: 'Smooth' }, { value: 'bar', label: 'Bar' }, { value: 'block', label: 'Block' },
  { value: 'underline', label: 'Underline' }, { value: 'glow', label: 'Glow' }
];

/**
 * A small settings sheet for Speed, Academy and Arcade: only what applies to typing there. Typeface and size are
 * saved for the section; caret and live stats are shared.
 */
export function SectionSettings({ mode, settings, onUpdateSetting, onUpdateSettings }: {
  mode: SettingsSection;
  settings: UserSettings;
  onUpdateSetting: UpdateSetting;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
}) {
  const [open, setOpen] = useState(false);
  const spec = SECTION_SETTINGS[mode];
  const label = SECTION_LABELS[mode] ?? 'Section';
  const defaults = sectionTypographyDefaults(mode);
  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.typing-input')?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  return <>
    <button type="button" className="reader-settings-trigger glass glass-pill" onClick={() => setOpen(true)} aria-label={`${label} settings`} title={`${label} settings`}>
      <SlidersHorizontal aria-hidden="true" /><span>Settings</span>
    </button>
    <AnimatePresence>
      {open && <motion.div key="section-scrim" className="rs-scrim" variants={fade} initial="hidden" animate="show" exit="exit" onClick={close} />}
      {open && <motion.aside key="section-panel" className="rs-panel section-settings glass glass-panel" role="dialog" aria-label={`${label} settings`} variants={slideInRight} initial="hidden" animate="show" exit="exit">
        <header className="rs-header">
          <h2>{label} settings</h2>
          <button type="button" onClick={close} aria-label="Close settings"><X /></button>
        </header>
        <div className="rs-body">
          <section className="rs-group">
            <header><h3>Text</h3>{spec.note && <span>{spec.note}</span>}</header>
            <div className="rs-presets section-faces" role="radiogroup" aria-label="Typeface">
              {TYPING_FACES.map(font => <button key={font} type="button" role="radio" aria-checked={settings.font === font} className="rs-preset" onClick={() => onUpdateSetting('font', font)}>
                <span className={`rs-preset-aa ${FONTS[font].class}`} aria-hidden="true">Aa</span>
                <span>{FONTS[font].name}</span>
              </button>)}
            </div>
            <div className="rs-fields section-size">
              <SliderField label="Text size" value={settings.fontSize} {...TYPE_RANGES.fontSize} defaultValue={defaults.fontSize} format={value => `${value} px`} visual="size" onChange={value => onUpdateSetting('fontSize', value)} />
            </div>
          </section>
          <section className="rs-group">
            <header><h3>Caret and feedback</h3><span>Shared with every section</span></header>
            <div className="rs-fields"><div className="setting-group">
              <div className="app-field"><span className="rs-field-label">Caret</span>
                <GlassSelect value={settings.caretStyle} options={CARETS} onChange={value => onUpdateSetting('caretStyle', value)} />
              </div>
              {spec.liveStats && <>
                <label className="toggle-row app-toggle"><span><span>Show live speed</span></span><input type="checkbox" role="switch" checked={settings.showLiveWpm} onChange={event => onUpdateSetting('showLiveWpm', event.target.checked)} /></label>
                <label className="toggle-row app-toggle"><span><span>Show live accuracy</span></span><input type="checkbox" role="switch" checked={settings.showLiveAccuracy} onChange={event => onUpdateSetting('showLiveAccuracy', event.target.checked)} /></label>
              </>}
              {spec.guide && <label className="toggle-row app-toggle"><span><span>Keyboard guide</span><small>Fingers and keys under the practice text</small></span><input type="checkbox" role="switch" checked={settings.academyGuide !== 'off'} onChange={event => onUpdateSetting('academyGuide', event.target.checked ? 'on' : 'off')} /></label>}
            </div></div>
          </section>
          <button type="button" className="rs-btn app-keys-reset" onClick={() => onUpdateSettings({ font: defaults.font, fontSize: defaults.fontSize })}><RotateCcw aria-hidden="true" />Reset text for {label}</button>
        </div>
      </motion.aside>}
    </AnimatePresence>
  </>;
}
