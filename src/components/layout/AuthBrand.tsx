import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';

export function AuthBrand() {
  return <div className="auth-brand"><Link href="/stories" className="auth-wordmark" aria-label="KeyHaven home"><BrandLogo /></Link><p>Read deeply. Type naturally.</p></div>;
}
