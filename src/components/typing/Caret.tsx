'use client';

import React from 'react';
import { CaretStyle } from '@/types';

interface CaretProps {
  style?: CaretStyle;
}

export const Caret: React.FC<CaretProps> = ({ style = 'smooth' }) => {
  switch (style) {
    case 'block':
      return (
        <span 
          className="inline-block w-[0.6em] h-[1.1em] -mb-[0.15em] bg-[var(--color-caret)] opacity-75 animate-pulse rounded-xs"
        />
      );
    case 'underline':
      return (
        <span 
          className="inline-block w-[0.6em] h-[3px] -mb-[0.2em] bg-[var(--color-caret)] animate-pulse"
        />
      );
    case 'glow':
      return (
        <span 
          className="inline-block w-[3px] h-[1.2em] -mb-[0.2em] bg-[var(--color-caret)] shadow-[0_0_8px_var(--color-caret)] animate-pulse rounded-full"
        />
      );
    case 'bar':
      return (
        <span 
          className="inline-block w-[2px] h-[1.2em] -mb-[0.2em] bg-[var(--color-caret)]"
        />
      );
    case 'smooth':
    default:
      return (
        <span 
          className="inline-block w-[2.5px] h-[1.25em] -mb-[0.2em] bg-[var(--color-caret)] transition-all duration-100 ease-out animate-pulse rounded-full"
        />
      );
  }
};
