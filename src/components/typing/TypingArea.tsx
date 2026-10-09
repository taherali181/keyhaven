'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Caret } from './Caret';
import { CaretStyle, FontFamily, WrapMode } from '@/types';
import { FONTS } from '@/lib/themes';
import { passageFontSize } from '@/lib/reader-style';

interface TypingAreaProps {
  targetText: string;
  typed: string;
  isFinished: boolean;
  caretStyle?: CaretStyle;
  font?: FontFamily;
  /** Text size in px at desktop widths. */
  fontSize?: number;
  wrapMode?: WrapMode;
  feedbackMode?: 'standard' | 'reader';
  viewportLines?: number;
  viewportMode?: 'centered' | 'pages';
  lineHeight?: number;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onCompositionStart?: () => void;
  onCompositionEnd?: (event: React.CompositionEvent) => void;
  onReset?: () => void;
  /** Escape; defaults to restarting. */
  onEscape?: () => void;
  onClickFocus?: () => void;
  customClassName?: string;
  /** Change when CSS-driven typography (weight, letter spacing) changes, so line positions are re-measured. */
  layoutKey?: string;
}

type CharacterState = 'pending' | 'correct' | 'error';
/** Where a character's line sits in a centred window: already typed, being typed, or still to come. */
type LineTone = 'past' | 'active' | 'upcoming';

/**
 * How many lines the text is moved up in a typing window. Pages turn a whole window at a time. A centred window
 * leads with `floor(lines / 2)` empty lines of padding, so moving up by the active line keeps it in the middle slot:
 * typed lines above, the next lines below.
 */
export function windowShift(activeLine: number, viewportLines: number, mode: 'centered' | 'pages', page = 0) {
  return mode === 'pages' ? page * viewportLines : Math.max(0, activeLine);
}

/** The character index each line starts at, from the characters' rendered top offsets. */
export function lineStarts(tops: Array<number | undefined>) {
  const starts: number[] = [];
  let previous: number | undefined;
  tops.forEach((top, index) => {
    if (top === undefined || top === previous) return;
    if (previous === undefined || top > previous) starts.push(index);
    previous = top;
  });
  return starts.length ? starts : [0];
}

interface TypingCharacterProps {
  character: string;
  state: CharacterState;
  isCurrent: boolean;
  tone?: LineTone;
  caretStyle: CaretStyle;
  index: number;
  registerRef: (index: number, node: HTMLSpanElement | null) => void;
}

// Memoized so a keystroke re-renders only the one or two spans whose state changed,
// rather than every character in the passage.
const TypingCharacter = React.memo<TypingCharacterProps>(({ character, state, isCurrent, tone, caretStyle, index, registerRef }) => (
  <span
    ref={node => registerRef(index, node)}
    className={`typing-character ${state === 'pending' ? '' : 'is-typed'} ${state === 'correct' ? 'is-correct' : ''} ${state === 'error' ? 'is-error' : ''} ${tone === 'upcoming' ? 'is-upcoming' : ''}`}
  >
    {isCurrent && <Caret style={caretStyle} />}
    {character === '\n' ? <br /> : character}
  </span>
));
TypingCharacter.displayName = 'TypingCharacter';

