import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { cloudDb } from '@/server/db';
import { accounts, authenticators, credentials as credentialsTable, sessions, users, verificationTokens } from '@/server/schema';
import { createUniqueProfile } from '@/server/accounts';
import { allowAuthAttempt, requestAddress } from '@/server/rate-limit';

const loginSchema = z.object({ email: z.string().email().transform(value => value.trim().toLowerCase()), password: z.string().min(1).max(128) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: cloudDb ? DrizzleAdapter(cloudDb, { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens, authenticatorsTable: authenticators }) : undefined,
  session: { strategy: 'jwt' },
  providers: [
    Google,
    Credentials({
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(input, request) {
        if (!cloudDb) return null;
        const parsed = loginSchema.safeParse(input);
        if (!parsed.success) return null;
        if (!await allowAuthAttempt(cloudDb, `login:${requestAddress(request)}:${parsed.data.email}`, 10, 15 * 60_000)) return null;
        const [row] = await cloudDb.select({ id: users.id, email: users.email, name: users.name, image: users.image, passwordHash: credentialsTable.passwordHash }).from(users).innerJoin(credentialsTable, eq(users.id, credentialsTable.userId)).where(eq(users.email, parsed.data.email)).limit(1);
        if (!row || !await compare(parsed.data.password, row.passwordHash)) return null;
        return { id: row.id, email: row.email, name: row.name, image: row.image };
      }
    })
  ],
  pages: { signIn: '/sign-in' },
  callbacks: {
    jwt({ token, user }) { if (user?.id) token.userId = user.id; return token; },
    session({ session, token }) { if (session.user) session.user.id = String(token.userId ?? token.sub ?? ''); return session; }
  },
  events: {
    async createUser({ user }) { if (cloudDb && user.id) await createUniqueProfile(cloudDb, user.id, user.name ?? user.email ?? 'reader'); }
  }
});
