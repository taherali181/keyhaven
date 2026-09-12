'use client';

import { useEffect, useCallback } from 'react';
import { soundEngine } from '@/lib/audio-engine';
import { SwitchSound, AmbientSound } from '@/types';

export function useSoundEngine(
  switchSound: SwitchSound,
  soundVolume: number,
  ambientSound: AmbientSound,
  ambientVolume: number
) {
  useEffect(() => {
    soundEngine.setAmbient(ambientSound, ambientVolume);
  }, [ambientSound, ambientVolume]);

  const playKeyPress = useCallback(
    (key: string) => {
      const isSpecial = key === ' ' || key === 'Enter' || key === 'Backspace';
      soundEngine.playKeySound(switchSound, soundVolume, isSpecial);
    },
    [switchSound, soundVolume]
  );

  return { playKeyPress };
}