export const TypingArea: React.FC<TypingAreaProps> = ({
  targetText, typed, isFinished, caretStyle = 'smooth', font = 'serif', fontSize = 23,
  wrapMode = 'whole-word', feedbackMode = 'standard', viewportLines, viewportMode = 'centered',
  lineHeight, onKeyDown, onCompositionStart, onCompositionEnd, onReset, onEscape, onClickFocus, customClassName = '', layoutKey
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const charRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const topsRef = useRef<number[]>([]);
  const [lineMetrics, setLineMetrics] = useState({ active: 0, height: 42, total: 1, starts: [0] });
  const [browsedPage, setBrowsedPage] = useState<number | null>(null);
  const restartArmedRef = useRef(false);
  const currentIndex = typed.length;
  // Kept in a ref so the ResizeObserver callback can read the caret position without
  // taking currentIndex as a dependency — otherwise it re-attaches on every keystroke.
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => { currentIndexRef.current = currentIndex; });

  useEffect(() => { inputRef.current?.focus(); }, [targetText]);

  const registerRef = useCallback((index: number, node: HTMLSpanElement | null) => {
    charRefs.current[index] = node;
  }, []);

  const probeIndex = useCallback(
    () => Math.min(currentIndexRef.current, Math.max(0, targetText.length - 1)),
    [targetText.length]
  );

  // Full pass over every span. Only line *positions* need this, and those change on
  // resize / font / text change — never on a keystroke.
  const measureLines = useCallback(() => {
    const nodes = charRefs.current;
    const tops = [...new Set(nodes.filter(Boolean).map(node => node!.offsetTop))].sort((a, b) => a - b);
    topsRef.current = tops;
    const probe = nodes[probeIndex()];
    const active = probe ? Math.max(0, tops.indexOf(probe.offsetTop)) : 0;
    const copy = containerRef.current?.querySelector('.typing-copy');
    const height = (copy ? Number.parseFloat(getComputedStyle(copy).lineHeight) : 0) || 42;
    const starts = lineStarts(Array.from({ length: targetText.length }, (_, index) => nodes[index]?.offsetTop));
    setLineMetrics(previous => previous.active === active && previous.total === Math.max(1, tops.length) && Math.abs(previous.height - height) < .5 && previous.starts.join() === starts.join()
      ? previous
      : { active, height, total: Math.max(1, tops.length), starts });
  }, [probeIndex, targetText.length]);

  // Per-keystroke path: read one node and look it up in the cached line tops, instead
  // of walking the whole passage again.
  const measureActive = useCallback(() => {
    const probe = charRefs.current[probeIndex()];
    if (!probe) return;
    const tops = topsRef.current;
    const found = tops.indexOf(probe.offsetTop);
    if (found < 0) { measureLines(); return; }
    setLineMetrics(previous => previous.active === found ? previous : { ...previous, active: found });
  }, [measureLines, probeIndex]);

  useEffect(() => {
    const frame = requestAnimationFrame(measureLines);
    const observer = new ResizeObserver(() => requestAnimationFrame(measureLines));
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [measureLines, fontSize, font, targetText, wrapMode, layoutKey, lineHeight]);

  useEffect(() => {
    const frame = requestAnimationFrame(measureActive);
    return () => cancelAnimationFrame(frame);
  }, [currentIndex, measureActive]);

  useEffect(() => { queueMicrotask(() => setBrowsedPage(null)); }, [targetText]);

  const characters = useMemo(() => targetText.split(''), [targetText]);
  const tokens = useMemo(() => targetText.match(/\S+\s*|\s+/g) ?? [], [targetText]);
  const fontClass = FONTS[font]?.class ?? 'font-serif';
  const currentPage = viewportLines ? Math.floor(lineMetrics.active / viewportLines) : 0;
  const pageCount = viewportLines ? Math.max(1, Math.ceil(lineMetrics.total / viewportLines)) : 1;
  const visiblePage = Math.min(pageCount - 1, browsedPage ?? currentPage);
  // A centred window keeps the active line in the middle, the typed line above in full colour and the next line
  // below in grey; each finished line slides up.
  const lineWindow = Boolean(viewportLines) && viewportMode === 'centered';
  const lead = lineWindow ? Math.floor(viewportLines! / 2) : 0;
  const shift = viewportLines ? windowShift(lineMetrics.active, viewportLines, viewportMode, visiblePage) : 0;
  const transform = viewportLines ? `translateY(${-shift * lineMetrics.height}px)` : undefined;
  const activeStart = lineMetrics.starts[lineMetrics.active] ?? 0;
  const activeEnd = lineMetrics.starts[lineMetrics.active + 1] ?? Infinity;
  const style = {
    '--typing-line-height': `${lineMetrics.height}px`,
    fontSize: passageFontSize(fontSize),
    lineHeight: lineHeight ?? undefined
  } as React.CSSProperties;

  const renderCharacter = (character: string, index: number) => {
    const isTyped = index < currentIndex;
    const state: CharacterState = !isTyped ? 'pending' : typed[index] === character ? 'correct' : 'error';
    return <TypingCharacter
      key={index}
      index={index}
      character={character}
      state={state}
      isCurrent={index === currentIndex && !isFinished}
      tone={!lineWindow ? undefined : index < activeStart ? 'past' : index < activeEnd ? 'active' : 'upcoming'}
      caretStyle={caretStyle}
      registerRef={registerRef}
    />;
  };

  let tokenOffset = 0;
  return <div ref={containerRef} className={`typing-surface relative ${fontClass} ${lineWindow ? 'line-window' : ''} ${customClassName}`} style={style} onClick={() => { inputRef.current?.focus(); onClickFocus?.(); }}>
    <input ref={inputRef} type="text" className="typing-input" inputMode="text" enterKeyHint="enter" onCompositionStart={onCompositionStart} onCompositionEnd={onCompositionEnd} onKeyDown={event => {
      if (event.key === 'Escape' && (onEscape ?? onReset)) { event.preventDefault(); (onEscape ?? onReset)?.(); return; }
      if (event.key === 'Tab') { restartArmedRef.current = true; return; }
      if (event.key === 'Enter' && restartArmedRef.current && onReset) { event.preventDefault(); restartArmedRef.current = false; onReset(); return; }
      restartArmedRef.current = false; setBrowsedPage(null); onKeyDown(event);
    }} autoFocus aria-label="Typing input" autoComplete="off" autoCapitalize="off" spellCheck={false} />
    <div className="typing-viewport" style={viewportLines ? { height: viewportLines * lineMetrics.height } : undefined}>
      <div className={`typing-copy ${wrapMode} ${feedbackMode === 'reader' ? 'reader-feedback' : ''} ${lineWindow ? 'line-focus' : ''}`} style={{ transform, paddingTop: lead ? lead * lineMetrics.height : undefined }} aria-hidden="true">
        {wrapMode === 'whole-word' ? tokens.map((token, tokenIndex) => { const start = tokenOffset; tokenOffset += token.length; return <span className="typing-word" key={`${tokenIndex}-${start}`}>{token.split('').map((character, localIndex) => renderCharacter(character, start + localIndex))}</span>; }) : characters.map(renderCharacter)}
        {currentIndex >= characters.length && !isFinished && <span className="typing-character typing-end-marker"><Caret style={caretStyle} /></span>}
      </div>
    </div>
    {viewportLines && viewportMode === 'pages' && pageCount > 1 && <div className="typing-page-controls" aria-label="Reader pages"><button disabled={visiblePage === 0} onClick={event => { event.stopPropagation(); setBrowsedPage(Math.max(0, visiblePage - 1)); }}>Previous page</button><span>{visiblePage + 1} / {pageCount}</span><button disabled={visiblePage >= pageCount - 1} onClick={event => { event.stopPropagation(); setBrowsedPage(Math.min(pageCount - 1, visiblePage + 1)); }}>Next page</button></div>}
    <p className="sr-only" aria-live="polite">{isFinished ? 'Typing complete.' : `${currentIndex} of ${targetText.length} characters complete.`}</p>
    {!typed && <p className="typing-hint">Begin typing · <kbd aria-label="Escape">Esc</kbd> restarts</p>}
  </div>;
};
