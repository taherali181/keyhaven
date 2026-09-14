'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ListTree, Search } from 'lucide-react';
import { spring } from '@/lib/motion';
import { formatReadTime } from '@/lib/reading';

export interface ContentsEntry {
  id: string;
  title: string;
  words: number;
  status: 'done' | 'current' | 'todo';
  /** 0–100; progress through the entry (100 when done). */
  percent: number;
}

const STATUS_LABEL: Record<ContentsEntry['status'], string> = { done: 'Done', current: 'In progress', todo: 'Not started' };

const focusTyping = () => requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.typing-input')?.focus());

/**
 * Title-bar "Contents" dropdown shared by stories (parts) and books (chapters / sections):
 * a summary, a search box, and each entry's status, length and reading time.
 */
export function ContentsMenu({ entries, currentIndex, unit, wpm, onSelect, onOpen }: {
  entries: ContentsEntry[];
  currentIndex: number;
  /** Singular noun for an entry, e.g. "part", "chapter", "section". */
  unit: string;
  wpm: number;
  onSelect: (index: number) => void;
  /** Called when the menu opens, so callers can refresh saved progress. */
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const reduce = useReducedMotion();

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry, index }) => !needle || `${index + 1} ${entry.title}`.toLowerCase().includes(needle));
  }, [entries, query]);
  const totals = useMemo(() => ({
    words: entries.reduce((sum, entry) => sum + entry.words, 0),
    done: entries.filter(entry => entry.status === 'done').length
  }), [entries]);

  const show = () => {
    setQuery('');
    setHighlight(Math.max(0, currentIndex));
    setOpen(true);
    onOpen?.();
  };
  const hide = (returnToText = false) => {
    setOpen(false);
    if (returnToText) focusTyping();
  };
  const choose = (index: number) => {
    onSelect(index);
    hide(true);
  };

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onPointer = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelectorAll('[role="option"]')[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [open, highlight]);

  const onInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!matches.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setHighlight(value => (value + step + matches.length) % matches.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const match = matches[highlight];
      if (match) choose(match.index);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      hide(true);
    } else if (event.key === 'Tab') {
      hide();
    }
  };

  const active = matches[highlight];
  const plural = `${unit}s`;

  return <div className="contents" ref={containerRef}>
    <button type="button" className="story-bar-button contents-trigger" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-label="Contents" title="Contents" onClick={() => (open ? hide() : show())}>
      <ListTree aria-hidden="true" /><span>Contents</span>
    </button>

    <AnimatePresence>
      {open && (
        <motion.div
          className="story-switcher-menu contents-menu"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: spring.soft }}
          exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
        >
          <p className="contents-summary">
            <span><strong>{entries.length}</strong> {entries.length === 1 ? unit : plural}</span>
            <span>{totals.words.toLocaleString()} words</span>
            <span>{formatReadTime(totals.words, wpm)} read</span>
            <span><strong>{totals.done}</strong> done</span>
          </p>
          <label className="story-switcher-search">
            <Search aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active ? `${listId}-${active.index}` : undefined}
              aria-label={`Search ${plural}`}
              placeholder={`Search ${plural}`}
              value={query}
              onChange={event => { setQuery(event.target.value); setHighlight(0); }}
              onKeyDown={onInputKey}
            />
            <kbd>Esc</kbd>
          </label>

          <div id={listId} ref={listRef} role="listbox" aria-label="Contents" className="story-switcher-list contents-list">
            {matches.map(({ entry, index }, position) => (
              <button
                key={entry.id}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={index === currentIndex}
                className={`contents-option is-${entry.status} ${position === highlight ? 'is-highlighted' : ''}`}
                onMouseMove={() => setHighlight(position)}
                onClick={() => choose(index)}
              >
                <span className="contents-marker" style={{ '--p': `${entry.percent}%` } as React.CSSProperties} aria-hidden="true">
                  {entry.status === 'done' && <Check />}
                </span>
                <span className="contents-text">
                  <small>{String(index + 1).padStart(2, '0')}</small>
                  <span className="contents-title">{entry.title}</span>
                </span>
                <span className="contents-meta">
                  {entry.status === 'current' && <strong>{entry.percent}%</strong>}
                  <span>{formatReadTime(entry.words, wpm)}</span>
                  <span className="contents-words">{entry.words.toLocaleString()} words</span>
                </span>
                <span className="sr-only">{STATUS_LABEL[entry.status]}</span>
              </button>
            ))}
            {!matches.length && <p className="story-switcher-empty">No {plural} match “{query.trim()}”.</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>;
}
