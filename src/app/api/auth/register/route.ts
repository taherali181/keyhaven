import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { cloudDb } from '@/server/db';
import { credentials, users } from '@/server/schema';
import { createUniqueProfile } from '@/server/accounts';
import { allowAuthAttempt, requestAddress } from '@/server/rate-limit';

const schema = z.object({ name: z.string().trim().min(2).max(60), email: z.string().email().transform(value => value.trim().toLowerCase()), password: z.string().min(10).max(128).regex(/[A-Za-z]/).regex(/[0-9]/) });

export async function POST(request: Request) {
  if (!cloudDb) return Response.json({ error: 'Accounts are not configured on this deployment.' }, { status: 503 });
  if (!await allowAuthAttempt(cloudDb, `register:${requestAddress(request)}`, 5, 60 * 60_000)) return Response.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Use a valid name, email, and a password of at least 10 characters containing a letter and number.' }, { status: 422 });
  const existing = await cloudDb.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (existing.length) return Response.json({ error: 'An account already exists for this email.' }, { status: 409 });
  const id = crypto.randomUUID();
  await cloudDb.insert(users).values({ id, name: parsed.data.name, email: parsed.data.email });
  try {
    await cloudDb.insert(credentials).values({ userId: id, passwordHash: await hash(parsed.data.password, 12) });
    await createUniqueProfile(cloudDb, id, parsed.data.name);
  } catch (error) {
    await cloudDb.delete(users).where(eq(users.id, id));
    throw error;
  }
  return Response.json({ created: true }, { status: 201 });
}
