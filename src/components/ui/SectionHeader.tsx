'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { spring } from '@/lib/motion';
import { openSectionSettings } from '@/lib/reader-events';

export interface SectionTab<T extends string> { id: T; label: string }

/** The gear that opens a section's settings sheet, as the last segment of a glass tab capsule. */
export function SettingsTab({ label }: { label: string }) {
  return <>
    <span className="kh-tabs-divider" aria-hidden="true" />
    <button type="button" className="kh-tab kh-tab-icon" onClick={openSectionSettings} aria-label={`${label} settings`} title={`${label} settings`}>
      <SlidersHorizontal aria-hidden="true" />
    </button>
  </>;
}

/**
 * A section's display title with glass tabs; the active pill slides between tabs. With `settingsLabel`, a gear at
 * the end of the tabs opens the section's settings sheet.
 */
export function SectionHeader<T extends string>({ eyebrow, title, description, tabs, active, onChange, layoutId, settingsLabel, children }: {
  eyebrow: string;
  title: string;
  description?: string;
  tabs?: Array<SectionTab<T>>;
  active?: T;
  onChange?: (id: T) => void;
  layoutId?: string;
  settingsLabel?: string;
  children?: React.ReactNode;
}) {
  return <header className="kh-section-header">
    <div className="kh-section-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description && <p className="kh-section-description">{description}</p>}
    </div>
    {(tabs || children) && <div className="kh-section-side">
      {children}
      {tabs && <nav className="kh-tabs" aria-label={`${title} views`}>
        {tabs.map(tab => <button key={tab.id} type="button" className="kh-tab" aria-current={tab.id === active ? 'page' : undefined} onClick={() => onChange?.(tab.id)}>
          {tab.id === active && <motion.span layoutId={layoutId ?? `${title}-tab`} className="kh-tab-pill" transition={spring.snappy} />}
          <span>{tab.label}</span>
        </button>)}
        {settingsLabel && <SettingsTab label={settingsLabel} />}
      </nav>}
    </div>}
  </header>;
}
