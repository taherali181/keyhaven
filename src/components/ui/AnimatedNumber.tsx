'use client';

import React, { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

/** Counts up to a value with a soft spring. For results and summaries only, never live typing stats. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(reduce ? value : 0);
  const rounded = useTransform(motionValue, latest => String(Math.round(latest)));

  useEffect(() => {
    if (reduce) { motionValue.set(value); return; }
    const controls = animate(motionValue, value, { type: 'spring', stiffness: 120, damping: 20 });
    return () => controls.stop();
  }, [value, reduce, motionValue]);

  return <span className={className}>
    <span className="sr-only">{value}</span>
    <motion.span aria-hidden="true">{rounded}</motion.span>
  </span>;
}
