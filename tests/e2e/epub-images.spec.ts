import { deflateSync } from 'node:zlib';
import JSZip from 'jszip';
import { expect, test } from '@playwright/test';
import { seedSettings } from './helpers';

/** A solid-colour PNG of the given size, built by hand so the test needs no image files. */
function png(width: number, height: number) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (bytes: Buffer) => { let c = 0xffffffff; for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 90)]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))), chunk('IEND', Buffer.alloc(0))]);
}

async function pictureBook() {
  const zip = new JSZip();
  const words = (count: number) => Array.from({ length: count }, (_, index) => ['quiet', 'river', 'lamp', 'window', 'garden'][index % 5]).join(' ');
  zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OPS/book.opf" /></rootfiles></container>');
  zip.file('OPS/book.opf', '<package><metadata><title>Picture Book</title><creator>Test Author</creator></metadata><manifest><item id="one" href="one.xhtml" /></manifest><spine><itemref idref="one" /></spine></package>');
  zip.file('OPS/one.xhtml', `<html><body><h1>The Map</h1>${Array.from({ length: 4 }, () => `<p>${words(60)}.</p>`).join('')}<p><img src="map.png" alt="A map of the island" /></p>${Array.from({ length: 8 }, () => `<p>${words(60)}.</p>`).join('')}</body></html>`);
  zip.file('OPS/map.png', png(640, 400));
  return Buffer.from(await zip.generateAsync({ type: 'uint8array' }));
}

test('pictures in an imported EPUB show in Read mode, whole-line sized, and never in Type mode', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedSettings(page, { storyMode: 'read' });
  await page.goto('/read?story=gift-of-the-magi');
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  const library = page.getByRole('dialog', { name: 'Library' });
  await library.getByRole('tab', { name: 'My library' }).click();
  await library.locator('input[type="file"]').setInputFiles({ name: 'picture-book.epub', mimeType: 'application/epub+zip', buffer: await pictureBook() });
  await library.getByRole('button', { name: /^Picture Book Test Author/ }).click();
  await expect(page.locator('.story-bar h1')).toHaveText('Picture Book');

  // The picture is sized to whole lines and placed so it never straddles a page break.
  // Pictures load just after the text; the pages are measured again once they have.
  await expect(page.locator('.story-reader-viewport').first().locator('.story-figure img')).toHaveCount(1);
  await page.waitForTimeout(300);
  const placement = await page.evaluate(() => {
    const figure = document.querySelector<HTMLElement>('.story-reader-viewport .story-figure')!;
    const pageHeight = figure.closest<HTMLElement>('.story-reader-viewport')!.getBoundingClientRect().height;
    const line = parseFloat(getComputedStyle(document.querySelector('.story-reader-copy p:not(.story-figure)')!).lineHeight);
    const within = figure.offsetTop % pageHeight;
    return { page: Math.floor(figure.offsetTop / pageHeight), wholeLines: Math.abs(figure.getBoundingClientRect().height / line - Math.round(figure.getBoundingClientRect().height / line)) < 0.01, fitsOnPage: within + figure.offsetHeight <= pageHeight + 1 };
  });
  expect(placement).toMatchObject({ wholeLines: true, fitsOnPage: true });
  // Turn to its page: the picture shows there, whole.
  const progress = page.getByRole('progressbar', { name: 'Chapter progress' });
  await expect(progress).toHaveAttribute('aria-valuetext', /^Page 1 of (?!1,)/);
  for (let turn = 0; turn < placement.page; turn++) {
    const before = await progress.getAttribute('aria-valuetext');
    await page.keyboard.press('ArrowRight');
    await expect(progress).not.toHaveAttribute('aria-valuetext', before!);
  }
  const picture = page.locator('.story-reader-viewport').first().locator('.story-figure img');
  await expect(picture).toHaveAttribute('alt', 'A map of the island');
  await expect(picture).toBeInViewport({ ratio: 1 });

  await page.getByRole('radio', { name: 'Typing mode' }).click();
  await expect(page.getByLabel('Typing input')).toBeVisible();
  expect(await page.locator('.typing-copy').innerText()).not.toContain('kh-img');
});
