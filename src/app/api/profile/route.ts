import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireCloudUser } from '@/server/http';
import { profiles } from '@/server/schema';

const profileInput = z.object({
  handle: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_]+$/),
  leaderboardEnabled: z.boolean().default(true)
});

export async function GET() {
  const context = await requireCloudUser();
  if ('error' in context) return context.error;
  const [profile] = await context.db.select().from(profiles).where(eq(profiles.userId, context.userId)).limit(1);
  return Response.json({ profile: profile ?? null });
}

export async function PATCH(request: Request) {
  const context = await requireCloudUser();
  if ('error' in context) return context.error;
  const parsed = profileInput.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: 'Choose 3–20 letters, numbers, or underscores.' }, { status: 422 });
  try {
    const [profile] = await context.db.insert(profiles).values({ userId: context.userId, handle: parsed.data.handle, handleNormalized: parsed.data.handle.toLowerCase(), leaderboardEnabled: parsed.data.leaderboardEnabled }).onConflictDoUpdate({ target: profiles.userId, set: { handle: parsed.data.handle, handleNormalized: parsed.data.handle.toLowerCase(), leaderboardEnabled: parsed.data.leaderboardEnabled, updatedAt: new Date() } }).returning();
    return Response.json({ profile });
  } catch {
    return Response.json({ error: 'That handle is already in use.' }, { status: 409 });
  }
}
