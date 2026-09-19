'use client';

import type { DocumentAssetRecord, DocumentFileRecord, ImportedDocumentRecord, ImportedSection } from '@/types';
import { imageToken } from '@/lib/reading';
import { loadPdfJs } from '@/lib/pdf';

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_PAGES = 500;

export interface ImportProgress { phase: 'reading' | 'extracting' | 'ocr'; current: number; total: number; message: string; }

/**
 * An import: the document (text, backed up with your account), its pictures (EPUB) and its original file (PDF).
 * Pictures and original files stay on this device.
 */
export interface ImportResult { document: ImportedDocumentRecord; assets: DocumentAssetRecord[]; file: DocumentFileRecord | null }

const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
/** Pictures smaller than this (spacers, ornaments, bullets) are left out. */
const MIN_IMAGE_SIDE = 48;

async function imageSize(blob: Blob): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

function cleanText(value: string) {
  return value.replace(/\u00ad/g, '').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function resolvePath(base: string, relative: string) {
  const parts = `${base}/${relative}`.split('/');
  const resolved: string[] = [];
  for (const part of parts) { if (!part || part === '.') continue; if (part === '..') resolved.pop(); else resolved.push(part); }
  return resolved.join('/');
}

function asDocument(file: File, sections: ImportedSection[], title?: string, author?: string, id: string = crypto.randomUUID()): ImportedDocumentRecord {
  const now = Date.now();
  return { id, title: title?.trim() || file.name.replace(/\.(epub|pdf)$/i, ''), author: author?.trim() || 'Unknown author', format: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'epub', sections, createdAt: now, updatedAt: now };
}

export async function importDocument(file: File, onProgress: (progress: ImportProgress) => void, signal: AbortSignal): Promise<ImportResult> {
  if (file.size > MAX_BYTES) throw new Error('Choose a file smaller than 50 MB.');
  if (/\.epub$/i.test(file.name)) return importEpub(file, onProgress, signal);
  if (/\.pdf$/i.test(file.name)) return importPdf(file, onProgress, signal);
  throw new Error('KeyHaven supports EPUB and PDF files.');
}

async function importEpub(file: File, onProgress: (progress: ImportProgress) => void, signal: AbortSignal): Promise<ImportResult> {
  const documentId = crypto.randomUUID();
  const assets: DocumentAssetRecord[] = [];
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
    const chapterPath = href ? resolvePath(rootDir, decodeURIComponent(href.split('#')[0])) : '';
    const raw = chapterPath ? await zip.file(chapterPath)?.async('text') : undefined;
    if (!raw) continue;
    const doc = parser.parseFromString(raw, 'text/html');
    const chapterDir = chapterPath.includes('/') ? chapterPath.slice(0, chapterPath.lastIndexOf('/')) : '';
    // Text blocks and pictures in reading order. A picture inside a text block becomes its own paragraph before it.
    const nodes = [...doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,img,image')]
      .filter(node => !node.parentElement?.closest('h1,h2,h3,h4,h5,h6,p,li,blockquote,pre') || /^(img|image)$/i.test(node.tagName));
    const paragraphs: string[] = [];
    for (const node of nodes) {
      if (/^(img|image)$/i.test(node.tagName)) {
        const source = node.getAttribute('src') ?? node.getAttribute('href') ?? node.getAttribute('xlink:href') ?? '';
        const path = source && !/^(data|https?):/i.test(source) ? resolvePath(chapterDir, decodeURIComponent(source.split('#')[0])) : '';
        const entry = path ? zip.file(path) : null;
        const mime = IMAGE_TYPES[path.split('.').pop()?.toLowerCase() ?? ''];
        if (!entry || !mime) continue;
        const blob = new Blob([await entry.async('arraybuffer')], { type: mime });
        const size = await imageSize(blob);
        if (size && (size.width < MIN_IMAGE_SIDE || size.height < MIN_IMAGE_SIDE)) continue;
        const asset: DocumentAssetRecord = { id: crypto.randomUUID(), documentId, blob, mime, width: size?.width ?? 4, height: size?.height ?? 3, alt: (node.getAttribute('alt') ?? '').trim() };
        assets.push(asset);
        paragraphs.push(imageToken(asset.id));
        continue;
      }
      const text = node.textContent?.replace(/\s+/g, ' ').trim();
      if (text) paragraphs.push(text);
    }
    const text = cleanText(paragraphs.length ? paragraphs.join('\n\n') : doc.body?.textContent ?? '');
    if (text) sections.push({ id: crypto.randomUUID(), title: doc.querySelector('h1,h2,h3,title')?.textContent?.trim() || `Chapter ${sections.length + 1}`, text });
  }
  if (!sections.length) throw new Error('No readable text was found in this EPUB.');
  return { document: asDocument(file, sections, title, author, documentId), assets, file: null };
}

async function importPdf(file: File, onProgress: (progress: ImportProgress) => void, signal: AbortSignal): Promise<ImportResult> {
  onProgress({ phase: 'reading', current: 0, total: 1, message: 'Opening PDF…' });
  const pdfjs = await loadPdfJs();
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
  const record = asDocument(file, sections);
  // The original stays on this device, so its pages can be shown as they look.
  return { document: record, assets: [], file: { id: record.id, blob: file, name: file.name, size: file.size, addedAt: Date.now() } };
}
