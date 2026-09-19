'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { clearSessionCache } from '@/lib/session';
import { AccountsOffNotice } from './AuthShell';
import { GoogleButton } from './GoogleButton';

export function SignInForm({ callbackUrl, accounts, google, error }: { callbackUrl: string; accounts: boolean; google: boolean; error: string | null }) {
  const router = useRouter();
  const [message, setMessage] = useState(error ?? '');
  const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const data = new FormData(event.currentTarget);
    const result = await signIn('credentials', { email: data.get('email'), password: data.get('password'), redirect: false });
    if (result?.error) { setMessage('Email or password is incorrect.'); setPending(false); return; }
    clearSessionCache();
    router.push(callbackUrl);
  };
  return <>
    {!accounts && <AccountsOffNotice />}
    <form onSubmit={submit} className="auth-form">
      <label>Email<input name="email" required type="email" autoComplete="email" disabled={!accounts} /></label>
      <label><span className="auth-label-row">Password<Link className="forgot-link" href="/forgot-password">Forgot password?</Link></span><input name="password" required type="password" autoComplete="current-password" disabled={!accounts} /></label>
      {message && <p className="auth-error" role="alert">{message}</p>}
      <button disabled={pending || !accounts}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <GoogleButton enabled={google && accounts} callbackUrl={callbackUrl} />
    <p className="auth-link">New to KeyHaven? <Link href={`/sign-up${callbackUrl !== '/profile' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}>Create an account</Link></p>
  </>;
}
