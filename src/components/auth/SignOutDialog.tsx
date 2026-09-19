'use client';

import { signOut } from 'next-auth/react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { clearSessionCache } from '@/lib/session';
import { clearLocalAccountData } from '@/lib/sync/engine';

/** Signing out asks whether to keep this device's copy of the account's data or remove it. */
export function SignOutDialog({ open, onCancel }: { open: boolean; onCancel: () => void }) {
  const signOutAnd = async (removeFromDevice: boolean) => {
    onCancel();
    if (removeFromDevice) await clearLocalAccountData();
    clearSessionCache();
    await signOut({ callbackUrl: '/sign-in' });
  };
  return <ConfirmDialog open={open} title="Sign out" confirmLabel="Remove and sign out" tone="danger" secondary={{ label: 'Keep and sign out', onClick: () => void signOutAnd(false) }} onConfirm={() => void signOutAnd(true)} onCancel={onCancel}>
    <p>Your progress is backed up to your account. Keep a copy on this device, or remove it so the next person here starts fresh.</p>
  </ConfirmDialog>;
}
