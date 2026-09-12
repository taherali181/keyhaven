'use client';

import React from 'react';

interface VirtualKeyboardHeatmapProps {
  activeKey?: string;
  errorHeatmap?: Record<string, number>;
  highlightKeys?: string[];
  showFingers?: boolean;
}

interface KeyConfig {
  key: string;
  shift?: string;
  width?: string;
  finger?: string;
  home?: boolean;
  bump?: boolean;
}

const KEYBOARD_ROWS: KeyConfig[][] = [
  [
    { key: '`', shift: '~', finger: 'left-pinky' },
    { key: '1', shift: '!', finger: 'left-pinky' },
    { key: '2', shift: '@', finger: 'left-ring' },
    { key: '3', shift: '#', finger: 'left-middle' },
    { key: '4', shift: '$', finger: 'left-index' },
    { key: '5', shift: '%', finger: 'left-index' },
    { key: '6', shift: '^', finger: 'right-index' },
    { key: '7', shift: '&', finger: 'right-index' },
    { key: '8', shift: '*', finger: 'right-middle' },
    { key: '9', shift: '(', finger: 'right-ring' },
    { key: '0', shift: ')', finger: 'right-pinky' },
    { key: '-', shift: '_', finger: 'right-pinky' },
    { key: '=', shift: '+', finger: 'right-pinky' },
    { key: 'Backspace', width: 'w-16', finger: 'right-pinky' }
  ],
  [
    { key: 'Tab', width: 'w-12', finger: 'left-pinky' },
    { key: 'q', finger: 'left-pinky' },
    { key: 'w', finger: 'left-ring' },
    { key: 'e', finger: 'left-middle' },
    { key: 'r', finger: 'left-index' },
    { key: 't', finger: 'left-index' },
    { key: 'y', finger: 'right-index' },
    { key: 'u', finger: 'right-index' },
    { key: 'i', finger: 'right-middle' },
    { key: 'o', finger: 'right-ring' },
    { key: 'p', finger: 'right-pinky' },
    { key: '[', shift: '{', finger: 'right-pinky' },
    { key: ']', shift: '}', finger: 'right-pinky' },
    { key: '\\', shift: '|', width: 'w-12', finger: 'right-pinky' }
  ],
  [
    { key: 'Caps', width: 'w-14', finger: 'left-pinky' },
    { key: 'a', finger: 'left-pinky', home: true },
    { key: 's', finger: 'left-ring', home: true },
    { key: 'd', finger: 'left-middle', home: true },
    { key: 'f', finger: 'left-index', home: true, bump: true },
    { key: 'g', finger: 'left-index' },
    { key: 'h', finger: 'right-index' },
    { key: 'j', finger: 'right-index', home: true, bump: true },
    { key: 'k', finger: 'right-middle', home: true },
    { key: 'l', finger: 'right-ring', home: true },
    { key: ';', shift: ':', finger: 'right-pinky', home: true },
    { key: "'", shift: '"', finger: 'right-pinky' },
    { key: 'Enter', width: 'w-16', finger: 'right-pinky' }
  ],
  [
    { key: 'Shift', width: 'w-20', finger: 'left-pinky' },
    { key: 'z', finger: 'left-pinky' },
    { key: 'x', finger: 'left-ring' },
    { key: 'c', finger: 'left-middle' },
    { key: 'v', finger: 'left-index' },
    { key: 'b', finger: 'left-index' },
    { key: 'n', finger: 'right-index' },
    { key: 'm', finger: 'right-index' },
    { key: ',', shift: '<', finger: 'right-middle' },
    { key: '.', shift: '>', finger: 'right-ring' },
    { key: '/', shift: '?', finger: 'right-pinky' },
    { key: 'Shift', width: 'w-20', finger: 'right-pinky' }
  ],
  [
    { key: 'Ctrl', width: 'w-12', finger: 'left-pinky' },
    { key: 'Alt', width: 'w-12', finger: 'left-thumb' },
    { key: ' ', width: 'w-64', finger: 'thumb' },
    { key: 'Alt', width: 'w-12', finger: 'right-thumb' },
    { key: 'Ctrl', width: 'w-12', finger: 'right-pinky' }
  ]
];

const FINGER_COLORS: Record<string, string> = {
  'left-pinky': 'border-l-2 border-l-rose-500/70',
  'left-ring': 'border-l-2 border-l-amber-500/70',
  'left-middle': 'border-l-2 border-l-emerald-500/70',
  'left-index': 'border-l-2 border-l-sky-500/70',
  'right-index': 'border-l-2 border-l-sky-500/70',
  'right-middle': 'border-l-2 border-l-emerald-500/70',
  'right-ring': 'border-l-2 border-l-amber-500/70',
  'right-pinky': 'border-l-2 border-l-rose-500/70',
  'thumb': 'border-l-2 border-l-purple-500/70'
};

export const VirtualKeyboardHeatmap: React.FC<VirtualKeyboardHeatmapProps> = ({
  activeKey = '',
  errorHeatmap = {},
  highlightKeys = [],
  showFingers = true
}) => {
  const normActiveKey = activeKey ? activeKey.toLowerCase() : '';

  return (
    <div className="w-full max-w-4xl mx-auto p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-border)] shadow-md select-none">
      <div className="flex flex-col gap-1.5 items-center">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex gap-1.5 justify-center w-full">
            {row.map((k, kIdx) => {
              const keyLabel = k.key;
              const isKeyActive = normActiveKey === keyLabel.toLowerCase() || (keyLabel === ' ' && normActiveKey === ' ');
              const isHighlighted = highlightKeys.includes(keyLabel.toLowerCase());
              const errors = errorHeatmap[keyLabel.toLowerCase()] || 0;

              let errorBg = '';
              if (errors > 5) {
                errorBg = 'bg-rose-500/30 text-rose-300 border-rose-500/50';
              } else if (errors > 2) {
                errorBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
              } else if (errors > 0) {
                errorBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
              }

              const widthClass = k.width || 'w-9 sm:w-11';
              const fingerBorder = showFingers && k.finger ? FINGER_COLORS[k.finger] || '' : '';

              return (
                <div
                  key={kIdx}
                  className={`relative flex flex-col items-center justify-center h-10 sm:h-12 rounded-lg text-xs font-mono font-medium border transition-all duration-100 ${widthClass} ${fingerBorder} ${
                    isKeyActive
                      ? 'bg-[var(--color-accent)] text-white scale-95 shadow-md border-[var(--color-accent)]'
                      : isHighlighted
                      ? 'bg-[var(--color-highlight)] text-[var(--text-primary)] border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/50'
                      : errorBg
                      ? errorBg
                      : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--color-border)] hover:bg-[var(--bg-primary)]'
                  }`}
                >
                  <span className="capitalize">{keyLabel === ' ' ? 'Space' : keyLabel}</span>
                  {k.bump && (
                    <span className="absolute bottom-1 w-2.5 h-[2px] rounded-full bg-[var(--text-muted)]" />
                  )}
                  {errors > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-rose-600 text-white shadow-xs">
                      {errors}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showFingers && (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 pt-3 border-t border-[var(--color-border)] text-[11px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Pinky
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Ring
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Middle
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Index
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Thumb
          </span>
        </div>
      )}
    </div>
  );
};
