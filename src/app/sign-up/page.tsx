import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { safeCallback } from '@/lib/auth-links';
import { accountsConfigured, googleConfigured } from '@/server/auth-config';

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <AuthShell eyebrow="Begin quietly" title="Create your account" note="Keep your reading, lessons and records backed up and in step across devices." footer={<Link href="/" className="guest-link">Continue without an account</Link>}>
    <SignUpForm callbackUrl={safeCallback(query.callbackUrl)} accounts={accountsConfigured()} google={googleConfigured()} />
  </AuthShell>;
}
