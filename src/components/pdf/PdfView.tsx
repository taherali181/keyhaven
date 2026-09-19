'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, FileUp, Maximize, MoveHorizontal } from 'lucide-react';
import type { DocumentFileRecord, ImportedDocumentRecord, UserSettings } from '@/types';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { Segmented } from '@/components/ui/Segmented';
import { PdfPages, type PdfFit } from '@/components/pdf/PdfPages';
import { usePageInput } from '@/hooks/usePageInput';
import { db } from '@/lib/db';
import { importKey } from '@/lib/catalog';
import { importDocument, type ImportProgress } from '@/lib/document-import';
import { sectionForPage, sectionPage } from '@/lib/pdf';
import { openWork } from '@/lib/reader-events';

/** The PDF open in the PDF section, kept between visits. */
export const PDF_CURRENT_KEY = 'keyhaven_pdf_current_v1';
const remembered = () => { try { return localStorage.getItem(PDF_CURRENT_KEY); } catch { return null; } };
const remember = (id: string) => { try { localStorage.setItem(PDF_CURRENT_KEY, id); } catch { /* memory only */ } };

/**
 * PDFs as their original pages. "Reflowed" opens the same document as text in the reader; both remember one place.
 */
export function PdfView({ settings }: { settings: UserSettings }) {
  const [documents, setDocuments] = useState<ImportedDocumentRecord[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [file, setFile] = useState<DocumentFileRecord | null | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [fit, setFit] = useState<PdfFit>('page');
  const [importState, setImportState] = useState<ImportProgress | null>(null);
  const [message, setMessage] = useState('');
  const viewerRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);

  const refresh = useCallback(async () => {
    const list = await db.importedDocuments.where('format').equals('pdf').toArray();
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    setDocuments(list);
    return list;
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setWide(window.matchMedia('(min-width: 1100px)').matches);
      void refresh().then(list => {
        const saved = remembered();
        setCurrentId(list.find(item => item.id === saved)?.id ?? list[0]?.id ?? null);
      }).catch(() => setDocuments([]));
    });
  }, [refresh]);

  const current = documents?.find(item => item.id === currentId) ?? null;
  const titles = useMemo(() => current?.sections.map(section => section.title) ?? [], [current]);

  // Open the chosen PDF: its original file, and the page you were on.
  useEffect(() => {
    if (!currentId) return;
    let live = true;
    remember(currentId);
    queueMicrotask(() => { if (live) { setFile(undefined); setPages(0); } });
    void Promise.all([db.documentFiles.get(currentId), db.bookProgress.get(importKey(currentId))]).then(([original, progress]) => {
      if (!live) return;
      setFile(original ?? null);
      const section = progress ? titles[progress.chapterIndex] : undefined;
      setPage((section && sectionPage(section)) || 1);
    });
    return () => { live = false; };
  }, [currentId, titles]);

  // Your place is saved shortly after it changes, as the reader's progress for this document.
  useEffect(() => {
    if (!current || !pages) return;
    const timer = window.setTimeout(() => {
      const key = importKey(current.id);
      void db.bookProgress.get(key).then(record => db.bookProgress.put({
        charOffset: 0, totalWordsTyped: 0, ...record,
        bookId: key, kind: 'import', title: current.title, author: current.author,
        chapterIndex: sectionForPage(titles, page), pageFraction: 0, chunkIndex: 0,
        percent: Math.round((page / pages) * 100), lastRead: Date.now()
      })).catch(() => {});
    }, 400);
    return () => window.clearTimeout(timer);
  }, [current, page, pages, titles]);

  const spread = wide && settings.readerPageLayout === 'spread';
  const step = spread ? 2 : 1;
  const goTo = (target: number) => setPage(Math.min(Math.max(1, pages), Math.max(1, target)));
  usePageInput({
    active: Boolean(file && pages),
    // The wheel scrolls a page wider than the screen; it only turns pages when a whole page fits.
    input: fit === 'page' ? settings.readerInput : { ...settings.readerInput, wheel: false },
    surface: viewerRef,
    onAction: action => goTo(action === 'next' ? page + step : action === 'prev' ? page - step : action === 'first' ? 1 : pages)
  });

  const startImport = async (chosen?: File) => {
    if (!chosen) return;
    setMessage('');
    try {
      const { document, file: original } = await importDocument(chosen, setImportState, new AbortController().signal);
      await db.transaction('rw', [db.importedDocuments, db.documentFiles], async () => {
        await db.importedDocuments.put(document);
        if (original) await db.documentFiles.put(original);
      });
      window.dispatchEvent(new Event('keyhaven:sync'));
      await refresh();
      setCurrentId(document.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'That file could not be imported.');
    } finally {
      setImportState(null);
    }
  };
  const attachOriginal = async (chosen?: File) => {
    if (!chosen || !current) return;
    await db.documentFiles.put({ id: current.id, blob: chosen, name: chosen.name, size: chosen.size, addedAt: Date.now() });
    setFile(await db.documentFiles.get(current.id) ?? null);
  };
  const openReflowed = () => {
    if (!current) return;
    // Save the page first, so the reader opens at the same place.
    const key = importKey(current.id);
    void db.bookProgress.get(key).then(record => db.bookProgress.put({
      charOffset: 0, totalWordsTyped: 0, percent: 0, ...record,
      bookId: key, kind: 'import', title: current.title, author: current.author,
      chapterIndex: sectionForPage(titles, page), pageFraction: 0, chunkIndex: 0, lastRead: Date.now()
    })).finally(() => openWork(key, 'read'));
  };

  const importButton = <label className="rs-btn pdf-import"><FileUp aria-hidden="true" />{importState ? importState.message : 'Import a PDF'}<input type="file" accept=".pdf,application/pdf" hidden disabled={Boolean(importState)} onChange={event => { void startImport(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>;

  if (documents === null) return <section className="pdf-shell"><div className="pdf-empty"><span className="skeleton pdf-skeleton" aria-label="Loading your PDFs" /></div></section>;
  if (!documents.length) return <section className="pdf-shell">
    <div className="pdf-empty">
      <FileText aria-hidden="true" />
      <h1>Your PDFs</h1>
      <p>Import a PDF to read its pages exactly as they look, or as clean reflowed text you can also type.</p>
      {importButton}
      {message && <p className="pdf-error" role="alert">{message}</p>}
    </div>
  </section>;

  return <section className="pdf-shell">
    <header className="pdf-bar glass">
      <FileText aria-hidden="true" className="pdf-bar-icon" />
      <GlassSelect variant="toolbar" ariaLabel="PDF" value={currentId ?? ''} options={documents.map(item => ({ value: item.id, label: item.title }))} onChange={setCurrentId} />
      <span className="story-side-divider" aria-hidden="true" />
      <Segmented label="View" layoutId="pdf-view" value="original" options={[{ value: 'original', label: 'Original' }, { value: 'reflowed', label: 'Reflowed' }]} onChange={value => { if (value === 'reflowed') openReflowed(); }} />
      <span className="pdf-bar-spacer" />
      <div className="pdf-fit" role="group" aria-label="Fit">
        <button type="button" className="story-bar-button is-icon" aria-pressed={fit === 'page'} onClick={() => setFit('page')} aria-label="Fit page" title="Fit page"><Maximize aria-hidden="true" /></button>
        <button type="button" className="story-bar-button is-icon" aria-pressed={fit === 'width'} onClick={() => setFit('width')} aria-label="Fit width" title="Fit width"><MoveHorizontal aria-hidden="true" /></button>
      </div>
      {importButton}
    </header>
    {message && <p className="pdf-error" role="alert">{message}</p>}

    <div className="pdf-viewer" ref={viewerRef} data-fit={fit}>
      {file === undefined
        ? <span className="skeleton pdf-skeleton" aria-label="Opening the PDF" />
        : file === null
          ? <div className="pdf-empty is-inline">
            <p><strong>The original file isn&apos;t on this device.</strong></p>
            <p>Choose the same PDF to see its pages, or read it as reflowed text.</p>
            <div className="pdf-empty-actions">
              <label className="rs-btn"><FileUp aria-hidden="true" />Choose the original PDF<input type="file" accept=".pdf,application/pdf" hidden onChange={event => void attachOriginal(event.target.files?.[0])} /></label>
              <button type="button" className="rs-btn" onClick={openReflowed}>Read reflowed</button>
            </div>
          </div>
          : <PdfPages data={file.blob} page={page} spread={spread} fit={fit} onDocument={count => { setPages(count); setPage(current => Math.min(current, count)); }} />}
    </div>

    {file && pages > 0 && <nav className="pdf-pager glass" aria-label="Pages">
      <button type="button" className="reader-bar-step" disabled={page <= 1} onClick={() => goTo(page - step)}><ChevronLeft aria-hidden="true" />Previous</button>
      <span className="pdf-pager-count" role="status">Page <strong>{page}{spread && page + 1 <= pages ? `–${page + 1}` : ''}</strong> of {pages}</span>
      <button type="button" className="reader-bar-step" disabled={page + step > pages} onClick={() => goTo(page + step)}>Next<ChevronRight aria-hidden="true" /></button>
    </nav>}
  </section>;
}
