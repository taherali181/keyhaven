'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const TIP_ID = 'kh-tooltip';
/** A trailing "(Ctrl K)" or "(Escape)" in a title is shown as key chips. */
const SHORTCUT = /\s*\(([^)]+)\)\s*$/;
const SHOW_DELAY = 420;
/** Moving between controls while a tooltip is up swaps it almost instantly. */
const WARM_DELAY = 60;
const GAP = 10;
const EDGE = 8;

interface Tip { id: number; text: string; keys: string[]; anchor: DOMRect }

/** Moves a native `title` into `data-tip` so the browser's own tooltip never appears. */
function adopt(element: Element) {
  const title = element.getAttribute('title');
  if (title === null) return;
  element.removeAttribute('title');
  if (!title.trim()) return;
  element.setAttribute('data-tip', title);
  // Titles were sometimes the only name an icon button had; keep it for assistive tech.
  if (!element.hasAttribute('aria-label') && !element.textContent?.trim()) element.setAttribute('aria-label', title.replace(SHORTCUT, '').trim());
}

/**
 * Site-wide tooltips: every element with a `title` gets a solid, on-brand tooltip on hover or keyboard focus,
 * instead of the browser's plain one. Rendered once near the app root.
 */
export function Tooltips() {
  const [tip, setTip] = useState<Tip | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const tipVisible = useRef(false);

  useEffect(() => { tipVisible.current = Boolean(tip); }, [tip]);

  useEffect(() => {
    document.querySelectorAll('[title]').forEach(adopt);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes' && record.target instanceof Element) adopt(record.target);
        record.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          adopt(node);
          node.querySelectorAll('[title]').forEach(adopt);
        });
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });

    let timer = 0;
    let current: Element | null = null;
    let counter = 0;

    const hide = () => {
      window.clearTimeout(timer);
      current?.removeAttribute('aria-describedby');
      current = null;
      setTip(null);
    };
    const show = (element: Element, delay: number) => {
      window.clearTimeout(timer);
      current?.removeAttribute('aria-describedby');
      current = element;
      timer = window.setTimeout(() => {
        const raw = element.getAttribute('data-tip');
        if (!raw || !element.isConnected) return;
        const shortcut = raw.match(SHORTCUT)?.[1];
        element.setAttribute('aria-describedby', TIP_ID);
        setTip({ id: ++counter, text: raw.replace(SHORTCUT, '').trim(), keys: shortcut ? shortcut.split(/\s+/) : [], anchor: element.getBoundingClientRect() });
      }, delay);
    };

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const element = (event.target as Element | null)?.closest?.('[data-tip]') ?? null;
      if (element === current) return;
      if (!element) { hide(); return; }
      show(element, tipVisible.current ? WARM_DELAY : SHOW_DELAY);
    };
    const onPointerOut = (event: PointerEvent) => {
      if (!current) return;
      const next = event.relatedTarget as Node | null;
      if (next && current.contains(next)) return;
      hide();
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      const element = target?.closest?.('[data-tip]');
      if (element && target?.matches(':focus-visible')) show(element, 0);
    };

    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', hide);
    document.addEventListener('keydown', hide, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('keydown', hide, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, []);

  // Place above the control (below when there's no room), centred on it and kept inside the viewport.
  useLayoutEffect(() => {
    const node = tipRef.current;
    if (!node || !tip) return;
    const { anchor } = tip;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const above = anchor.top - GAP - height >= EDGE;
    const centre = anchor.left + anchor.width / 2;
    const left = Math.min(Math.max(EDGE, centre - width / 2), window.innerWidth - width - EDGE);
    node.style.left = `${Math.round(left)}px`;
    node.style.top = `${Math.round(above ? anchor.top - GAP - height : anchor.bottom + GAP)}px`;
    node.dataset.place = above ? 'top' : 'bottom';
    node.dataset.ready = 'true';
  }, [tip]);

  if (!tip) return null;
  return <div key={tip.id} ref={tipRef} id={TIP_ID} role="tooltip" className="kh-tooltip">
    <span>{tip.text}</span>
    {tip.keys.length > 0 && <span className="kh-tooltip-keys">{tip.keys.map(key => <kbd key={key}>{key}</kbd>)}</span>}
  </div>;
}
