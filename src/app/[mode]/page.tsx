import { notFound } from 'next/navigation';
import { KeyHavenApp } from '@/components/layout/KeyHavenApp';
import { TypingMode } from '@/types';
import { MODES, ROUTE_ALIASES } from '@/lib/navigation';

export default async function ModePage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  const resolved = ROUTE_ALIASES[mode] ?? mode as TypingMode;
  if (!MODES.includes(resolved)) notFound();
  return <KeyHavenApp initialMode={resolved} />;
}
