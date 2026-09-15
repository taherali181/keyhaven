import { createHash, randomBytes } from 'node:crypto';
import { Resend } from 'resend';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { syncDb } from '@/server/db';
import { credentials, passwordResetTokens, users } from '@/server/schema';
import { allowAuthAttempt, requestAddress } from '@/server/rate-limit';

const schema = z.object({ email: z.string().email().transform(value => value.trim().toLowerCase()) });

export async function POST(request: Request) {
  if (!syncDb) return Response.json({ error: 'Accounts are not configured on this deployment.' }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Enter a valid email address.' }, { status: 422 });
  if (!await allowAuthAttempt(syncDb, `reset:${requestAddress(request)}`, 5, 60 * 60_000)) return Response.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  const [user] = await syncDb.select({ id: users.id }).from(users).innerJoin(credentials, eq(users.id, credentials.userId)).where(eq(users.email, parsed.data.email)).limit(1);
  if (user && process.env.AUTH_RESEND_KEY) {
    const token = randomBytes(32).toString('hex');
    await syncDb.insert(passwordResetTokens).values({ userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 30 * 60_000) });
    const url = `${new URL(request.url).origin}/reset-password?token=${token}`;
    const resend = new Resend(process.env.AUTH_RESEND_KEY);
    await resend.emails.send({ from: process.env.AUTH_EMAIL_FROM ?? 'KeyHaven <hello@example.com>', to: parsed.data.email, subject: 'Reset your KeyHaven password', html: `<p>Use the link below within 30 minutes to reset your KeyHaven password.</p><p><a href="${url}">Reset password</a></p>` });
  }
  return Response.json({ sent: true });
}
