import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireSyncUser } from '@/server/http';
import { profiles } from '@/server/schema';

const profileInput = z.object({
  handle: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_]+$/),
  displayName: z.string().trim().max(60).default(''),
  bio: z.string().trim().max(280).default(''),
  leaderboardEnabled: z.boolean().default(true)
});

export async function GET() {
  const context = await requireSyncUser();
  if ('error' in context) return context.error;
  const [profile] = await context.db.select().from(profiles).where(eq(profiles.userId, context.userId)).limit(1);
  return Response.json({ profile: profile ?? null });
}

export async function PATCH(request: Request) {
  const context = await requireSyncUser();
  if ('error' in context) return context.error;
  const parsed = profileInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Handles use 3–20 letters, numbers or underscores. Names can be up to 60 characters and bios up to 280.' }, { status: 422 });
  const values = {
    handle: parsed.data.handle, handleNormalized: parsed.data.handle.toLowerCase(), leaderboardEnabled: parsed.data.leaderboardEnabled,
    displayName: parsed.data.displayName || null, bio: parsed.data.bio || null
  };
  try {
    const [profile] = await context.db.insert(profiles).values({ userId: context.userId, ...values }).onConflictDoUpdate({ target: profiles.userId, set: { ...values, updatedAt: new Date() } }).returning();
    return Response.json({ profile });
  } catch {
    return Response.json({ error: 'That handle is already in use.' }, { status: 409 });
  }
}
