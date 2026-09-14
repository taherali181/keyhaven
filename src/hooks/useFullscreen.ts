'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Document fullscreen with a `data-fullscreen` flag on <html>, so CSS can strip the chrome down to
 * the title bar, the text and the bottom bar. Exiting with the browser's own Esc stays in sync.
 */
export function useFullscreen() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const sync = () => {
      const on = Boolean(document.fullscreenElement);
      setActive(on);
      if (on) document.documentElement.dataset.fullscreen = 'true';
      else delete document.documentElement.dataset.fullscreen;
    };
    queueMicrotask(() => { setSupported(Boolean(document.fullscreenEnabled)); sync(); });
    document.addEventListener('fullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      delete document.documentElement.dataset.fullscreen;
    };
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  return { active, supported, toggle };
}
