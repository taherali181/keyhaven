'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Highlighter, X } from 'lucide-react';
import type { HighlightRecord } from '@/types';
import { highlightsMarkdown } from '@/lib/highlights';
import { fade, slideInRight } from '@/lib/motion';

/** Every highlight and note in the book, by chapter. Clicking one goes to its page. */
export function NotesPanel({ open, onClose, title, author, highlights, sectionTitle, onJump }: {
  open: boolean;
  onClose: () => void;
  title: string;
  author: string;
  highlights: HighlightRecord[];
  sectionTitle: (index: number) => string;
  onJump: (highlight: HighlightRecord) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const sorted = [...highlights].sort((a, b) => a.sectionIndex - b.sectionIndex || a.paragraph - b.paragraph || a.start - b.start);
  const groups = sorted.reduce<Array<{ section: number; items: HighlightRecord[] }>>((list, highlight) => {
    const last = list[list.length - 1];
    if (last?.section === highlight.sectionIndex) last.items.push(highlight);
    else list.push({ section: highlight.sectionIndex, items: [highlight] });
    return list;
  }, []);

  const exportMarkdown = () => {
    const blob = new Blob([highlightsMarkdown(title, author, highlights, sectionTitle)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'notes'}-highlights.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <AnimatePresence>
    {open && <motion.div key="notes-scrim" className="rs-scrim" variants={fade} initial="hidden" animate="show" exit="exit" onClick={onClose} />}
    {open && <motion.aside key="notes-panel" className="rs-panel notes-panel glass glass-panel" role="dialog" aria-label="Highlights and notes" variants={slideInRight} initial="hidden" animate="show" exit="exit">
      <header className="rs-header">
        <h2>Highlights</h2>
        <button type="button" onClick={onClose} aria-label="Close highlights"><X /></button>
      </header>
      <div className="notes-toolbar">
        <span>{highlights.length} {highlights.length === 1 ? 'highlight' : 'highlights'} · {highlights.filter(item => item.note?.trim()).length} with notes</span>
        <button type="button" className="rs-btn" disabled={!highlights.length} onClick={exportMarkdown}><Download aria-hidden="true" />Export</button>
      </div>
      <div className="rs-body">
        {groups.length === 0
          ? <div className="notes-empty"><Highlighter aria-hidden="true" /><p><strong>No highlights yet</strong></p><p>Select any words while reading to highlight them or add a note.</p></div>
          : groups.map(group => <section key={group.section} className="notes-group">
            <h3>{sectionTitle(group.section)}</h3>
            <ul>{group.items.map(highlight => <li key={highlight.id}>
              <button type="button" className="notes-item" data-color={highlight.color} onClick={() => onJump(highlight)}>
                <span className="notes-quote">{highlight.quote}</span>
                {highlight.note?.trim() && <span className="notes-note">{highlight.note}</span>}
              </button>
            </li>)}</ul>
          </section>)}
      </div>
    </motion.aside>}
  </AnimatePresence>;
}
