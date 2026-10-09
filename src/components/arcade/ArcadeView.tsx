'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { UserSettings } from '@/types';
import { db } from '@/lib/db';
import { LeaderboardView } from '@/components/analytics/LeaderboardView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { arcadeBests } from '@/lib/profile-stats';
import { dailySeed } from '@/lib/arcade';
import { GAMES } from './registry';

interface ArcadeViewProps { settings: UserSettings; onKeyPress: (key: string) => void; }
type ArcadeTab = 'play' | 'daily' | 'leaderboard';

/** The day's number, so the daily game changes at midnight. */
const dayNumber = (date: Date) => Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000);

export const ArcadeView: React.FC<ArcadeViewProps> = ({ settings, onKeyPress }) => {
  const [activeGame, setActiveGame] = useState(GAMES[0].id);
  const [view, setView] = useState<ArcadeTab>('play');
  const [dailyDate, setDailyDate] = useState('');
  const [version, setVersion] = useState(0);
  const [bests, setBests] = useState(() => arcadeBests([]));
  // Free play gets fresh content each visit; the fixed first value keeps server and client renders the same.
  const [playSeed, setPlaySeed] = useState('play');
  const [daySeed, setDaySeed] = useState('daily');
  // Today's game is worked out after mounting, from the visitor's own clock.
  const [todayGame, setTodayGame] = useState<string | null>(null);
  useEffect(() => { queueMicrotask(() => {
    setPlaySeed(`play:${Math.random().toString(36).slice(2)}`);
    setTodayGame(GAMES[dayNumber(new Date()) % GAMES.length].label);
  }); }, []);

  useEffect(() => {
    let cancelled = false;
    void db.arcadeScores.toArray().then(scores => { if (!cancelled) setBests(arcadeBests(scores)); }).catch(() => {});
    return () => { cancelled = true; };
  }, [version]);

  const recorded = useCallback(() => setVersion(value => value + 1), []);
  const changeView = (next: ArcadeTab) => {
    if (next === 'daily') {
      const today = new Date();
      setDailyDate(today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
      setDaySeed(dailySeed(today));
      setActiveGame(GAMES[dayNumber(today) % GAMES.length].id);
    }
    setView(next);
  };
  const game = GAMES.find(item => item.id === activeGame) ?? GAMES[0];
  const gameBest = bests.find(entry => entry.id === game.id);
  const Game = game.Game;

  return (
    <section className="speed-shell arcade-shell">
      <SectionHeader eyebrow="Play with purpose" title="Arcade" tabs={[{ id: 'play', label: 'Play' }, { id: 'daily', label: 'Daily' }, { id: 'leaderboard', label: 'Records' }]} active={view} onChange={changeView} layoutId="arcade-tab" facts={view === 'leaderboard' ? undefined : [
        { label: game.label, value: gameBest?.best ? `Best ${gameBest.best}` : 'Not played yet' },
        { label: 'Rounds', value: String(gameBest?.rounds ?? 0) },
        ...(todayGame ? [{ label: 'Daily game', value: todayGame }] : [])
      ]} settingsLabel={settings.zenMode ? undefined : 'Arcade'} />
      {view === 'leaderboard' ? <LeaderboardView embedded /> : <>
        {view === 'daily'
          ? <div className="arc-daily">
            <span className="arc-daily-icon">{game.icon}</span>
            <div><p className="eyebrow">Today’s challenge · {dailyDate}</p><h2>{game.label}</h2><p>{game.description} Everyone gets the same round today; tomorrow brings a different game.</p></div>
          </div>
          : <div className="arc-games" role="group" aria-label="Choose a game">
            {GAMES.map(item => {
              const best = bests.find(entry => entry.id === item.id)?.best;
              return <button key={item.id} type="button" className="arc-game" aria-pressed={activeGame === item.id} onClick={() => setActiveGame(item.id)}>
                <span className="arc-game-icon">{item.icon}</span>
                <span className="arc-game-text"><strong>{item.label}</strong><small>{item.description}</small></span>
                <span className="arc-game-best">{best ? <>Best <b>{best}</b></> : 'Not played yet'}</span>
              </button>;
            })}
          </div>}
        <Game key={`${game.id}:${view}`} settings={settings} onKeyPress={onKeyPress} onRecorded={recorded} seed={view === 'daily' ? daySeed : playSeed} />
      </>}
    </section>
  );
};
