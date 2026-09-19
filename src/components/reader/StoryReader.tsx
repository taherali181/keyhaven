'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { FontFamily } from '@/types';
import { FONTS } from '@/lib/themes';
import { passageFontSize } from '@/lib/reader-style';
import { countWords } from '@/lib/reading';

export interface ReaderLayout {
  pagesPerView?: number;
  pageCount: number;
  /** Exact page counts for all sections at this page size, cached across chapter changes. */
  sectionPageCounts: number[];
  /** Page on which each part (paragraph) begins. */
  partStartPage: number[];
  /** For each page, the part whose text is at the top of that page. */
  partAtPage: number[];
  /** Each part's top offset and height in px, and the page height, for progress within a part. */
  partTop: number[];
  partHeight: number[];
  pageHeight: number;
  /** Top offset (px) of each paragraph in the section, by its data-paragraph index: for jumping to a highlight. */
  paragraphTop: number[];
  /** wordsBefore[p] = words on pages before page p (length pageCount + 1, last entry = totalWords). */
  wordsBefore: number[];
  totalWords: number;
}

interface StoryReaderProps {
  /** The text in parts (typing chunks); each part is a list of paragraphs. */
  parts: string[][];
  sections: string[][][];
  page: number;
  pageLayout?: 'single' | 'spread';
  font: FontFamily;
  /** Text size in px at desktop widths. */
  fontSize: number;
  lineHeight: number;
  /** Change when CSS-driven typography (weight, letter spacing) changes, so pages are re-measured. */
  layoutKey?: string;
  onLayout: (layout: ReaderLayout) => void;
  /**
   * Renders a paragraph's contents (for example with highlights). `paragraph` counts from the start of the section.
   * Must not change the paragraph's height: pages are measured from the plain text.
   */
  renderParagraph?: (text: string, paragraph: number) => React.ReactNode;
}

const MOBILE = '(max-width: 767px)';

/**
 * Book-like pages for reading mode. The page height is a whole number of lines and paragraphs are
 * one line apart, so every page break lands between lines. Pages are a translateY over one column.
 */
