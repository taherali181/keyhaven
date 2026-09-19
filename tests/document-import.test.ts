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
    const { document, assets, file: original } = await importDocument(file, vi.fn(), new AbortController().signal);
    expect(assets).toEqual([]);
    expect(original).toBeNull();
    expect(document).toMatchObject({ title: 'Quiet Book', author: 'A. Reader', format: 'epub' });
    expect(document.sections).toHaveLength(1);
    expect(document.sections[0].text).toContain('Words settle softly.');
  });

  it('keeps pictures in reading order as their own paragraphs, stored apart from the text', async () => {
    const zip = new JSZip();
    zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OPS/book.opf" /></rootfiles></container>');
    zip.file('OPS/book.opf', '<package><metadata><title>Pictures</title></metadata><manifest><item id="one" href="text/one.xhtml" /></manifest><spine><itemref idref="one" /></spine></package>');
    zip.file('OPS/text/one.xhtml', '<html><body><h1>Map</h1><p>Before the map.</p><figure><img src="../images/map.png" alt="The island" /></figure><p>After the map.</p><img src="../images/missing.png" /></body></html>');
    zip.file('OPS/images/map.png', new Uint8Array([137, 80, 78, 71]));
    const file = new File([await zip.generateAsync({ type: 'arraybuffer' })], 'pictures.epub');
    const { document, assets } = await importDocument(file, vi.fn(), new AbortController().signal);
    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({ documentId: document.id, mime: 'image/png', alt: 'The island' });
    expect(document.sections[0].text.split('\n\n')).toEqual(['Map', 'Before the map.', `[[kh-img:${assets[0].id}]]`, 'After the map.']);
  });
});
