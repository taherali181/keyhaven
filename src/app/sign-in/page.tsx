import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { signIn } from '@/auth';

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="editorial-panel w-full max-w-md p-8 sm:p-10">
        <BookOpen className="h-7 w-7 text-[var(--color-accent)]" />
        <p className="eyebrow mt-7">Keep your place</p>
        <h1 className="mt-2 font-serif text-4xl font-medium">Enter KeyHaven</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Sign in to carry reading progress, practice history, and verified scores between devices. Guest use remains available.</p>
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/profile' }); }}>
          <button className="mt-8 w-full rounded-lg bg-[var(--color-accent)] px-4 py-3 text-xs font-bold text-[var(--bg-primary)]">Continue with Google</button>
        </form>
        <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-[var(--text-muted)]"><span className="h-px flex-1 bg-[var(--color-border)]" />or email<span className="h-px flex-1 bg-[var(--color-border)]" /></div>
        <form action={async formData => { 'use server'; await signIn('resend', formData, { redirectTo: '/profile' }); }} className="space-y-3">
          <label className="block text-xs text-[var(--text-secondary)]">Email address<input required name="email" type="email" className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--bg-secondary)] px-3 py-3 text-[var(--text-primary)]" /></label>
          <button className="w-full rounded-lg border border-[var(--color-border)] px-4 py-3 text-xs font-bold">Send a sign-in link</button>
        </form>
        <Link href="/stories" className="mt-7 block text-center text-xs text-[var(--text-muted)] hover:text-[var(--color-accent)]">Continue as a guest</Link>
      </section>
    </main>
  );
}