export function StoryReader({ parts, sections, page, pageLayout = 'single', font, fontSize, lineHeight, layoutKey, onLayout, renderParagraph }: StoryReaderProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState(0);
  const onLayoutRef = useRef(onLayout);
  const sectionPagesRef = useRef<{ key: string; sections: string[][][]; counts: number[] } | null>(null);
  useEffect(() => { onLayoutRef.current = onLayout; });

  const measure = useCallback(() => {
    const frame = frameRef.current;
    const copy = copyRef.current;
    const nodes = copy ? [...copy.querySelectorAll<HTMLElement>('.story-reader-part')] : [];
    const firstParagraph = copy?.querySelector('p');
    if (!frame || !copy || !nodes.length || !firstParagraph) return;

    const line = Number.parseFloat(getComputedStyle(firstParagraph).lineHeight) || 32;
    const frameStyle = getComputedStyle(frame);
    // Desktop: the stage stretches, so the frame's own height is the room available.
    // Mobile: the page scrolls, so size pages to what fits under the frame's top edge instead.
    const available = window.matchMedia(MOBILE).matches
      ? Math.max(240, window.innerHeight - frame.getBoundingClientRect().top - 190)
      : frame.getBoundingClientRect().height - Number.parseFloat(frameStyle.paddingTop) - Number.parseFloat(frameStyle.paddingBottom);
    const height = Math.max(3, Math.floor(available / line)) * line;

    const pageCount = Math.max(1, Math.ceil((copy.scrollHeight - 1) / height));
    const copyStyle = getComputedStyle(copy);
    const key = [copy.getBoundingClientRect().width, height, copyStyle.fontFamily, copyStyle.fontSize, copyStyle.fontWeight, copyStyle.letterSpacing, line, document.fonts.status, layoutKey].join('|');
    if (sectionPagesRef.current?.key !== key || sectionPagesRef.current.sections !== sections) {
      // Reuse the actual reader styles in a hidden measurement copy. No estimates change as chapters open.
      const probe = copy.cloneNode(false) as HTMLDivElement;
      Object.assign(probe.style, { position: 'absolute', top: '0', left: '0', width: `${copy.getBoundingClientRect().width}px`, height: 'auto', transform: 'none', visibility: 'hidden', pointerEvents: 'none' });
      probe.setAttribute('aria-hidden', 'true');
      frame.appendChild(probe);
      try {
        const counts = sections.map(section => {
          const nodes = section.map(part => {
            const group = document.createElement('div');
            group.className = 'story-reader-part';
            group.append(...part.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
            return group;
          });
          probe.replaceChildren(...nodes);
          return Math.max(1, Math.ceil((probe.scrollHeight - 1) / height));
        });
        sectionPagesRef.current = { key, sections, counts };
      } finally { probe.remove(); }
    }
    const words = nodes.map((_, index) => countWords((parts[index] ?? []).join(' ')));
    const wordsBefore = Array.from({ length: pageCount + 1 }, (_, p) => {
      const edge = p * height;
      return Math.round(nodes.reduce((sum, node, index) => {
        const covered = (edge - node.offsetTop) / Math.max(1, node.offsetHeight);
        return sum + words[index] * Math.min(1, Math.max(0, covered));
      }, 0));
    });

    setPageHeight(previous => (Math.abs(previous - height) < 0.5 ? previous : height));
    onLayoutRef.current({
      pagesPerView: Number(frameStyle.getPropertyValue('--pages-per-view')) || 1,
      pageCount,
      sectionPageCounts: sectionPagesRef.current.counts,
      partStartPage: nodes.map(node => Math.floor(node.offsetTop / height)),
      partAtPage: Array.from({ length: pageCount }, (_, p) => nodes.reduce((found, node, index) => (node.offsetTop <= p * height + 1 ? index : found), 0)),
      partTop: nodes.map(node => node.offsetTop),
      partHeight: nodes.map(node => Math.max(1, node.offsetHeight)),
      pageHeight: height,
      paragraphTop: [...copy.querySelectorAll<HTMLElement>('[data-paragraph]')].reduce<number[]>((tops, element) => { tops[Number(element.dataset.paragraph)] = element.offsetTop; return tops; }, []),
      wordsBefore,
      totalWords: words.reduce((sum, count) => sum + count, 0)
    });
  }, [parts, sections, layoutKey]);

  useEffect(() => {
    let frame = requestAnimationFrame(measure);
    let active = true;
    const schedule = () => { if (active) { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); } };
    const observer = new ResizeObserver(schedule);
    if (frameRef.current) observer.observe(frameRef.current);
    if (copyRef.current) observer.observe(copyRef.current);
    // Web fonts can change line boxes after the first paint.
    void document.fonts?.ready.then(schedule);
    return () => { active = false; cancelAnimationFrame(frame); observer.disconnect(); };
  }, [measure, font, fontSize, lineHeight, layoutKey, pageLayout]);

  // A short fade-and-drift in the direction of travel; skipped for reduced motion.
  const previousPage = useRef(page);
  useEffect(() => {
    if (previousPage.current === page) return;
    const forward = page > previousPage.current;
    previousPage.current = page;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    copyRef.current?.animate(
      [{ opacity: 0, translate: `${forward ? 14 : -14}px 0` }, { opacity: 1, translate: '0 0' }],
      { duration: 200, easing: 'cubic-bezier(.16, 1, .3, 1)' }
    );
  }, [page]);

  // Each paragraph's index within the section, so highlights and notes can find it again.
  const paragraphStart: number[] = [];
  parts.reduce((count, part, index) => { paragraphStart[index] = count; return count + part.length; }, 0);
  const renderPart = (part: string[], index: number) => part.map((text, offset) => {
    const paragraph = paragraphStart[index] + offset;
    return <p key={offset} data-paragraph={paragraph}>{renderParagraph ? renderParagraph(text, paragraph) : text}</p>;
  });

  const fontClass = FONTS[font]?.class ?? 'font-serif';
  return <div ref={frameRef} className={`story-reader ${fontClass}`} data-page-layout={pageLayout} style={{ fontSize: passageFontSize(fontSize), lineHeight }}>
    <div className="story-reader-viewport" style={pageHeight ? { height: pageHeight } : undefined}>
      <div ref={copyRef} className="story-reader-copy" style={{ transform: `translateY(${-page * pageHeight}px)` }}>
        {parts.map((part, index) => <div key={index} className="story-reader-part" data-part={index + 1}>
          {renderPart(part, index)}
        </div>)}
      </div>
    </div>
    {pageLayout === 'spread' && <div className="story-reader-viewport story-reader-second-page" aria-hidden="true" style={pageHeight ? { height: pageHeight } : undefined}>
      <div className="story-reader-copy" style={{ transform: `translateY(${-(page + 1) * pageHeight}px)` }}>
        {parts.map((part, index) => <div key={index} className="story-reader-part">
          {renderPart(part, index)}
        </div>)}
      </div>
    </div>}
  </div>;
}
