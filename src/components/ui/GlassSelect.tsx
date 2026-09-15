'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { ease, spring } from '@/lib/motion';

export interface GlassSelectOption<T extends string | number = string> {
  value: T;
  label: string;
  sub?: string;
  icon?: React.ReactNode;
  /** Shown right-aligned in the menu, e.g. how many items a category holds. */
  count?: number;
}

export interface GlassSelectProps<T extends string | number = string> {
  id?: string;
  value: T;
  options: Array<GlassSelectOption<T> | T>;
  onChange: (value: T) => void;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  align?: 'left' | 'right';
  /** `toolbar` matches the reader title bar buttons; `pill` and `default` are standalone glass fields. */
  variant?: 'pill' | 'default' | 'toolbar';
  icon?: React.ReactNode;
}

const TYPEAHEAD_RESET_MS = 600;

export function GlassSelect<T extends string | number = string>({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  disabled = false,
  align = 'left',
  variant = 'default',
  icon
}: GlassSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: '', timer: 0 });
  const generatedId = useId();
  const selectId = id || generatedId;

  const normalizedOptions: GlassSelectOption<T>[] = options.map(opt =>
    typeof opt === 'object' && opt !== null && 'value' in opt
      ? (opt as GlassSelectOption<T>)
      : { value: opt as T, label: String(opt) }
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const selectedLabel = selectedOption ? selectedOption.label : placeholder || String(value);
  const selectedIndex = () => Math.max(0, normalizedOptions.findIndex(opt => opt.value === value));

  const openMenu = () => { setHighlightIndex(selectedIndex()); setOpen(true); };
  const toggleOpen = () => {
    if (disabled) return;
    if (open) setOpen(false);
    else openMenu();
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || highlightIndex < 0 || !menuRef.current) return;
    menuRef.current.querySelectorAll<HTMLButtonElement>('[role="option"]')[highlightIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, highlightIndex]);

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), []);

  /** Jump to the first option starting with the letters typed in quick succession. */
  const typeAhead = (key: string) => {
    const state = typeahead.current;
    window.clearTimeout(state.timer);
    state.text += key.toLowerCase();
    state.timer = window.setTimeout(() => { state.text = ''; }, TYPEAHEAD_RESET_MS);
    const match = normalizedOptions.findIndex(opt => opt.label.toLowerCase().startsWith(state.text));
    if (match >= 0) setHighlightIndex(match);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    const last = normalizedOptions.length - 1;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(prev => (prev >= last ? 0 : prev + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(prev => (prev <= 0 ? last : prev - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setHighlightIndex(0); }
    else if (e.key === 'End') { e.preventDefault(); setHighlightIndex(last); }
    else if (e.key === 'Enter' || (e.key === ' ' && !typeahead.current.text)) {
      e.preventDefault();
      const option = normalizedOptions[highlightIndex];
      if (option) { onChange(option.value); setOpen(false); }
    } else if (e.key === 'Tab') setOpen(false);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); typeAhead(e.key); }
  };

  const handleSelect = (val: T) => { onChange(val); setOpen(false); };
  const triggerVariant = variant === 'pill' ? 'glass glass-pill' : variant === 'toolbar' ? 'is-toolbar' : 'glass';

  return (
    <div
      ref={containerRef}
      className={`glass-select-wrapper is-${variant} ${className}`.trim()}
      onKeyDown={onKeyDown}
    >
      {/* Hidden synchronized select for native accessibility and form compatibility */}
      <select
        id={id ? `${selectId}-native` : undefined}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        value={String(value)}
        onChange={e => {
          const matched = normalizedOptions.find(opt => String(opt.value) === e.target.value);
          if (matched) onChange(matched.value);
        }}
      >
        {normalizedOptions.map(opt => <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>)}
      </select>

      <button
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${selectId}-menu`}
        aria-label={ariaLabel || selectedLabel}
        disabled={disabled}
        onClick={toggleOpen}
        className={`glass-select-trigger ${triggerVariant} ${open ? 'is-open' : ''} ${triggerClassName}`.trim()}
      >
        {(icon ?? (variant === 'toolbar' ? selectedOption?.icon : undefined)) && <span className="glass-select-icon" aria-hidden="true">{icon ?? selectedOption?.icon}</span>}
        <span className="glass-select-label">{selectedLabel}</span>
        <motion.span
          className="glass-select-chevron"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: ease.outExpo }}
          aria-hidden="true"
        >
          <ChevronDown />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={`${selectId}-menu`}
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel}
            aria-activedescendant={highlightIndex >= 0 ? `${selectId}-option-${highlightIndex}` : undefined}
            className={`glass-select-menu align-${align} ${menuClassName}`.trim()}
            style={{ transformOrigin: align === 'right' ? 'top right' : 'top left' }}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: spring.soft }}
            exit={{ opacity: 0, scale: 0.98, y: -2, transition: { duration: 0.12 } }}
          >
            <div className="glass-select-options">
              {normalizedOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isHighlighted = index === highlightIndex;
                return (
                  <button
                    key={String(opt.value)}
                    id={`${selectId}-option-${index}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={isSelected}
                    className={`glass-select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                    onClick={() => handleSelect(opt.value)}
                    onPointerMove={() => { if (!isHighlighted) setHighlightIndex(index); }}
                  >
                    {isHighlighted && <motion.span layoutId={`${selectId}-highlight`} className="glass-select-highlight" transition={spring.snappy} aria-hidden="true" />}
                    {opt.icon && <span className="glass-select-option-icon" aria-hidden="true">{opt.icon}</span>}
                    <span className="glass-select-option-content">
                      <span className="glass-select-option-text">{opt.label}</span>
                      {opt.sub && <span className="glass-select-option-sub">{opt.sub}</span>}
                    </span>
                    {opt.count !== undefined && <span className="glass-select-count">{opt.count}</span>}
                    <span className="glass-select-check" aria-hidden="true">{isSelected && <Check />}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
