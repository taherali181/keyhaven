import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { cloudDb } from '@/server/db';
import { accounts, authenticators, sessions, users, verificationTokens } from '@/server/schema';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: cloudDb ? DrizzleAdapter(cloudDb, { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens, authenticatorsTable: authenticators }) : undefined,
  session: { strategy: cloudDb ? 'database' : 'jwt' },
  providers: [
    Google,
    Resend({ from: process.env.AUTH_EMAIL_FROM ?? 'KeyHaven <hello@localhost>' })
  ],
  pages: { signIn: '/sign-in' },
  callbacks: {
    session({ session, user, token }) {
      if (session.user) session.user.id = user?.id ?? token?.sub ?? '';
      return session;
    }
  }
});
