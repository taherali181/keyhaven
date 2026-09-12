import { createHash } from 'node:crypto';
import { hash } from 'bcryptjs';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { cloudDb } from '@/server/db';
import { credentials, passwordResetTokens } from '@/server/schema';
import { allowAuthAttempt, requestAddress } from '@/server/rate-limit';

const schema = z.object({ token: z.string().length(64), password: z.string().min(10).max(128).regex(/[A-Za-z]/).regex(/[0-9]/) });

export async function POST(request: Request) {
  if (!cloudDb) return Response.json({ error: 'Accounts are not configured on this deployment.' }, { status: 503 });
  if (!await allowAuthAttempt(cloudDb, `reset-submit:${requestAddress(request)}`, 8, 60 * 60_000)) return Response.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'This reset link or password is invalid.' }, { status: 422 });
  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');
  const [token] = await cloudDb.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1);
  if (!token) return Response.json({ error: 'This reset link has expired or was already used.' }, { status: 410 });
  await cloudDb.update(credentials).set({ passwordHash: await hash(parsed.data.password, 12), updatedAt: new Date() }).where(eq(credentials.userId, token.userId));
  await cloudDb.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, token.id));
  return Response.json({ reset: true });
}
