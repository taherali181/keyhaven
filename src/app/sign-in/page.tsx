'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [message, setMessage] = useState(''); const [pending, setPending] = useState(false);
  const router = useRouter();
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setPending(true); setMessage(''); const data = new FormData(event.currentTarget); const result = await signIn('credentials', { email: data.get('email'), password: data.get('password'), redirect: false }); if (result?.error) { setMessage('Email or password is incorrect.'); setPending(false); } else router.push('/profile'); };
  return <main className="auth-page"><section><Link href="/stories" className="auth-wordmark">KeyHaven</Link><p className="eyebrow">Welcome back</p><h1>Sign in</h1><p className="auth-note">Return to your books, practice, and progress.</p><form onSubmit={submit} className="auth-form"><label>Email<input name="email" required type="email" autoComplete="email" /></label><label>Password<input name="password" required type="password" autoComplete="current-password" /></label>{message && <p className="auth-error">{message}</p>}<button disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button></form><Link className="forgot-link" href="/forgot-password">Forgot password?</Link><div className="auth-divider">or</div><button className="google-button" onClick={() => signIn('google', { callbackUrl: '/profile' })}>Continue with Google</button><p className="auth-link">New to KeyHaven? <Link href="/sign-up">Create an account</Link></p><Link href="/stories" className="guest-link">Continue as a guest</Link></section></main>;
}
