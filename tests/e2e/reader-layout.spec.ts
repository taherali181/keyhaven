import { expect, test } from '@playwright/test';
import { seedSettings } from './helpers';

const STORY = '/read?story=gift-of-the-magi';

test('mobile hidden chapter label sits below navigation and its pill reveals the title', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('keyhaven_settings_v1', JSON.stringify({ storyMode: 'read', readerBarPinned: false })));
  await page.goto(STORY);
  await page.locator('.story-reader-copy p').first().waitFor();
  const label = page.locator('.story-bar-peek'), pill = page.getByRole('button', { name: 'Show title bar' });
  await expect(label).toHaveCSS('opacity', '1');
  const navBox = (await page.locator('.mobile-bar').boundingBox())!, labelBox = (await label.boundingBox())!, pillBox = (await pill.boundingBox())!;
  expect(pillBox.y).toBeGreaterThan(navBox.y + navBox.height);
  expect(labelBox.y).toBeGreaterThan(pillBox.y);
  expect(labelBox.y + labelBox.height).toBeLessThan((await page.locator('.story-reader-copy p').first().boundingBox())!.y);
  await pill.click();
  await expect(label).toHaveCSS('opacity', '0');
  await expect(page.getByRole('button', { name: 'Contents' })).toBeVisible();
});

test('reader keeps glyph spacing and the title overlay independent of hover', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedSettings(page, { storyMode: 'type' });
  await page.goto(STORY);
  await page.locator('.typing-character').first().waitFor();
  const firstGlyphTop = () => page.locator('.typing-character').first().evaluate(node => {
    const text = [...node.childNodes].find(child => child.nodeType === Node.TEXT_NODE)!;
    const range = document.createRange(); range.selectNodeContents(text);
    return range.getBoundingClientRect().top;
  });
  await expect.poll(async () => {
    const bar = await page.locator('.story-bar').boundingBox();
    return Math.abs((await firstGlyphTop()) - bar!.y - bar!.height - bar!.y);
  }).toBeLessThanOrEqual(2);
  const before = await page.locator('.reader-stage').boundingBox();
  await page.locator('.story-bar-title').hover();
  await expect(page.locator('.story-bar-surface')).toHaveCSS('height', '128px');
  expect(await page.locator('.reader-stage').boundingBox()).toEqual(before);
  await expect(page.locator('.story-bar-row')).toHaveCSS('height', '68px');
});

test('hidden title has a quiet label and screen-aligned hints clear the bottom bar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => {
    localStorage.setItem('keyhaven_sidebar_v2', 'pinned');
    localStorage.setItem('keyhaven_settings_v1', JSON.stringify({ storyMode: 'read' }));
  });
  await page.goto(STORY);
  await page.locator('.story-reader-copy p').first().waitFor();
  await page.getByRole('button', { name: 'Auto-hide title bar' }).click();
  await page.mouse.move(1200, 400);
  await expect(page.locator('.story-bar-peek')).toHaveText('The Gift of the Magi');
  await expect(page.locator('.story-bar-peek')).toHaveCSS('opacity', '1');
  const hint = page.locator('.reading-hint');
  await expect(hint).toHaveCSS('position', 'fixed');
  const targetLeft = await page.locator('.app-content').evaluate(node => node.getBoundingClientRect().left + 24);
  await expect.poll(async () => (await hint.boundingBox())!.x).toBe(targetLeft);
  // Hidden mode: the hint shares the bottom bar's row (level with it, beside it) below the text.
  await expect.poll(async () => {
    const hintBox = (await hint.boundingBox())!, barBox = (await page.locator('.reader-bar').boundingBox())!;
    return Math.abs((hintBox.y + hintBox.height / 2) - (barBox.y + barBox.height / 2));
  }).toBeLessThanOrEqual(2);
  const hintBox = (await hint.boundingBox())!, barBox = (await page.locator('.reader-bar').boundingBox())!;
  expect(hintBox.x + hintBox.width).toBeLessThan(barBox.x);
  const textBottom = await page.locator('.story-reader-viewport').evaluate(node => node.getBoundingClientRect().bottom);
  expect(hintBox.y).toBeGreaterThan(textBottom);
  await page.getByRole('button', { name: 'Show title bar' }).click();
  await expect(page.locator('.story-bar-peek')).toHaveCSS('opacity', '0');
});

test('reading segments represent pages and typing segments still represent parts', async ({ page }) => {
  await seedSettings(page, { storyMode: 'type' });
  await page.goto(STORY);
  await page.locator('.typing-character').first().waitFor();
  const parts = Number((await page.locator('.story-bar .eyebrow').textContent())!.match(/of (\d+)/)![1]);
  await expect(page.locator('.reader-bar .story-segments > i')).toHaveCount(parts);
  await page.getByRole('radio', { name: 'Reading mode' }).click();
  const progress = page.getByRole('progressbar', { name: 'Story progress' });
  await expect(progress).toHaveAttribute('aria-valuetext', /^Page 1 of/);
  await expect(page.locator('[data-stat="bookPage"]')).toBeVisible();
  const pages = Number((await progress.getAttribute('aria-valuetext'))!.match(/of (\d+)/)![1]);
  await expect(page.locator('.reader-bar .story-segments > i')).toHaveCount(pages);
  await expect(page.locator('.reader-bar .story-segments > .is-done')).toHaveCount(1);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.reader-bar .story-segments > .is-done')).toHaveCount(2);
  await expect(page.locator('[data-stat="bookPage"] strong')).toHaveText(`2/${pages}`);
  await page.getByRole('radio', { name: 'Typing mode' }).click();
  await expect(page.locator('.reader-bar .story-segments > i')).toHaveCount(parts);
});

