import { notFound } from 'next/navigation';
import { KeyHavenApp } from '@/app/page';
import type { TypingMode } from '@/types';

export default async function ReadSourcePage({ params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  const mode = ({ stories: 'stories', quotes: 'quotes', library: 'library' } as Record<string, TypingMode>)[source];
  if (!mode) notFound();
  return <KeyHavenApp initialMode={mode} />;
}
