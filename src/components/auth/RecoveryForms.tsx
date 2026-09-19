'use client';

import { useState } from 'react';
import Link from 'next/link';

export function ForgotPasswordForm({ available }: { available: boolean }) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: data.get('email') }) });
    const payload = await response.json().catch(() => ({ error: 'Something went wrong. Please try again.' }));
    setMessage(response.ok ? 'If an account exists, a reset link is on its way.' : payload.error);
    setPending(false);
  };
  return <>
    {!available && <p className="auth-notice" role="status">Password reset emails aren’t set up on this server yet.</p>}
    <form onSubmit={submit} className="auth-form">
      <label>Email<input name="email" required type="email" autoComplete="email" disabled={!available} /></label>
      {message && <p className="auth-message" role="status">{message}</p>}
      <button disabled={pending || !available}>{pending ? 'Sending…' : 'Send reset link'}</button>
    </form>
    <p className="auth-link"><Link href="/sign-in">Back to sign in</Link></p>
  </>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password: data.get('password') }) });
    const payload = await response.json().catch(() => ({ error: 'Something went wrong. Please try again.' }));
    setDone(response.ok);
    setMessage(response.ok ? 'Your password has been changed.' : payload.error);
  };
  if (done) return <p className="auth-message" role="status">{message} <Link href="/sign-in">Sign in now.</Link></p>;
  return <form onSubmit={submit} className="auth-form">
    <label>New password<input name="password" required type="password" minLength={10} autoComplete="new-password" /><small>At least 10 characters, with a letter and a number.</small></label>
    {message && <p className="auth-error" role="alert">{message}</p>}
    <button>Save new password</button>
  </form>;
}
