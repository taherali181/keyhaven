'use client';

import React from 'react';
import { BookOpenText, Keyboard } from 'lucide-react';
import type { UserSettings } from '@/types';

type StoryMode = UserSettings['storyMode'];

const MODES: Array<{ id: StoryMode; label: string; name: string; icon: React.ReactNode }> = [
  { id: 'read', label: 'Read', name: 'Reading mode', icon: <BookOpenText aria-hidden="true" /> },
  { id: 'type', label: 'Type', name: 'Typing mode', icon: <Keyboard aria-hidden="true" /> }
];

/** Read / Type segmented control for the Stories title bar. */
export function StoryModeToggle({ mode, onChange }: { mode: StoryMode; onChange: (mode: StoryMode) => void }) {
  return <div className="story-mode-toggle" data-mode={mode} role="radiogroup" aria-label="Story mode">
    <span className="story-mode-pill" aria-hidden="true" />
    {MODES.map(item => (
      <button key={item.id} type="button" role="radio" aria-checked={mode === item.id} aria-label={item.name} title={item.name} onClick={() => onChange(item.id)}>
        {item.icon}<span>{item.label}</span>
      </button>
    ))}
  </div>;
}