test('book author, named chapters and exact page totals survive chapter boundaries and revisits', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => localStorage.setItem('keyhaven_settings_v1', JSON.stringify({ storyMode: 'read', readerStats: { read: ['bookPage', 'chapterName'] } })));
  const chapter = (title: string, text: string, paragraphs: number) => `<h2>${title}</h2>${Array.from({ length: paragraphs }, () => `<p>${text.repeat(18)}</p>`).join('')}`;
  await page.route('**/api/gutenberg/1342', route => route.fulfill({
    headers: { 'content-type': 'text/html', 'x-book-format': 'html' },
    body: `<html><body>${chapter('Chapter I.', 'A quiet day passed. ', 9)}${chapter('Chapter II. The Storm', 'Extraordinary circumstances followed. ', 13)}${chapter('Chapter III. Home', 'At last they came home. ', 7)}</body></html>`
  }));
  await page.goto('/read?book=1342');
  await expect(page.locator('.story-bar-byline')).toHaveText(/^Jane Austen(?: · \d+)?$/);
  await expect(page.locator('.story-bar .eyebrow')).toHaveText('Chapter 1 of 3');
  const stat = page.locator('[data-stat="bookPage"] strong');
  await expect(stat).toHaveText(/^1\/\d+$/);
  const total = Number((await stat.innerText()).split('/')[1]);
  let chapterPages = 0;
  for (let chapterIndex = 0; chapterIndex < 3; chapterIndex++) {
    const progress = page.getByRole('progressbar', { name: 'Chapter progress' });
    const pages = Number((await progress.getAttribute('aria-valuetext'))!.match(/of (\d+)/)![1]);
    for (let local = 1; local <= pages; local++) {
      await expect(stat).toHaveText(`${chapterPages + local}/${total}`);
      if (local < pages || chapterIndex < 2) {
        await page.keyboard.press('ArrowRight');
        await expect(stat).not.toHaveText(`${chapterPages + local}/${total}`);
      }
    }
    chapterPages += pages;
  }
  expect(chapterPages).toBe(total);
  await page.getByRole('button', { name: 'Contents' }).click();
  const titles = page.locator('.contents-title');
  await expect(titles).toHaveText(['Chapter 1', 'The Storm', 'Home']);
  await page.getByRole('option', { name: /The Storm/ }).click();
  await expect(page.locator('.story-bar .eyebrow')).toHaveText('Chapter 2 of 3 · The Storm');
  await expect(page.locator('[data-stat="chapterName"] strong')).toHaveText('The Storm');
  await expect(stat).toHaveText(new RegExp(`^\\d+/${total}$`));
  const revisited = await stat.innerText();
  await page.getByRole('radio', { name: 'Typing mode' }).click();
  await page.getByRole('radio', { name: 'Reading mode' }).click();
  await expect(stat).toHaveText(revisited);
  await page.setViewportSize({ width: 900, height: 600 });
  await expect.poll(async () => Number((await stat.innerText()).split('/')[1])).toBeGreaterThan(total);
  const resizedTotal = Number((await stat.innerText()).split('/')[1]);
  await page.keyboard.press('ArrowRight');
  await expect(stat).toHaveText(new RegExp(`^\\d+/${resizedTotal}$`));
  await page.getByRole('button', { name: 'Auto-hide title bar' }).click();
  await page.mouse.move(1200, 400);
  await expect(page.locator('.story-bar-peek')).toHaveText('Chapter 2 · The Storm');
});

test('long chapters use a continuous page progress bar', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 600 });
  await page.addInitScript(() => localStorage.setItem('keyhaven_settings_v1', JSON.stringify({ storyMode: 'read' })));
  await page.route('**/api/gutenberg/1342', route => route.fulfill({
    headers: { 'content-type': 'text/html', 'x-book-format': 'html' },
    body: `<html><body><h2>Chapter I.</h2>${Array.from({ length: 60 }, () => `<p>${'An extraordinary journey began in the mountains. '.repeat(20)}</p>`).join('')}</body></html>`
  }));
  await page.goto('/read?book=1342');
  await expect(page.locator('[data-stat="bookPage"]')).toBeVisible();
  const progress = page.getByRole('progressbar', { name: 'Chapter progress' });
  const count = Number((await progress.getAttribute('aria-valuetext'))!.match(/of (\d+)/)![1]);
  expect(count).toBeGreaterThan(24);
  const segments = page.locator('.reader-bar .story-segments');
  await expect(segments).toHaveClass(/is-continuous/);
  await expect(segments.locator('i')).toHaveCount(1);
  const fill = () => segments.locator('b').evaluate(node => new DOMMatrixReadOnly(getComputedStyle(node).transform).a);
  await expect.poll(fill).toBeCloseTo(1 / count, 4);
  await page.keyboard.press('ArrowRight');
  await expect.poll(fill).toBeCloseTo(2 / count, 4);
});

test('a new reader opens stories in Read mode', async ({ page }) => {
  await page.goto(STORY);
  await page.locator('.story-reader-copy p').first().waitFor();
  await expect(page.getByRole('radio', { name: 'Reading mode' })).toBeChecked();
  await expect(page.getByLabel('Typing input')).toHaveCount(0);
});
