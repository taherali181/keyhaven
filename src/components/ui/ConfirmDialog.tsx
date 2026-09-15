'use client';

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  /** An extra, non-default choice shown between cancel and confirm. */
  secondary?: { label: string; onClick: () => void };
  onConfirm: () => void;
  onCancel: () => void;
}

/** A small modal question. Focus starts on Cancel, Escape closes it, and focus returns afterwards. */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = 'Cancel', tone = 'default', secondary, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancelHandler = useRef(onCancel);
  useEffect(() => { cancelHandler.current = onCancel; });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); cancelHandler.current(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="kh-dialog-scrim" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="kh-dialog" onClick={event => event.stopPropagation()}>
        <h2 id={titleId}>{title}</h2>
        <div className="kh-dialog-body">{children}</div>
        <div className="kh-dialog-actions">
          <button ref={cancelRef} type="button" className="rs-btn" onClick={onCancel}>{cancelLabel}</button>
          {secondary && <button type="button" className="rs-btn" onClick={secondary.onClick}>{secondary.label}</button>}
          <button type="button" className={`rs-btn ${tone === 'danger' ? 'is-danger-solid' : 'is-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
