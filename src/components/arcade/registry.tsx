import React from 'react';
import { Braces, CloudRain, Flag, Link2, Target, Zap } from 'lucide-react';
import type { ArcadeScoreRecord } from '@/types';
import type { GameProps } from './ArcadeBits';
import { AccuracyStreak } from './games/AccuracyStreak';
import { AlphabetSprint } from './games/AlphabetSprint';
import { CodeSymbols } from './games/CodeSymbols';
import { GhostRacer } from './games/GhostRacer';
import { WordChain } from './games/WordChain';
import { WordRain } from './games/WordRain';

export interface ArcadeGameEntry {
  /** Also the id its scores are saved under. */
  id: ArcadeScoreRecord['game'];
  label: string;
  description: string;
  icon: React.ReactNode;
  Game: React.ComponentType<GameProps>;
}

/** Every Arcade game, in the order they're offered. The daily challenge cycles through them. */
export const GAMES: ArcadeGameEntry[] = [
  { id: 'alphabet-sprint', label: 'Alphabet Sprint', description: 'Race from A to Z. Every wrong key costs you time.', icon: <Zap aria-hidden="true" />, Game: AlphabetSprint },
  { id: 'word-rain', label: 'Word Rain', description: 'Type falling words before they cross the line.', icon: <CloudRain aria-hidden="true" />, Game: WordRain },
  { id: 'ghost-racer', label: 'Ghost Racer', description: 'Beat a steady rival to the end of a sentence.', icon: <Flag aria-hidden="true" />, Game: GhostRacer },
  { id: 'code-symbols', label: 'Code Symbols', description: 'Brackets, operators and quotes, in real lines of code.', icon: <Braces aria-hidden="true" />, Game: CodeSymbols },
  { id: 'accuracy-streak', label: 'Accuracy Streak', description: 'Keep going as long as you can. One wrong key ends it.', icon: <Target aria-hidden="true" />, Game: AccuracyStreak },
  { id: 'word-chain', label: 'Word Chain', description: 'Each word starts with the last letter of the one before.', icon: <Link2 aria-hidden="true" />, Game: WordChain }
];
