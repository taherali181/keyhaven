import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignInForm } from '@/components/auth/SignInForm';
import { safeCallback, signInErrorMessage } from '@/lib/auth-links';
import { accountsConfigured, googleConfigured } from '@/server/auth-config';

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <AuthShell eyebrow="Welcome back" title="Sign in" note="Return to your books, practice and progress, on any device." footer={<Link href="/" className="guest-link">Continue without an account</Link>}>
    <SignInForm callbackUrl={safeCallback(query.callbackUrl)} accounts={accountsConfigured()} google={googleConfigured()} error={signInErrorMessage(query.error)} />
  </AuthShell>;
}
