'use client';

import { useEffect, useRef } from 'react';
import type { PageAction, ReaderInputSettings } from '@/types';
import { createWheelPager, resolvePageAction } from '@/lib/reader-input';

/** Keys, wheel and clicks inside these belong to them, not to page turning. */
const OWNED = 'input, textarea, select, [contenteditable="true"], [role="listbox"], [role="dialog"], [role="menu"], .settings-panel, .story-switcher-menu';

/** The left and right edges of the page (this share of its width) turn pages when clicked. */
export const CLICK_ZONE = 0.15;

/**
 * Turns pages from the keyboard (remappable), the mouse wheel and clicks near the page edges, as set in
 * Settings → Input. `surface` is the element the wheel and clicks act on (the page).
 */
export function usePageInput({ active, input, surface, onAction }: {
  active: boolean;
  input: ReaderInputSettings;
  surface: React.RefObject<HTMLElement | null>;
  onAction: (action: PageAction) => void;
}) {
  const actionRef = useRef(onAction);
  const inputRef = useRef(input);
  useEffect(() => { actionRef.current = onAction; inputRef.current = input; });

  // Keys: anywhere on the page, except where fields, menus and panels need them.
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest(OWNED)) return;
      // Space presses a focused button; leave it to the button.
      if (event.key === ' ' && target?.closest('button, a')) return;
      const action = resolvePageAction(event, inputRef.current.keys);
      if (!action) return;
      event.preventDefault();
      actionRef.current(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  // Wheel: desktop layouts only (phones scroll the page instead).
  useEffect(() => {
    const element = surface.current;
    if (!active || !input.wheel || !element) return;
    const desktop = window.matchMedia('(min-width: 768px)');
    const pager = createWheelPager();
    const onWheel = (event: WheelEvent) => {
      // Ctrl + wheel zooms; wheel over menus and panels scrolls them.
      if (!desktop.matches || event.ctrlKey || (event.target as HTMLElement | null)?.closest(OWNED)) return;
      const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 40 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? event.deltaY * 800 : event.deltaY;
      event.preventDefault();
      const step = pager(delta);
      if (step) actionRef.current(step > 0 ? 'next' : 'prev');
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [active, input.wheel, surface]);

  // Click zones: the outer edges of the page. A click that ends a text selection, or lands on a control, doesn't turn.
  useEffect(() => {
    const element = surface.current;
    if (!active || !input.clickZones || !element) return;
    const zoneAt = (event: MouseEvent) => {
      const box = element.getBoundingClientRect();
      const x = (event.clientX - box.left) / Math.max(1, box.width);
      return x <= CLICK_ZONE ? 'prev' : x >= 1 - CLICK_ZONE ? 'next' : null;
    };
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || (event.target as HTMLElement | null)?.closest(`${OWNED}, button, a, mark`)) return;
      if (!window.getSelection()?.isCollapsed) return;
      const zone = zoneAt(event);
      if (zone) actionRef.current(zone);
    };
    // The pointer shows which way a click will turn.
    const onMove = (event: MouseEvent) => { element.dataset.clickZone = zoneAt(event) ?? ''; };
    const onLeave = () => { delete element.dataset.clickZone; };
    element.addEventListener('click', onClick);
    element.addEventListener('mousemove', onMove);
    element.addEventListener('mouseleave', onLeave);
    return () => {
      element.removeEventListener('click', onClick);
      element.removeEventListener('mousemove', onMove);
      element.removeEventListener('mouseleave', onLeave);
      delete element.dataset.clickZone;
    };
  }, [active, input.clickZones, surface]);
}
