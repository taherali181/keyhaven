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
  onKeyDown: (event: React.KeyboardEvent) => void;
  onReset?: () => void;
  onClickFocus?: () => void;
  customClassName?: string;
}

export const TypingArea: React.FC<TypingAreaProps> = ({
  targetText,
  typed,
  isFinished,
  caretStyle = 'smooth',
  font = 'serif',
  fontSize = 'base',
  wrapMode = 'whole-word',
  onKeyDown,
  onReset,
  onClickFocus,
  customClassName = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const charRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [hyphenAfter, setHyphenAfter] = useState<Set<number>>(new Set());
  const restartArmedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, [targetText]);

  const measureHyphens = useCallback(() => {
    if (wrapMode !== 'literary') {
      setHyphenAfter(new Set());
      return;
    }
    const breaks = new Set<number>();
    for (let index = 0; index < targetText.length - 1; index += 1) {
      const current = charRefs.current[index];
      const next = charRefs.current[index + 1];
      if (!current || !next || /[\s\-–—]/.test(targetText[index]) || /[\s\-–—]/.test(targetText[index + 1])) continue;
      if (next.offsetTop > current.offsetTop) breaks.add(index);
    }
    setHyphenAfter(previous => {
      const unchanged = previous.size === breaks.size && [...previous].every(value => breaks.has(value));
      return unchanged ? previous : breaks;
    });
  }, [targetText, wrapMode]);

  useEffect(() => {
    const frame = requestAnimationFrame(measureHyphens);
    const observer = new ResizeObserver(() => requestAnimationFrame(measureHyphens));
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measureHyphens, fontSize, font]);

  const characters = useMemo(() => targetText.split(''), [targetText]);
  const tokens = useMemo(() => targetText.match(/\S+\s*|\s+/g) ?? [], [targetText]);
  const currentIndex = typed.length;
  const fontClass = FONTS[font]?.class ?? 'font-serif';
  const sizeClass = {
    sm: 'text-[1.05rem] md:text-[1.2rem] leading-[1.9]',
    base: 'text-[1.25rem] md:text-[1.48rem] leading-[1.9]',
    lg: 'text-[1.45rem] md:text-[1.72rem] leading-[1.85]',
    xl: 'text-[1.7rem] md:text-[2.05rem] leading-[1.75]'
  }[fontSize];

  const renderCharacter = (character: string, index: number) => {
    const isCurrent = index === currentIndex;
    const isTyped = index < currentIndex;
    const isCorrect = isTyped && typed[index] === character;
    return (
      <span
        key={index}
        ref={node => { charRefs.current[index] = node; }}
        className={`typing-character ${isTyped ? 'is-typed' : ''} ${isCorrect ? 'is-correct' : ''} ${isTyped && !isCorrect ? 'is-error' : ''}`}
      >
        {isCurrent && !isFinished && <Caret style={caretStyle} />}
        {character === ' ' ? '\u00a0' : character === '\n' ? <br /> : character}
        {hyphenAfter.has(index) && <span aria-hidden="true" className="wrap-hyphen">‐</span>}
      </span>
    );
  };

  let tokenOffset = 0;
  return (
    <div
      ref={containerRef}
      className={`typing-surface relative ${fontClass} ${sizeClass} ${customClassName}`}
      onClick={() => {
        inputRef.current?.focus();
        onClickFocus?.();
      }}
    >
      <input
        ref={inputRef}
        type="text"
        className="typing-input"
        onKeyDown={event => {
          if (event.key === 'Escape' && onReset) {
            event.preventDefault();
            onReset();
            return;
          }
          if (event.key === 'Tab') {
            restartArmedRef.current = true;
            return;
          }
          if (event.key === 'Enter' && restartArmedRef.current && onReset) {
            event.preventDefault();
            restartArmedRef.current = false;
            onReset();
            return;
          }
          restartArmedRef.current = false;
          onKeyDown(event);
        }}
        autoFocus
        aria-label="Typing input"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      <div className={`typing-copy ${wrapMode}`} aria-hidden="true">
        {wrapMode === 'whole-word'
          ? tokens.map((token, tokenIndex) => {
              const start = tokenOffset;
              tokenOffset += token.length;
              return (
                <span className="typing-word" key={`${tokenIndex}-${start}`}>
                  {token.split('').map((character, localIndex) => renderCharacter(character, start + localIndex))}
                </span>
              );
            })
          : characters.map(renderCharacter)}
        {currentIndex >= characters.length && !isFinished && <Caret style={caretStyle} />}
      </div>

      <p className="sr-only" aria-live="polite">
        {isFinished ? 'Typing complete.' : `${currentIndex} of ${targetText.length} characters complete.`}
      </p>
      {!typed && <p className="typing-hint">Begin typing · Escape or Tab + Enter restarts</p>}
    </div>
  );
};
