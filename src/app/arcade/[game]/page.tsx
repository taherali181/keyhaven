import { notFound } from 'next/navigation';
import { KeyHavenApp } from '@/components/layout/KeyHavenApp';
import { GAMES } from '@/components/arcade/registry';

/** One Arcade game on its own page, e.g. /arcade/word-rain. */
export default async function ArcadeGameRoute({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!GAMES.some(entry => entry.id === game)) notFound();
  return <KeyHavenApp initialMode="arcade" initialArcadeGame={game} />;
}
