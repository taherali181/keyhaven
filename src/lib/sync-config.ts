/**
 * Backup & sync is available when the deployment opts in and has a database (DATABASE_URL on the server).
 * NEXT_PUBLIC_KEYHAVEN_CLOUD is the variable's old name and still works.
 */
export function syncEnabled() {
  return (process.env.NEXT_PUBLIC_KEYHAVEN_SYNC ?? process.env.NEXT_PUBLIC_KEYHAVEN_CLOUD) === 'true';
}
