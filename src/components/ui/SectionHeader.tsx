'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { spring } from '@/lib/motion';

export interface SectionTab<T extends string> { id: T; label: string }

/** A section's display title with glass tabs; the active pill slides between tabs. */
export function SectionHeader<T extends string>({ eyebrow, title, description, tabs, active, onChange, layoutId, children }: {
  eyebrow: string;
  title: string;
  description?: string;
  tabs?: Array<SectionTab<T>>;
  active?: T;
  onChange?: (id: T) => void;
  layoutId?: string;
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
      </nav>}
    </div>}
  </header>;
}
