'use client';

import React from 'react';

interface KeyDef {
  id: string;
  label: string;
  /** The character this key types without Shift. */
  char?: string;
  /** The character it types with Shift. */
  shift?: string;
  finger: Finger;
  /** Width in key units. */
  u?: number;
  bump?: boolean;
}

type Finger = 'left-pinky' | 'left-ring' | 'left-middle' | 'left-index' | 'right-index' | 'right-middle' | 'right-ring' | 'right-pinky' | 'thumb';

const key = (char: string, finger: Finger, shift?: string, extra: Partial<KeyDef> = {}): KeyDef => ({ id: `key-${char}`, label: /[a-z]/.test(char) ? char.toUpperCase() : char, char, shift, finger, ...extra });

const ROWS: KeyDef[][] = [
  [key('`', 'left-pinky', '~'), key('1', 'left-pinky', '!'), key('2', 'left-ring', '@'), key('3', 'left-middle', '#'), key('4', 'left-index', '$'), key('5', 'left-index', '%'), key('6', 'right-index', '^'), key('7', 'right-index', '&'), key('8', 'right-middle', '*'), key('9', 'right-ring', '('), key('0', 'right-pinky', ')'), key('-', 'right-pinky', '_'), key('=', 'right-pinky', '+'), { id: 'Backspace', label: 'Back', finger: 'right-pinky', u: 2 }],
  [{ id: 'Tab', label: 'Tab', finger: 'left-pinky', u: 1.5 }, key('q', 'left-pinky'), key('w', 'left-ring'), key('e', 'left-middle'), key('r', 'left-index'), key('t', 'left-index'), key('y', 'right-index'), key('u', 'right-index'), key('i', 'right-middle'), key('o', 'right-ring'), key('p', 'right-pinky'), key('[', 'right-pinky', '{'), key(']', 'right-pinky', '}'), key('\\', 'right-pinky', '|', { u: 1.5 })],
  [{ id: 'Caps', label: 'Caps', finger: 'left-pinky', u: 1.75 }, key('a', 'left-pinky'), key('s', 'left-ring'), key('d', 'left-middle'), key('f', 'left-index', undefined, { bump: true }), key('g', 'left-index'), key('h', 'right-index'), key('j', 'right-index', undefined, { bump: true }), key('k', 'right-middle'), key('l', 'right-ring'), key(';', 'right-pinky', ':'), key("'", 'right-pinky', '"'), { id: 'Enter', label: 'Enter', char: '\n', finger: 'right-pinky', u: 2.25 }],
  [{ id: 'ShiftLeft', label: 'Shift', finger: 'left-pinky', u: 2.25 }, key('z', 'left-pinky'), key('x', 'left-ring'), key('c', 'left-middle'), key('v', 'left-index'), key('b', 'left-index'), key('n', 'right-index'), key('m', 'right-index'), key(',', 'right-middle', '<'), key('.', 'right-ring', '>'), key('/', 'right-pinky', '?'), { id: 'ShiftRight', label: 'Shift', finger: 'right-pinky', u: 2.75 }],
  [{ id: 'Space', label: 'Space', char: ' ', finger: 'thumb', u: 6.25 }]
];

const KEYS = ROWS.flat();

const FINGER_NAMES: Record<Finger, string> = {
  'left-pinky': 'left pinky', 'left-ring': 'left ring finger', 'left-middle': 'left middle finger', 'left-index': 'left index finger',
  'right-index': 'right index finger', 'right-middle': 'right middle finger', 'right-ring': 'right ring finger', 'right-pinky': 'right pinky', thumb: 'thumb'
};

/** The key for a typed character, and which Shift key (opposite hand) it needs, if any. */
export function locateChar(char: string) {
  if (!char) return null;
  const direct = KEYS.find(item => item.char === char);
  if (direct) return { key: direct, shiftId: null as string | null };
  const lower = char.toLowerCase();
  const shifted = KEYS.find(item => (lower !== char && item.char === lower) || item.shift === char);
  if (!shifted) return null;
  return { key: shifted, shiftId: shifted.finger.startsWith('left') ? 'ShiftRight' : 'ShiftLeft' };
}

/** "E, left middle finger" style description of the next character, for the typing guide. */
export function describeKey(char: string) {
  const found = locateChar(char);
  if (!found) return null;
  const label = char === ' ' ? 'Space' : char === '\n' ? 'Enter' : /[a-z]/i.test(char) ? char.toUpperCase() : char;
  const shift = found.shiftId ? ` with ${found.shiftId === 'ShiftLeft' ? 'left' : 'right'} Shift` : '';
  return { label, finger: `${FINGER_NAMES[found.key.finger]}${shift}` };
}

interface VirtualKeyboardHeatmapProps {
  /** The next character to type; its key (and Shift, when needed) is lit. */
  activeKey?: string;
  /** Mistakes per expected key; colours keys by how often they were missed. */
  errorHeatmap?: Record<string, number>;
  /** Keys a lesson is teaching. 'Shift' highlights both Shift keys. */
  highlightKeys?: string[];
  /** 0–1 per key: how quick and accurate that key is. */
  confidence?: Record<string, number>;
  showFingers?: boolean;
  label?: string;
}

/** A keyboard for guides and heatmaps. Colour-only states, so nothing moves while someone types. */
export const VirtualKeyboardHeatmap = React.memo(function VirtualKeyboardHeatmap({ activeKey = '', errorHeatmap = {}, highlightKeys = [], confidence, showFingers = true, label }: VirtualKeyboardHeatmapProps) {
  const target = activeKey ? locateChar(activeKey) : null;
  const highlight = new Set(highlightKeys.map(item => item.toLowerCase()));
  const maxErrors = Math.max(0, ...Object.values(errorHeatmap).filter(Number.isFinite));
  const description = describeKey(activeKey);

  return <div className={`kb ${showFingers ? 'has-fingers' : ''}`} role="img" aria-label={label ?? (description ? `Keyboard, next key ${description.label}` : 'Keyboard')}>
    {ROWS.map((row, rowIndex) => <div key={rowIndex} className="kb-row">
      {row.map(item => {
        const char = item.char ?? '';
        const next = Boolean(target && (target.key.id === item.id || target.shiftId === item.id));
        const focus = (char && highlight.has(char)) || (highlight.has('shift') && item.id.startsWith('Shift'));
        const errors = char ? errorHeatmap[char] ?? 0 : 0;
        const level = errors > 0 && maxErrors > 0 ? Math.max(1, Math.ceil((errors / maxErrors) * 3)) : 0;
        const keyConfidence = char ? confidence?.[char] : undefined;
        return <span
          key={item.id}
          className="kb-key"
          data-finger={item.finger}
          data-next={next || undefined}
          data-focus={focus || undefined}
          data-errors={level || undefined}
          data-confidence={keyConfidence !== undefined ? '' : undefined}
          style={{ '--u': item.u ?? 1, ...(keyConfidence !== undefined ? { '--confidence': keyConfidence } : {}) } as React.CSSProperties}
        >
          <span className="kb-label">{item.label}</span>
          {item.bump && <i className="kb-bump" />}
          {errors > 0 && <b className="kb-count">{errors}</b>}
        </span>;
      })}
    </div>)}
    {showFingers && <div className="kb-legend" aria-hidden="true">
      <span><i data-finger="left-pinky" />Pinky</span><span><i data-finger="left-ring" />Ring</span><span><i data-finger="left-middle" />Middle</span><span><i data-finger="left-index" />Index</span><span><i data-finger="thumb" />Thumb</span>
    </div>}
  </div>;
});
