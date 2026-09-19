import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/ui/BrandLogo';

/** The frame every account page shares: quiet scenery behind one glass card. */
export function AuthShell({ eyebrow, title, note, children, footer }: { eyebrow: string; title: string; note: string; children: ReactNode; footer?: ReactNode }) {
  return <main className="auth-page">
    <div className="auth-scenery" aria-hidden="true" />
    <section className="auth-card glass glass-panel">
      <div className="auth-brand">
        <Link href="/" className="auth-wordmark" aria-label="KeyHaven home"><BrandLogo /></Link>
      </div>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="auth-note">{note}</p>
      {children}
    </section>
    {footer && <div className="auth-footer">{footer}</div>}
  </main>;
}

/** Shown when this server has no account database yet. */
export function AccountsOffNotice() {
  return <p className="auth-notice" role="status">Accounts aren’t set up on this server yet. Your reading and practice are still saved in this browser.</p>;
}
