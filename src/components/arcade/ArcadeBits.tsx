import React from 'react';
import type { UserSettings } from '@/types';

/** What every Arcade game receives. `seed` fixes the round's content (the same all day for the daily challenge). */
export interface GameProps {
  settings: UserSettings;
  onKeyPress: (key: string) => void;
  onRecorded: () => void;
  seed: string;
}

export function Metric({ label, value }: { label: string; value: string }) {
  return <div className="arc-metric"><span>{label}</span><strong>{value}</strong></div>;
}
