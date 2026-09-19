'use client';

import { useEffect, useState } from 'react';
import { getSessionUser, type SessionUser } from '@/lib/session';

/** The signed-in user (null when signed out), or undefined while it is still being checked. */
export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void getSessionUser().then(value => { if (live) setUser(value); });
    return () => { live = false; };
  }, []);
  return user;
}
