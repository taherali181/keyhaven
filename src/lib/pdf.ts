'use client';
// pdf.js, loaded on demand with its worker. Shared by PDF import and the PDF section's page view.

export type PdfJs = typeof import('pdfjs-dist');

let loading: Promise<PdfJs> | null = null;

export function loadPdfJs(): Promise<PdfJs> {
  loading ??= import('pdfjs-dist').then(pdfjs => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    return pdfjs;
  });
  return loading;
}

/** The page number a PDF section stands for: imports name each page's section "Page N". */
export const sectionPage = (title: string) => Number(title.match(/^Page (\d+)$/)?.[1]) || null;

/** The section to open for a page: the last section whose page is at or before it (pages without text have none). */
export function sectionForPage(titles: string[], page: number) {
  let best = 0;
  titles.forEach((title, index) => { const number = sectionPage(title); if (number !== null && number <= page) best = index; });
  return best;
}
