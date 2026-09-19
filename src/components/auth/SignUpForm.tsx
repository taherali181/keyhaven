'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { AccountsOffNotice } from './AuthShell';
import { GoogleButton } from './GoogleButton';

export function SignUpForm({ callbackUrl, accounts, google }: { callbackUrl: string; accounts: boolean; google: boolean }) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email'));
    const password = String(data.get('password'));
    const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), email, password }) });
    const payload = await response.json().catch(() => ({ error: 'Something went wrong. Please try again.' }));
    if (!response.ok) { setMessage(payload.error); setPending(false); return; }
    await signIn('credentials', { email, password, callbackUrl });
  };
  return <>
    {!accounts && <AccountsOffNotice />}
    <form onSubmit={submit} className="auth-form">
      <label>Name<input name="name" required minLength={2} autoComplete="name" disabled={!accounts} /></label>
      <label>Email<input name="email" required type="email" autoComplete="email" disabled={!accounts} /></label>
      <label>Password<input name="password" required type="password" minLength={10} autoComplete="new-password" disabled={!accounts} /><small>At least 10 characters, with a letter and a number.</small></label>
      {message && <p className="auth-error" role="alert">{message}</p>}
      <button disabled={pending || !accounts}>{pending ? 'Creating…' : 'Create account'}</button>
    </form>
    <GoogleButton enabled={google && accounts} callbackUrl={callbackUrl} />
    <p className="auth-link">Already have an account? <Link href={`/sign-in${callbackUrl !== '/profile' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}>Sign in</Link></p>
  </>;
}
