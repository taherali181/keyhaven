'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { spring } from '@/lib/motion';
import { openSectionSettings } from '@/lib/reader-events';

export interface SectionTab<T extends string> { id: T; label: string }
/** A small figure in a section's title bar, e.g. a personal best. `up` and `down` colour a change. */
export interface SectionFact { label: string; value: string; tone?: 'up' | 'down' }

/** The gear that opens a section's settings sheet, after a hairline divider. */
export function SettingsTab({ label }: { label: string }) {
  return <>
    <span className="kh-tabs-divider" aria-hidden="true" />
    <button type="button" className="kh-tab kh-tab-icon" onClick={openSectionSettings} aria-label={`${label} settings`} title={`${label} settings`}>
      <SlidersHorizontal aria-hidden="true" />
    </button>
  </>;
}

/** Live figures beside a section's title. */
export function SectionFacts({ facts }: { facts: SectionFact[] }) {
  return <dl className="kh-facts">
    {facts.map(fact => <div key={fact.label} className={fact.tone ? `is-${fact.tone}` : undefined}><dt>{fact.label}</dt><dd title={fact.value}>{fact.value}</dd></div>)}
  </dl>;
}

/**
 * A section's glass title bar, matching Read and Quotes: the title and a few live facts on the left, and a control
 * box on the right with the tabs (the active pill slides between them) and, with `settingsLabel`, the settings gear.
 */
export function SectionHeader<T extends string>({ eyebrow, title, description, facts, tabs, active, onChange, layoutId, settingsLabel, children }: {
  eyebrow: string;
  title: string;
  description?: string;
  facts?: SectionFact[];
  tabs?: Array<SectionTab<T>>;
  active?: T;
  onChange?: (id: T) => void;
  layoutId?: string;
  settingsLabel?: string;
  children?: React.ReactNode;
}) {
  return <header className="kh-bar-row">
    <div className="kh-bar glass">
      <div className="kh-bar-title">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {facts?.length ? <SectionFacts facts={facts} /> : description && <p className="kh-bar-description">{description}</p>}
    </div>
    {(tabs || children || settingsLabel) && <div className="kh-side glass">
      {children}
      {tabs && <nav className="kh-tabs" aria-label={`${title} views`}>
        {tabs.map(tab => <button key={tab.id} type="button" className="kh-tab" aria-current={tab.id === active ? 'page' : undefined} onClick={() => onChange?.(tab.id)}>
          {tab.id === active && <motion.span layoutId={layoutId ?? `${title}-tab`} className="kh-tab-pill" transition={spring.snappy} />}
          <span>{tab.label}</span>
        </button>)}
      </nav>}
      {settingsLabel && <SettingsTab label={settingsLabel} />}
    </div>}
  </header>;
}
