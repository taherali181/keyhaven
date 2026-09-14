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
  variant?: 'pill' | 'default';
  icon?: React.ReactNode;
}

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
  const generatedId = useId();
  const selectId = id || generatedId;

  // Normalize options to GlassSelectOption format
  const normalizedOptions: GlassSelectOption<T>[] = options.map(opt =>
    typeof opt === 'object' && opt !== null && 'value' in opt
      ? (opt as GlassSelectOption<T>)
      : { value: opt as T, label: String(opt) }
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const selectedLabel = selectedOption ? selectedOption.label : placeholder || String(value);

  const toggleOpen = () => {
    if (disabled) return;
    setOpen(prev => {
      const next = !prev;
      if (next) {
        const idx = normalizedOptions.findIndex(opt => opt.value === value);
        setHighlightIndex(idx >= 0 ? idx : 0);
      }
      return next;
    });
  };

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && highlightIndex >= 0 && menuRef.current) {
      const optionElements = menuRef.current.querySelectorAll<HTMLButtonElement>('[role="option"]');
      const target = optionElements[highlightIndex];
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [open, highlightIndex]);

  // Handle keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = normalizedOptions.findIndex(opt => opt.value === value);
        setHighlightIndex(idx >= 0 ? idx : 0);
        setOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev + 1) % normalizedOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev - 1 + normalizedOptions.length) % normalizedOptions.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < normalizedOptions.length) {
        onChange(normalizedOptions[highlightIndex].value);
        setOpen(false);
      }
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const handleSelect = (val: T) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`glass-select-wrapper ${variant === 'pill' ? 'is-pill' : ''} ${className}`.trim()}
      onKeyDown={onKeyDown}
    >
      {/* Hidden synchronized select for full native accessibility/form compatibility */}
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
        {normalizedOptions.map(opt => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${selectId}-menu`}
        aria-label={ariaLabel || (typeof selectedLabel === 'string' ? selectedLabel : undefined)}
        disabled={disabled}
        onClick={toggleOpen}
        className={`glass glass-select-trigger ${variant === 'pill' ? 'glass-pill' : ''} ${open ? 'is-open' : ''} ${triggerClassName}`.trim()}
      >
        {icon && <span className="glass-select-icon" aria-hidden="true">{icon}</span>}
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
            className={`glass glass-popover glass-select-menu align-${align} ${menuClassName}`.trim()}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: spring.soft }}
            exit={{ opacity: 0, scale: 0.96, y: -2, transition: { duration: 0.12 } }}
          >
            <div className="glass-select-options">
              {normalizedOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isHighlighted = index === highlightIndex;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`glass-select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightIndex(index)}
                  >
                    <div className="glass-select-option-content">
                      {opt.icon && <span className="glass-select-option-icon">{opt.icon}</span>}
                      <span className="glass-select-option-text">{opt.label}</span>
                      {opt.sub && <span className="glass-select-option-sub">{opt.sub}</span>}
                    </div>
                    {isSelected && (
                      <motion.span
                        className="glass-select-check"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={spring.snappy}
                        aria-hidden="true"
                      >
                        <Check />
                      </motion.span>
                    )}
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
