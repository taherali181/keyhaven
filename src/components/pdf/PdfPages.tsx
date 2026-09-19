'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { loadPdfJs } from '@/lib/pdf';

export type PdfFit = 'page' | 'width';

/**
 * A PDF's real pages, drawn by pdf.js at the screen's resolution, one page or a two-page spread. Only the pages on
 * screen are drawn; a selectable text layer sits over each so words can be copied.
 */
export function PdfPages({ data, page, spread, fit, onDocument }: {
  /** The original file. */
  data: Blob;
  /** First page shown, from 1. */
  page: number;
  spread: boolean;
  fit: PdfFit;
  onDocument: (pages: number) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState('');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onDocumentRef = useRef(onDocument);
  useEffect(() => { onDocumentRef.current = onDocument; });

  useEffect(() => {
    let live = true;
    let loadingTask: ReturnType<Awaited<ReturnType<typeof loadPdfJs>>['getDocument']> | null = null;
    void (async () => {
      try {
        const pdfjs = await loadPdfJs();
        loadingTask = pdfjs.getDocument({ data: new Uint8Array(await data.arrayBuffer()) });
        const loaded = await loadingTask.promise;
        if (!live) return;
        setPdf(loaded);
        onDocumentRef.current(loaded.numPages);
      } catch {
        if (live) setError('This PDF could not be opened.');
      }
    })();
    return () => { live = false; void loadingTask?.destroy(); };
  }, [data]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const count = pdf?.numPages ?? 0;
  const shown = pdf ? (spread ? [page, page + 1] : [page]).filter(number => number >= 1 && number <= count) : [];

  if (error) return <div className="pdf-frame is-message" ref={frameRef}><p>{error}</p></div>;
  return <div className="pdf-frame" ref={frameRef} data-fit={fit}>
    <div className="pdf-spread" data-count={shown.length}>
      {pdf && size.width > 0 && shown.map(number => <PdfPage key={number} pdf={pdf} number={number} columns={spread ? 2 : 1} fit={fit} box={size} />)}
    </div>
  </div>;
}

/** One page: the drawing, its text layer and a quiet page number. */
function PdfPage({ pdf, number, columns, fit, box }: { pdf: PDFDocumentProxy; number: number; columns: number; fit: PdfFit; box: { width: number; height: number } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [cssSize, setCssSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let task: RenderTask | null = null;
    let live = true;
    void (async () => {
      const pdfjs = await loadPdfJs();
      const pdfPage = await pdf.getPage(number);
      if (!live) return;
      const natural = pdfPage.getViewport({ scale: 1 });
      const gap = 24;
      const available = (box.width - gap * (columns - 1)) / columns;
      const scale = fit === 'width' ? available / natural.width : Math.min(available / natural.width, box.height / natural.height);
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      const text = textRef.current;
      if (!canvas || !text) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      setCssSize({ width: viewport.width, height: viewport.height });
      task = pdfPage.render({ canvas, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined });
      try { await task.promise; } catch { return; /* cancelled for a newer drawing */ }
      if (!live) return;
      text.replaceChildren();
      text.style.setProperty('--total-scale-factor', String(scale));
      await new pdfjs.TextLayer({ textContentSource: pdfPage.streamTextContent(), container: text, viewport }).render().catch(() => {});
    })();
    return () => { live = false; task?.cancel(); };
  }, [pdf, number, columns, fit, box]);

  return <figure className="pdf-page" style={cssSize ? { width: cssSize.width, height: cssSize.height } : undefined} aria-label={`Page ${number}`}>
    <canvas ref={canvasRef} style={cssSize ? { width: cssSize.width, height: cssSize.height } : undefined} />
    <div ref={textRef} className="textLayer" />
    <span className="pdf-folio" aria-hidden="true">{number}</span>
  </figure>;
}
