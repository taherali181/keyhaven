'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Caret } from './Caret';
import { CaretStyle, FontFamily, WrapMode } from '@/types';
import { FONTS } from '@/lib/themes';

interface TypingAreaProps {
  targetText: string;
  typed: string;
  isFinished: boolean;
  caretStyle?: CaretStyle;
  font?: FontFamily;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  wrapMode?: WrapMode;
  feedbackMode?: 'standard' | 'reader';
  viewportLines?: number;
  viewportMode?: 'centered' | 'pages';
  lineHeight?: number;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onReset?: () => void;
  onClickFocus?: () => void;
  customClassName?: string;
}

export const TypingArea: React.FC<TypingAreaProps> = ({
  targetText, typed, isFinished, caretStyle = 'smooth', font = 'serif', fontSize = 'base',
  wrapMode = 'whole-word', feedbackMode = 'standard', viewportLines, viewportMode = 'centered',
  lineHeight, onKeyDown, onReset, onClickFocus, customClassName = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const charRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [hyphenAfter, setHyphenAfter] = useState<Set<number>>(new Set());
  const [lineMetrics, setLineMetrics] = useState({ active: 0, height: 42, total: 1 });
  const [browsedPage, setBrowsedPage] = useState<number | null>(null);
  const restartArmedRef = useRef(false);
  const currentIndex = typed.length;

  useEffect(() => { inputRef.current?.focus(); }, [targetText]);

  const measureLayout = useCallback(() => {
    const nodes = charRefs.current;
    const tops = [...new Set(nodes.filter(Boolean).map(node => node!.offsetTop))].sort((a, b) => a - b);
    const probe = nodes[Math.min(currentIndex, Math.max(0, targetText.length - 1))];
    const active = probe ? Math.max(0, tops.indexOf(probe.offsetTop)) : 0;
    const height = tops.length > 1 ? Math.max(1, tops[1] - tops[0]) : (probe?.getBoundingClientRect().height ?? 42) * (lineHeight ?? 1.8);
    setLineMetrics(previous => previous.active === active && previous.total === Math.max(1, tops.length) && Math.abs(previous.height - height) < .5 ? previous : { active, height, total: Math.max(1, tops.length) });

    if (wrapMode !== 'literary') { setHyphenAfter(previous => previous.size ? new Set() : previous); return; }
    const breaks = new Set<number>();
    for (let index = 0; index < targetText.length - 1; index += 1) {
      const current = nodes[index];
      const next = nodes[index + 1];
      if (!current || !next || /[\s\-–—]/.test(targetText[index]) || /[\s\-–—]/.test(targetText[index + 1])) continue;
      if (next.offsetTop > current.offsetTop) breaks.add(index);
    }
    setHyphenAfter(previous => previous.size === breaks.size && [...previous].every(value => breaks.has(value)) ? previous : breaks);
  }, [currentIndex, lineHeight, targetText, wrapMode]);

  useEffect(() => {
    const frame = requestAnimationFrame(measureLayout);
    const observer = new ResizeObserver(() => requestAnimationFrame(measureLayout));
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [measureLayout, fontSize, font]);

  useEffect(() => { requestAnimationFrame(measureLayout); }, [currentIndex, measureLayout]);
  useEffect(() => { queueMicrotask(() => setBrowsedPage(null)); }, [targetText]);

  const characters = useMemo(() => targetText.split(''), [targetText]);
  const tokens = useMemo(() => targetText.match(/\S+\s*|\s+/g) ?? [], [targetText]);
  const fontClass = FONTS[font]?.class ?? 'font-serif';
  const sizeClass = { sm: 'text-[1.05rem] md:text-[1.16rem]', base: 'text-[1.22rem] md:text-[1.42rem]', lg: 'text-[1.42rem] md:text-[1.66rem]', xl: 'text-[1.65rem] md:text-[1.94rem]' }[fontSize];
  const currentPage = viewportLines ? Math.floor(lineMetrics.active / viewportLines) : 0;
  const pageCount = viewportLines ? Math.max(1, Math.ceil(lineMetrics.total / viewportLines)) : 1;
  const visiblePage = Math.min(pageCount - 1, browsedPage ?? currentPage);
  const firstLine = !viewportLines ? 0 : viewportMode === 'pages'
    ? visiblePage * viewportLines
    : Math.max(0, lineMetrics.active - Math.floor(viewportLines / 2));
  const transform = viewportLines ? `translateY(${-firstLine * lineMetrics.height}px)` : undefined;
  const style = {
    '--typing-line-height': `${lineMetrics.height}px`,
    lineHeight: lineHeight ?? undefined
  } as React.CSSProperties;

  const renderCharacter = (character: string, index: number) => {
    const isCurrent = index === currentIndex;
    const isTyped = index < currentIndex;
    const isCorrect = isTyped && typed[index] === character;
    return <span key={index} ref={node => { charRefs.current[index] = node; }} className={`typing-character ${isTyped ? 'is-typed' : ''} ${isCorrect ? 'is-correct' : ''} ${isTyped && !isCorrect ? 'is-error' : ''}`}>
      {isCurrent && !isFinished && <Caret style={caretStyle} />}
      {character === ' ' ? '\u00a0' : character === '\n' ? <br /> : character}
      {hyphenAfter.has(index) && <span aria-hidden="true" className="wrap-hyphen">‐</span>}
    </span>;
  };

  let tokenOffset = 0;
  return <div ref={containerRef} className={`typing-surface relative ${fontClass} ${sizeClass} ${viewportLines === 3 ? 'speed-window' : ''} ${customClassName}`} style={style} onClick={() => { inputRef.current?.focus(); onClickFocus?.(); }}>
    <input ref={inputRef} type="text" className="typing-input" onKeyDown={event => {
      if (event.key === 'Escape' && onReset) { event.preventDefault(); onReset(); return; }
      if (event.key === 'Tab') { restartArmedRef.current = true; return; }
      if (event.key === 'Enter' && restartArmedRef.current && onReset) { event.preventDefault(); restartArmedRef.current = false; onReset(); return; }
      restartArmedRef.current = false; setBrowsedPage(null); onKeyDown(event);
    }} autoFocus aria-label="Typing input" autoComplete="off" autoCapitalize="off" spellCheck={false} />
    <div className="typing-viewport" style={viewportLines ? { height: viewportLines * lineMetrics.height } : undefined}>
      <div className={`typing-copy ${wrapMode} ${feedbackMode === 'reader' ? 'reader-feedback' : ''}`} style={{ transform }} aria-hidden="true">
        {wrapMode === 'whole-word' ? tokens.map((token, tokenIndex) => { const start = tokenOffset; tokenOffset += token.length; return <span className="typing-word" key={`${tokenIndex}-${start}`}>{token.split('').map((character, localIndex) => renderCharacter(character, start + localIndex))}</span>; }) : characters.map(renderCharacter)}
        {currentIndex >= characters.length && !isFinished && <span className="typing-character typing-end-marker"><Caret style={caretStyle} /></span>}
      </div>
    </div>
    {viewportLines && viewportMode === 'pages' && pageCount > 1 && <div className="typing-page-controls" aria-label="Reader pages"><button disabled={visiblePage === 0} onClick={event => { event.stopPropagation(); setBrowsedPage(Math.max(0, visiblePage - 1)); }}>Previous page</button><span>{visiblePage + 1} / {pageCount}</span><button disabled={visiblePage >= pageCount - 1} onClick={event => { event.stopPropagation(); setBrowsedPage(Math.min(pageCount - 1, visiblePage + 1)); }}>Next page</button></div>}
    <p className="sr-only" aria-live="polite">{isFinished ? 'Typing complete.' : `${currentIndex} of ${targetText.length} characters complete.`}</p>
    {!typed && <p className="typing-hint">Begin typing · Escape restarts</p>}
  </div>;
};
