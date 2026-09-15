import { z } from 'zod';
import { requireSyncUser } from '@/server/http';
import { pullPage } from '@/server/sync';
import { SYNC_ENTITIES } from '@/lib/sync/protocol';

const query = z.object({
  entity: z.enum(SYNC_ENTITIES),
  t: z.coerce.number().finite().nonnegative().default(0),
  k: z.string().max(400).default('')
});

/** Backup & sync: one page of an entity's changes after the device's cursor. */
export async function GET(request: Request) {
  const context = await requireSyncUser();
  if ('error' in context) return context.error;
  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: 'Invalid backup request.' }, { status: 422 });
  const page = await pullPage(context.db, context.userId, parsed.data.entity, parsed.data.t, parsed.data.k);
  return Response.json(page, { headers: { 'cache-control': 'no-store' } });
}
