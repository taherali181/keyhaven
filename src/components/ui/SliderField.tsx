'use client';

import React, { useId } from 'react';
import { Minus, Plus } from 'lucide-react';

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Double-clicking the track returns to this value. */
  defaultValue: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  hint?: string;
  visual?: 'size' | 'weight';
}

/** A labelled range with a live readout and − / + steppers for exact, one-step adjustments. */
export function SliderField({ label, value, min, max, step, defaultValue, format, onChange, hint, visual }: SliderFieldProps) {
  const id = useId();
  const decimals = (String(step).split('.')[1] ?? '').length;
  const set = (next: number) => {
    const snapped = Math.round((next - min) / step) * step + min;
    const clamped = Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals));
    if (clamped !== value) onChange(clamped);
  };
  const fill = ((value - min) / (max - min)) * 100;

  return <div className="kh-slider">
    <div className="kh-slider-head">
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{format(value)}</output>
    </div>
    <div className={`kh-slider-row${visual ? ' has-visual-buttons' : ''}`}>
      <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} title={visual === 'size' ? 'Smaller text' : visual === 'weight' ? 'Lighter text' : undefined} disabled={value <= min} onClick={() => set(value - step)}>{visual ? <span aria-hidden="true" className={`kh-slider-sample is-${visual} is-low`}>Aa</span> : <Minus aria-hidden="true" />}</button>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        style={{ '--fill': `${fill}%` } as React.CSSProperties}
        onChange={event => set(Number(event.target.value))}
        onDoubleClick={() => set(defaultValue)}
      />
      <button type="button" aria-label={`Increase ${label.toLowerCase()}`} title={visual === 'size' ? 'Larger text' : visual === 'weight' ? 'Bolder text' : undefined} disabled={value >= max} onClick={() => set(value + step)}>{visual ? <span aria-hidden="true" className={`kh-slider-sample is-${visual} is-high`}>Aa</span> : <Plus aria-hidden="true" />}</button>
    </div>
    {hint && <p className="kh-slider-hint">{hint}</p>}
  </div>;
}
