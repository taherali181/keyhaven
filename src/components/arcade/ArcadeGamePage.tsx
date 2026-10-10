'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import type { UserSettings } from '@/types';
import { spring } from '@/lib/motion';
import { dailySeed } from '@/lib/arcade';
import { LeaderboardView } from '@/components/analytics/LeaderboardView';
import { SectionFacts, SettingsTab } from '@/components/ui/SectionHeader';
import type { ArcadeGameEntry } from './registry';

type GameTab = 'play' | 'daily' | 'leaderboard';
const TABS: Array<{ id: GameTab; label: string }> = [{ id: 'play', label: 'Play' }, { id: 'daily', label: 'Daily' }, { id: 'leaderboard', label: 'Leaderboard' }];

/** One Arcade game on its own page (/arcade/<id>): free play, today's shared round, and the game's own board. */
export function ArcadeGamePage({ game, best, settings, onKeyPress, onRecorded, onBack }: {
  game: ArcadeGameEntry; best: string | null; settings: UserSettings; onKeyPress: (key: string) => void; onRecorded: () => void; onBack: () => void;
}) {
  const [view, setView] = useState<GameTab>('play');
  // Free play gets fresh content each visit; the fixed first values keep server and client renders the same.
  const [playSeed, setPlaySeed] = useState('play');
  const [daySeed, setDaySeed] = useState('daily');
  const [dailyDate, setDailyDate] = useState('');
  useEffect(() => { queueMicrotask(() => {
    const today = new Date();
    setPlaySeed(`play:${Math.random().toString(36).slice(2)}`);
    setDaySeed(dailySeed(today));
    setDailyDate(today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
  }); }, []);
  const Game = game.Game;

  return <section className="speed-shell arcade-shell arc-page">
    <header className="kh-bar-row arc-page-bar">
      <div className="kh-bar glass">
        <button type="button" className="arc-back" onClick={onBack} aria-label="Back to the Arcade"><ArrowLeft aria-hidden="true" /></button>
        <span className="arc-game-icon arc-page-icon">{game.icon}</span>
        <div className="kh-bar-title">
          <p className="eyebrow">Arcade</p>
          <h1>{game.label}</h1>
        </div>
        <p className="kh-bar-description arc-page-description">{game.description}</p>
        <SectionFacts facts={[{ label: 'Your best', value: best ?? 'Not played yet' }]} />
      </div>
      <div className="kh-side glass">
        <nav className="kh-tabs" aria-label={`${game.label} views`}>
          {TABS.map(tab => <button key={tab.id} type="button" className="kh-tab" aria-current={tab.id === view ? 'page' : undefined} onClick={() => setView(tab.id)}>
            {tab.id === view && <motion.span layoutId="arcade-game-tab" className="kh-tab-pill" transition={spring.snappy} />}
            <span>{tab.label}</span>
          </button>)}
        </nav>
        {!settings.zenMode && <SettingsTab label="Arcade" />}
      </div>
    </header>
    {view === 'leaderboard'
      ? <LeaderboardView embedded board={game.id} />
      : <>
        {view === 'daily' && <p className="arc-page-daily">Today’s challenge{dailyDate && <> · <b>{dailyDate}</b></>}; everyone gets the same round.</p>}
        <Game key={`${game.id}:${view}`} settings={settings} onKeyPress={onKeyPress} onRecorded={onRecorded} seed={view === 'daily' ? daySeed : playSeed} />
      </>}
  </section>;
}
