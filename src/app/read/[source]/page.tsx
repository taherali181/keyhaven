import { notFound } from 'next/navigation';
import { KeyHavenApp } from '@/components/layout/KeyHavenApp';
import type { TypingMode } from '@/types';

export default async function ReadSourcePage({ params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  const mode = ({ stories: 'stories', quotes: 'quotes', library: 'stories' } as Record<string, TypingMode>)[source];
  if (!mode) notFound();
  return <KeyHavenApp initialMode={mode} initialLibraryOpen={source === 'library'} />;
}
