// One cached look at the Auth.js session, shared by Backup & sync, the profile and verified speed tests,
// instead of each asking the server separately.

export interface SessionUser { id: string; email: string | null; name: string | null; image: string | null }

const TTL_MS = 30_000;
let cached: { at: number; promise: Promise<SessionUser | null> } | null = null;

export function getSessionUser(force = false): Promise<SessionUser | null> {
  const now = Date.now();
  if (!force && cached && now - cached.at < TTL_MS) return cached.promise;
  const promise = fetch('/api/auth/session', { cache: 'no-store' })
    .then(response => (response.ok ? response.json() : null))
    .then((session: { user?: { id?: string; email?: string | null; name?: string | null; image?: string | null } } | null) => {
      const user = session?.user;
      return user?.id ? { id: String(user.id), email: user.email ?? null, name: user.name ?? null, image: user.image ?? null } : null;
    })
    .catch(() => null);
  cached = { at: now, promise };
  return promise;
}

export function clearSessionCache() {
  cached = null;
}
