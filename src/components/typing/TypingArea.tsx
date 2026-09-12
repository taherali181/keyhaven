'use client';

import React, { useRef, useEffect } from 'react';
import { Caret } from './Caret';
import { CaretStyle, FontFamily } from '@/types';
import { FONTS } from '@/lib/themes';

interface TypingAreaProps {
  targetText: string;
  typed: string;
  isFinished: boolean;
  caretStyle?: CaretStyle;
  font?: FontFamily;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClickFocus?: () => void;
  customClassName?: string;
  highlightCurrentWord?: boolean;
}

export const TypingArea: React.FC<TypingAreaProps> = ({
  targetText,
  typed,
  isFinished,
  caretStyle = 'smooth',
  font = 'serif',
  fontSize = 'base',
  onKeyDown,
  onClickFocus,
  customClassName = '',
  highlightCurrentWord = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    hiddenInputRef.current?.focus();
  }, []);

  const handleContainerClick = () => {
    hiddenInputRef.current?.focus();
    onClickFocus?.();
  };

  const fontClass = FONTS[font]?.class || 'font-serif';

  const sizeClasses = {
    sm: 'text-lg md:text-xl leading-relaxed',
    base: 'text-xl md:text-2xl leading-loose',
    lg: 'text-2xl md:text-3xl leading-loose',
    xl: 'text-3xl md:text-4xl leading-loose'
  }[fontSize];

  const targetChars = targetText.split('');
  const currentIndex = typed.length;

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={`relative select-none cursor-text outline-none p-6 md:p-8 rounded-2xl border transition-colors duration-200 ${fontClass} ${sizeClasses} ${customClassName}`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--color-border)',
        color: 'var(--text-muted)'
      }}
    >
      {/* Hidden input for mobile / focus trapping */}
      <input
        ref={hiddenInputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        onKeyDown={onKeyDown}
        autoFocus
        tabIndex={0}
        aria-label="Typing input area"
      />

      <div className="flex flex-wrap items-center tracking-wide break-words">
        {targetChars.map((char, index) => {
          let charColor = 'var(--text-muted)';
          let isCurrent = index === currentIndex;
          let isTyped = index < currentIndex;
          let isCorrect = false;

          if (isTyped) {
            isCorrect = typed[index] === char;
            charColor = isCorrect ? 'var(--color-correct)' : 'var(--color-incorrect)';
          }

          return (
            <span
              key={index}
              className={`relative inline-block transition-colors duration-75 ${
                !isTyped ? 'opacity-40 hover:opacity-60' : ''
              } ${isCurrent ? 'opacity-100 font-medium' : ''} ${
                !isCorrect && isTyped ? 'underline decoration-wavy decoration-[var(--color-incorrect)]' : ''
              }`}
              style={{ color: charColor }}
            >
              {isCurrent && !isFinished && (
                <span className="absolute -left-[1px] top-0 bottom-0 pointer-events-none flex items-center">
                  <Caret style={caretStyle} />
                </span>
              )}
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}

        {/* End of line caret */}
        {currentIndex >= targetChars.length && !isFinished && (
          <span className="inline-block ml-1">
            <Caret style={caretStyle} />
          </span>
        )}
      </div>

      {!typed && (
        <div className="mt-4 text-xs font-sans text-[var(--text-muted)] opacity-60 flex items-center gap-2">
          <span>💡 Tip: Just start typing. Press</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-secondary)] border border-[var(--color-border)]">
            Tab
          </kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-secondary)] border border-[var(--color-border)]">
            Enter
          </kbd>
          <span>or click restart to reset.</span>
        </div>
      )}
    </div>
  );
};
