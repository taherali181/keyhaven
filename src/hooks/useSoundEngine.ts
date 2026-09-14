'use client';

import { useEffect, useCallback } from 'react';
import { soundEngine } from '@/lib/audio-engine';
import { SwitchSound, AmbientSound } from '@/types';

export function useSoundEngine(
  switchSound: SwitchSound,
  soundVolume: number,
  ambientSound: AmbientSound,
  ambientVolume: number,
  muted = false
) {
  // Muting stops the ambience (volume 0) but keeps the chosen sound and volume for when it's unmuted.
  useEffect(() => {
    soundEngine.setAmbient(ambientSound, muted ? 0 : ambientVolume);
  }, [ambientSound, ambientVolume, muted]);

  const playKeyPress = useCallback(
    (key: string) => {
      if (muted) return;
      const isSpecial = key === ' ' || key === 'Enter' || key === 'Backspace';
      soundEngine.playKeySound(switchSound, soundVolume, isSpecial);
    },
    [muted, switchSound, soundVolume]
  );

  return { playKeyPress };
}
