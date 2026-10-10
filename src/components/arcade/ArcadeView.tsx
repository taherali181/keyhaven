'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { UserSettings } from '@/types';
import { db } from '@/lib/db';
import { LeaderboardView } from '@/components/analytics/LeaderboardView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { arcadeBests } from '@/lib/profile-stats';
import { GAMES, type ArcadeGameEntry } from './registry';
import { ArcadeGamePage } from './ArcadeGamePage';

interface ArcadeViewProps { settings: UserSettings; onKeyPress: (key: string) => void; initialGame?: string; }
type ArcadeTab = 'games' | 'records';
type GameId = ArcadeGameEntry['id'];

/** The day's number, so the daily game changes at midnight. */
const dayNumber = (date: Date) => Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000);

/** The game an address opens, e.g. /arcade/word-rain, or null for the Arcade home. */
const gameFromPath = (pathname: string): GameId | null => {
  const id = pathname.match(/^\/arcade\/([^/]+)/)?.[1];
  return GAMES.find(game => game.id === id)?.id ?? null;
};

export const ArcadeView: React.FC<ArcadeViewProps> = ({ settings, onKeyPress, initialGame }) => {
  const [openGame, setOpenGame] = useState<GameId | null>(() => GAMES.find(game => game.id === initialGame)?.id ?? null);
  const [view, setView] = useState<ArcadeTab>('games');
  const [version, setVersion] = useState(0);
  const [bests, setBests] = useState(() => arcadeBests([]));
  // Today's game is worked out after mounting, from the visitor's own clock.
  const [todayGame, setTodayGame] = useState<ArcadeGameEntry | null>(null);
  useEffect(() => { queueMicrotask(() => {
    setTodayGame(GAMES[dayNumber(new Date()) % GAMES.length]);
    // The address wins over the first render's game (e.g. coming back to the Arcade from another section).
    setOpenGame(gameFromPath(window.location.pathname));
  }); }, []);

  // Back and forward move between the Arcade home and a game's page.
  useEffect(() => {
    const onPop = () => setOpenGame(gameFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void db.arcadeScores.toArray().then(scores => { if (!cancelled) setBests(arcadeBests(scores)); }).catch(() => {});
    return () => { cancelled = true; };
  }, [version]);

  const recorded = useCallback(() => setVersion(value => value + 1), []);
  const open = (id: GameId) => { window.history.pushState({}, '', `/arcade/${id}`); setOpenGame(id); window.scrollTo({ top: 0 }); };
  const back = () => { window.history.pushState({}, '', '/arcade'); setOpenGame(null); };

  const game = GAMES.find(item => item.id === openGame);
  if (game) return <ArcadeGamePage key={game.id} game={game} best={bests.find(entry => entry.id === game.id)?.best ?? null} settings={settings} onKeyPress={onKeyPress} onRecorded={recorded} onBack={back} />;

  const rounds = bests.reduce((sum, entry) => sum + entry.rounds, 0);
  const tried = bests.filter(entry => entry.rounds > 0).length;
  return (
    <section className="speed-shell arcade-shell">
      <SectionHeader eyebrow="Play with purpose" title="Arcade" tabs={[{ id: 'games', label: 'Games' }, { id: 'records', label: 'Records' }]} active={view} onChange={setView} layoutId="arcade-tab" facts={view === 'records' ? undefined : [
        { label: 'Rounds played', value: String(rounds) },
        { label: 'Games tried', value: `${tried} of ${GAMES.length}` },
        ...(todayGame ? [{ label: 'Daily game', value: todayGame.label }] : [])
      ]} settingsLabel={settings.zenMode ? undefined : 'Arcade'} />
      {view === 'records'
        ? <LeaderboardView embedded />
        : <div className="arc-games" role="group" aria-label="Games">
          {GAMES.map(item => {
            const best = bests.find(entry => entry.id === item.id)?.best;
            return <button key={item.id} type="button" className="arc-game" onClick={() => open(item.id)}>
              <span className="arc-game-icon">{item.icon}</span>
              <span className="arc-game-text"><strong>{item.label}</strong><small>{item.description}</small></span>
              <span className="arc-game-best">{best ? <>Best <b>{best}</b></> : 'Not played yet'}</span>
              {todayGame?.id === item.id && <span className="arc-game-badge">Daily challenge</span>}
            </button>;
          })}
        </div>}
    </section>
  );
};
