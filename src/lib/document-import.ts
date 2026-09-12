'use client';

import type { ImportedDocumentRecord, ImportedSection } from '@/types';

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_PAGES = 500;

export interface ImportProgress { phase: 'reading' | 'extracting' | 'ocr'; current: number; total: number; message: string; }

function cleanText(value: string) {
  return value.replace(/\u00ad/g, '').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function resolvePath(base: string, relative: string) {
  const parts = `${base}/${relative}`.split('/');
  const resolved: string[] = [];
  for (const part of parts) { if (!part || part === '.') continue; if (part === '..') resolved.pop(); else resolved.push(part); }
  return resolved.join('/');
}

function asDocument(file: File, sections: ImportedSection[], title?: string, author?: string): ImportedDocumentRecord {
  const now = Date.now();
  return { id: crypto.randomUUID(), title: title?.trim() || file.name.replace(/\.(epub|pdf)$/i, ''), author: author?.trim() || 'Unknown author', format: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'epub', sections, createdAt: now, updatedAt: now };
}

export async function importDocument(file: File, onProgress: (progress: ImportProgress) => void, signal: AbortSignal) {
  if (file.size > MAX_BYTES) throw new Error('Choose a file smaller than 50 MB.');
  if (/\.epub$/i.test(file.name)) return importEpub(file, onProgress, signal);
  if (/\.pdf$/i.test(file.name)) return importPdf(file, onProgress, signal);
  throw new Error('KeyHaven supports EPUB and PDF files.');
}

async function importEpub(file: File, onProgress: (progress: ImportProgress) => void, signal: AbortSignal) {
  onProgress({ phase: 'reading', current: 0, total: 1, message: 'Opening EPUB…' });
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  if (signal.aborted) throw new DOMException('Import cancelled', 'AbortError');
  const containerText = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerText) throw new Error('This EPUB is missing its package information.');
  const parser = new DOMParser();
  const rootPath = parser.parseFromString(containerText, 'application/xml').querySelector('rootfile')?.getAttribute('full-path');
  if (!rootPath) throw new Error('This EPUB has an invalid package file.');
  const packageText = await zip.file(rootPath)?.async('text');
  if (!packageText) throw new Error('The EPUB package could not be read.');
  const packageDoc = parser.parseFromString(packageText, 'application/xml');
  const title = packageDoc.querySelector('metadata title, dc\\:title, title')?.textContent ?? undefined;
  const author = packageDoc.querySelector('metadata creator, dc\\:creator, creator')?.textContent ?? undefined;
  const manifest = new Map([...packageDoc.querySelectorAll('manifest item')].map(item => [item.getAttribute('id') ?? '', item.getAttribute('href') ?? '']));
  const spine = [...packageDoc.querySelectorAll('spine itemref')].map(item => item.getAttribute('idref') ?? '').filter(Boolean);
  const rootDir = rootPath.includes('/') ? rootPath.slice(0, rootPath.lastIndexOf('/')) : '';
  const sections: ImportedSection[] = [];
  for (let index = 0; index < spine.length; index += 1) {
    if (signal.aborted) throw new DOMException('Import cancelled', 'AbortError');
    onProgress({ phase: 'extracting', current: index + 1, total: spine.length, message: `Reading chapter ${index + 1} of ${spine.length}` });
    const href = manifest.get(spine[index]);
    const raw = href ? await zip.file(resolvePath(rootDir, decodeURIComponent(href.split('#')[0])))?.async('text') : undefined;
    if (!raw) continue;
    const doc = parser.parseFromString(raw, 'text/html');
    const blocks = [...doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,pre')];
    const text = cleanText(blocks.length ? blocks.map(block => block.textContent?.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n\n') : doc.body?.textContent ?? '');
    if (text) sections.push({ id: crypto.randomUUID(), title: doc.querySelector('h1,h2,h3,title')?.textContent?.trim() || `Chapter ${sections.length + 1}`, text });
  }
  if (!sections.length) throw new Error('No readable text was found in this EPUB.');
  return asDocument(file, sections, title, author);
}

async function importPdf(file: File, onProgress: (progress: ImportProgress) => void, signal: AbortSignal) {
  onProgress({ phase: 'reading', current: 0, total: 1, message: 'Opening PDF…' });
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  if (pdf.numPages > MAX_PAGES) throw new Error(`This PDF has ${pdf.numPages} pages. The import limit is ${MAX_PAGES}.`);
  const sections: ImportedSection[] = [];
  let ocrWorker: Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>> | null = null;
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      if (signal.aborted) throw new DOMException('Import cancelled', 'AbortError');
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = cleanText(content.items.map(item => 'str' in item ? item.str : '').join(' '));
      if (text.length < 24) {
        onProgress({ phase: 'ocr', current: pageNumber, total: pdf.numPages, message: `Recognizing scanned page ${pageNumber} of ${pdf.numPages}` });
        const canvas = document.createElement('canvas');
        const viewport = page.getViewport({ scale: 1.65 });
        canvas.width = viewport.width; canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Your browser could not prepare this page for OCR.');
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        if (!ocrWorker) { const { createWorker } = await import('tesseract.js'); ocrWorker = await createWorker('eng'); }
        text = cleanText((await ocrWorker.recognize(canvas)).data.text);
      } else onProgress({ phase: 'extracting', current: pageNumber, total: pdf.numPages, message: `Reading page ${pageNumber} of ${pdf.numPages}` });
      if (text) sections.push({ id: crypto.randomUUID(), title: `Page ${pageNumber}`, text });
    }
  } finally { await ocrWorker?.terminate(); }
  if (!sections.length) throw new Error('No readable text was found in this PDF.');
  return asDocument(file, sections);
}
