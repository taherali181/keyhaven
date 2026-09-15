import { requireSyncUser } from '@/server/http';
import { pushBatch } from '@/server/sync';
import { pushInput } from '@/lib/sync/protocol';

/** Backup & sync: store one batch of this device's changes (see src/lib/sync/protocol.ts). */
export async function POST(request: Request) {
  const context = await requireSyncUser();
  if ('error' in context) return context.error;
  const parsed = pushInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'This backup batch was not accepted.' }, { status: 422 });
  const result = await pushBatch(context.db, context.userId, parsed.data);
  return Response.json(result, { headers: { 'cache-control': 'no-store' } });
}
