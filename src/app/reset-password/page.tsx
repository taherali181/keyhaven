'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthBrand } from '@/components/layout/AuthBrand';

export default function ResetPasswordPage() {
  const [message, setMessage] = useState(''); const [done, setDone] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const token = new URLSearchParams(window.location.search).get('token') ?? ''; const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password: data.get('password') }) }); const payload = await response.json(); setDone(response.ok); setMessage(response.ok ? 'Your password has been changed.' : payload.error); };
  return <main className="auth-page"><section><AuthBrand /><p className="eyebrow">Account recovery</p><h1>Choose a new password</h1><p className="auth-note">Use at least 10 characters with a letter and number.</p>{done ? <p className="auth-message">{message} <Link href="/sign-in">Sign in now.</Link></p> : <form onSubmit={submit} className="auth-form"><label>New password<input name="password" required type="password" minLength={10} autoComplete="new-password" /></label>{message && <p className="auth-error">{message}</p>}<button>Save new password</button></form>}</section></main>;
}
