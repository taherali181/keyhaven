'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp, LogIn, LogOut, RefreshCw, User } from 'lucide-react';
import { SignOutDialog } from '@/components/auth/SignOutDialog';
import { useSessionUser } from '@/hooks/useSessionUser';
import { spring } from '@/lib/motion';
import { BACKUP_LABELS, requestBackupNow, useBackupStatus } from '@/lib/sync/status';

const initials = (name: string) => name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join('') || '?';

/** The sign-in address that brings the reader back to where they are now. */
export const signInHref = () => `/sign-in?callbackUrl=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;

/** The sidebar's account entry: "Sign in" when signed out; the account and its menu when signed in. */
export function AccountMenu({ onOpenProfile }: { onOpenProfile: () => void }) {
  const router = useRouter();
  const user = useSessionUser();
  const backup = useBackupStatus();
  const [open, setOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); } };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey, true); };
  }, [open]);

  // Still checking: keep the row's space so the footer doesn't jump.
  if (user === undefined) return <div className="sidebar-link account-pending" aria-hidden="true" />;

  if (!user) return <button type="button" className="sidebar-link account-sign-in" onClick={() => router.push(signInHref())}><LogIn /><span>Sign in</span></button>;

  const name = user.name || user.email || 'Your account';
  return <div ref={rootRef} className="account-menu">
    <button type="button" className="sidebar-link account-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span className="account-avatar" aria-hidden="true">{initials(name)}</span>
      <span className="account-name">{name}</span>
      <ChevronUp className="account-chevron" aria-hidden="true" />
    </button>
    <AnimatePresence>
      {open && <motion.div className="account-popover glass glass-panel" role="menu" aria-label="Account" initial={{ opacity: 0, y: 6, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1, transition: spring.snappy }} exit={{ opacity: 0, y: 4, transition: { duration: .12 } }}>
        <div className="account-head">
          <strong>{user.name || 'Signed in'}</strong>
          {user.email && <small>{user.email}</small>}
          <span className="app-backup-state" data-state={backup.state}>{BACKUP_LABELS[backup.state]}</span>
        </div>
        <button type="button" role="menuitem" onClick={() => { setOpen(false); onOpenProfile(); }}><User aria-hidden="true" />Profile</button>
        <button type="button" role="menuitem" disabled={backup.state === 'syncing' || backup.state === 'off'} onClick={() => { requestBackupNow(); setOpen(false); }}><RefreshCw aria-hidden="true" />Back up now</button>
        <button type="button" role="menuitem" onClick={() => { setOpen(false); setSignOutOpen(true); }}><LogOut aria-hidden="true" />Sign out</button>
      </motion.div>}
    </AnimatePresence>
    <SignOutDialog open={signOutOpen} onCancel={() => setSignOutOpen(false)} />
  </div>;
}
