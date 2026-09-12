'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function SignUpPage() {
  const [message, setMessage] = useState(''); const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setPending(true); setMessage(''); const data = new FormData(event.currentTarget);
    const email = String(data.get('email')); const password = String(data.get('password'));
    const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), email, password }) });
    const payload = await response.json(); if (!response.ok) { setMessage(payload.error); setPending(false); return; }
    await signIn('credentials', { email, password, callbackUrl: '/profile' });
  };
  return <AuthShell eyebrow="Begin quietly" title="Create your account" note="Sync reading, lessons, and verified records across your devices."><form onSubmit={submit} className="auth-form"><label>Name<input name="name" required minLength={2} autoComplete="name" /></label><label>Email<input name="email" required type="email" autoComplete="email" /></label><label>Password<input name="password" required type="password" minLength={10} autoComplete="new-password" /><small>At least 10 characters with a letter and number.</small></label>{message && <p className="auth-error">{message}</p>}<button disabled={pending}>{pending ? 'Creating…' : 'Create account'}</button></form><div className="auth-divider">or</div><button className="google-button" onClick={() => signIn('google', { callbackUrl: '/profile' })}>Continue with Google</button><p className="auth-link">Already have an account? <Link href="/sign-in">Sign in</Link></p></AuthShell>;
}

function AuthShell({ eyebrow, title, note, children }: { eyebrow: string; title: string; note: string; children: React.ReactNode }) { return <main className="auth-page"><section><Link href="/stories" className="auth-wordmark">KeyHaven</Link><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="auth-note">{note}</p>{children}</section></main>; }
