import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import { importDocument } from '@/lib/document-import';

describe('document import', () => {
  it('extracts ordered, normalized text from an EPUB spine', async () => {
    const zip = new JSZip();
    zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OPS/book.opf" /></rootfiles></container>');
    zip.file('OPS/book.opf', '<package><metadata><title>Quiet Book</title><creator>A. Reader</creator></metadata><manifest><item id="one" href="one.xhtml" /></manifest><spine><itemref idref="one" /></spine></package>');
    zip.file('OPS/one.xhtml', '<html><head><title>First Light</title></head><body><h1>First Light</h1><p>Words   settle\n\n\nsoftly.</p></body></html>');
    const bytes = await zip.generateAsync({ type: 'arraybuffer' });
    const file = new File([bytes], 'quiet.epub', { type: 'application/epub+zip' });
    const document = await importDocument(file, vi.fn(), new AbortController().signal);
    expect(document).toMatchObject({ title: 'Quiet Book', author: 'A. Reader', format: 'epub' });
    expect(document.sections).toHaveLength(1);
    expect(document.sections[0].text).toContain('Words settle softly.');
  });
});
