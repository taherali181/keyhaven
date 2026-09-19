'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, NotebookPen, Trash2 } from 'lucide-react';
import type { HighlightColor, HighlightRecord } from '@/types';
import { anchorFromRange, HIGHLIGHT_COLORS, type Anchor } from '@/lib/highlights';

type Target =
  | { kind: 'new'; anchor: Anchor; rect: DOMRect }
  | { kind: 'existing'; highlight: HighlightRecord; rect: DOMRect };

/**
 * Select text in Read mode to highlight it; click a highlight to recolour it, add a note or remove it.
 * The popover is a dialog, so page keys stay with it while it's open.
 */
export function HighlightPopover({ surface, active, highlights, onCreate, onUpdate, onRemove, closeKey }: {
  surface: React.RefObject<HTMLElement | null>;
  active: boolean;
  highlights: HighlightRecord[];
  onCreate: (anchor: Anchor, color: HighlightColor, note?: string) => Promise<HighlightRecord>;
  onUpdate: (id: string, patch: Partial<Pick<HighlightRecord, 'color' | 'note'>>) => void;
  onRemove: (id: string) => void;
  /** Changes when the page turns, closing the popover. */
  closeKey: string;
}) {
  const [target, setTarget] = useState<Target | null>(null);
  const [noting, setNoting] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const highlightsRef = useRef(highlights);
  useEffect(() => { highlightsRef.current = highlights; });

  const close = () => { setTarget(null); setNoting(false); setCopied(false); };
  useEffect(() => { queueMicrotask(() => { setTarget(null); setNoting(false); }); }, [closeKey, active]);

  // A finished selection inside the page offers highlighting; a click on a highlight opens it.
  useEffect(() => {
    const element = surface.current;
    if (!active || !element) return;
    const onUp = (event: PointerEvent | KeyboardEvent) => {
      if (boxRef.current?.contains(event.target as Node)) return;
      window.setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (!element.contains(range.commonAncestorContainer)) return;
        const anchor = anchorFromRange(range);
        if (!anchor) return;
        setNoting(false);
        setTarget({ kind: 'new', anchor, rect: range.getBoundingClientRect() });
      }, 0);
    };
    const onClick = (event: MouseEvent) => {
      const mark = (event.target as HTMLElement | null)?.closest<HTMLElement>('mark.hl');
      if (!mark || !window.getSelection()?.isCollapsed) return;
      const highlight = highlightsRef.current.find(item => item.id === mark.dataset.id);
      if (!highlight) return;
      setDraft(highlight.note ?? '');
      setNoting(false);
      setTarget({ kind: 'existing', highlight, rect: mark.getBoundingClientRect() });
    };
    element.addEventListener('pointerup', onUp);
    element.addEventListener('keyup', onUp);
    element.addEventListener('click', onClick);
    return () => { element.removeEventListener('pointerup', onUp); element.removeEventListener('keyup', onUp); element.removeEventListener('click', onClick); };
  }, [active, surface]);

  // Escape or a click elsewhere closes it.
  useEffect(() => {
    if (!target) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); } };
    const onPointer = (event: PointerEvent) => {
      if (boxRef.current?.contains(event.target as Node) || (event.target as HTMLElement | null)?.closest('mark.hl')) return;
      if (target.kind === 'existing' || !surface.current?.contains(event.target as Node)) close();
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer);
    return () => { window.removeEventListener('keydown', onKey, true); document.removeEventListener('pointerdown', onPointer); };
  }, [target, surface]);

  if (!target || typeof document === 'undefined') return null;

  const current = target.kind === 'existing' ? highlights.find(item => item.id === target.highlight.id) ?? target.highlight : null;
  const pick = async (color: HighlightColor) => {
    if (current) { onUpdate(current.id, { color }); return; }
    if (target.kind !== 'new') return;
    const created = await onCreate(target.anchor, color);
    window.getSelection()?.removeAllRanges();
    setTarget({ kind: 'existing', highlight: created, rect: target.rect });
  };
  const startNote = async () => {
    if (target.kind === 'new') {
      const created = await onCreate(target.anchor, 'yellow');
      window.getSelection()?.removeAllRanges();
      setTarget({ kind: 'existing', highlight: created, rect: target.rect });
      setDraft('');
    }
    setNoting(true);
  };
  const saveNote = () => { if (current) onUpdate(current.id, { note: draft.trim() || undefined }); close(); };
  const copy = async () => {
    const text = current?.quote ?? (target.kind === 'new' ? target.anchor.quote : '');
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* clipboard blocked */ }
  };

  // Above the text when there's room, otherwise below; kept on screen.
  const width = noting ? 320 : 264;
  const left = Math.min(window.innerWidth - width - 12, Math.max(12, target.rect.left + target.rect.width / 2 - width / 2));
  const above = target.rect.top > 150;
  const style: React.CSSProperties = above ? { left, top: target.rect.top - 10, width, translate: '0 -100%' } : { left, top: target.rect.bottom + 10, width };

  return createPortal(<div ref={boxRef} className="hl-popover glass glass-panel" role="dialog" aria-label={current ? 'Highlight' : 'Highlight text'} style={style}>
    {noting && current
      ? <div className="hl-note-editor">
        <textarea autoFocus aria-label="Note" placeholder="Add a note…" value={draft} maxLength={2000} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) saveNote(); }} />
        <div className="hl-note-actions">
          <button type="button" className="rs-btn" onClick={() => setNoting(false)}>Cancel</button>
          <button type="button" className="rs-btn is-primary" onClick={saveNote}>Save note</button>
        </div>
      </div>
      : <>
        <div className="hl-swatches" role="radiogroup" aria-label="Highlight colour">
          {HIGHLIGHT_COLORS.map(color => <button key={color.id} type="button" role="radio" aria-checked={current?.color === color.id} aria-label={color.label} className="hl-swatch" data-color={color.id} onClick={() => void pick(color.id)}>
            {current?.color === color.id && <Check aria-hidden="true" />}
          </button>)}
        </div>
        <div className="hl-actions">
          <button type="button" onClick={() => void startNote()}><NotebookPen aria-hidden="true" />{current?.note ? 'Edit note' : 'Note'}</button>
          <button type="button" onClick={() => void copy()}><Copy aria-hidden="true" />{copied ? 'Copied' : 'Copy'}</button>
          {current && <button type="button" onClick={() => { onRemove(current.id); close(); }}><Trash2 aria-hidden="true" />Remove</button>}
        </div>
        {current?.note && <p className="hl-note-preview">{current.note}</p>}
      </>}
  </div>, document.body);
}
