import { notFound } from 'next/navigation';
import { KeyHavenApp } from '../page';
import { TypingMode } from '@/types';
import { MODES } from '@/lib/navigation';

export default async function ModePage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!MODES.includes(mode as TypingMode)) notFound();
  return <KeyHavenApp initialMode={mode as TypingMode} />;
}
