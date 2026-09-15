'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { spring } from '@/lib/motion';

export interface SegmentedOption<T extends string | number> { value: T; label: string }

/** A compact group of mutually exclusive choices; the active pill slides between them. */
export function Segmented<T extends string | number>({ label, value, options, onChange, layoutId }: {
  label: string;
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  layoutId: string;
}) {
  return <div className="kh-segmented" role="group" aria-label={label}>
    {options.map(option => {
      const active = option.value === value;
      return <button key={String(option.value)} type="button" className="kh-seg" aria-pressed={active} onClick={() => onChange(option.value)}>
        {active && <motion.span layoutId={layoutId} className="kh-seg-pill" transition={spring.snappy} />}
        <span>{option.label}</span>
      </button>;
    })}
  </div>;
}
