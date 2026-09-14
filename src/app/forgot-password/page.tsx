'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthBrand } from '@/components/layout/AuthBrand';

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState(''); const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setPending(true); const data = new FormData(event.currentTarget); const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: data.get('email') }) }); const payload = await response.json(); setMessage(response.ok ? 'If an account exists, a reset link is on its way.' : payload.error); setPending(false); };
  return <main className="auth-page"><section><AuthBrand /><p className="eyebrow">Account recovery</p><h1>Reset your password</h1><p className="auth-note">We will send a private link that expires in 30 minutes.</p><form onSubmit={submit} className="auth-form"><label>Email<input name="email" required type="email" autoComplete="email" /></label>{message && <p className="auth-message">{message}</p>}<button disabled={pending}>{pending ? 'Sending…' : 'Send reset link'}</button></form><p className="auth-link"><Link href="/sign-in">Back to sign in</Link></p></section></main>;
}
