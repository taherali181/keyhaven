import { expect, test, type Page } from '@playwright/test';
import { seedSettings } from './helpers';

const STORY = '/read?story=gift-of-the-magi';

/** Selects a stretch of a paragraph on the page, the way a drag would, and lets go. */
async function select(page: Page, paragraph: number, from: number, to: number) {
  await page.evaluate(([index, start, end]) => {
    const element = document.querySelector(`.story-reader-viewport [data-paragraph="${index}"]`)!;
    const text = element.firstChild!;
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, end);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  }, [paragraph, from, to] as const);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedSettings(page, { storyMode: 'read' });
});

test('highlight a passage, add a note, and find it again after a reload', async ({ page }) => {
  await page.goto(STORY);
  await page.locator('.story-reader-viewport [data-paragraph="0"]').waitFor();
  await select(page, 0, 15, 33);
  const popover = page.getByRole('dialog', { name: 'Highlight text' });
  await popover.getByRole('radio', { name: 'Green' }).click();
  const mark = page.locator('.story-reader-viewport mark.hl');
  await expect(mark).toHaveText('eighty-seven cents');
  await expect(mark).toHaveAttribute('data-color', 'green');
  const editor = page.getByRole('dialog', { name: 'Highlight' });
  await editor.getByRole('button', { name: 'Note', exact: true }).click();
  await editor.getByLabel('Note').fill('Every penny counted.');
  await editor.getByRole('button', { name: 'Save note' }).click();
  await expect(mark).toHaveAttribute('data-note', 'true');

  await page.reload();
  await expect(mark).toHaveText('eighty-seven cents');
  await page.getByRole('button', { name: 'Highlights and notes' }).click();
  const panel = page.getByRole('dialog', { name: 'Highlights and notes' });
  await expect(panel).toContainText('eighty-seven cents');
  await expect(panel).toContainText('Every penny counted.');
  await page.keyboard.press('Escape');

  // Recolour, then remove.
  await mark.click();
  await page.getByRole('dialog', { name: 'Highlight' }).getByRole('radio', { name: 'Blue' }).click();
  await expect(mark).toHaveAttribute('data-color', 'blue');
  await page.getByRole('dialog', { name: 'Highlight' }).getByRole('button', { name: 'Remove' }).click();
  await expect(mark).toHaveCount(0);
});

test('highlights never change where pages break', async ({ page }) => {
  await page.goto(STORY);
  const progress = page.getByRole('progressbar', { name: 'Story progress' });
  // Wait for the real page count (it reads "1 of 1" until the pages are measured).
  await expect(progress).toHaveAttribute('aria-valuetext', /^Page 1 of (?!1,)\d+/);
  const before = await progress.getAttribute('aria-valuetext');
  await select(page, 0, 0, 60);
  await page.getByRole('dialog', { name: 'Highlight text' }).getByRole('radio', { name: 'Yellow' }).click();
  await expect(page.locator('mark.hl')).toHaveCount(1);
  await expect(progress).toHaveAttribute('aria-valuetext', before!);
});

test('the notes panel jumps to a highlight further on', async ({ page }) => {
  // /profile opens the database; a highlight deep in the story goes straight in.
  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'Guest reader' })).toBeVisible();
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('KeyHavenDB'); request.onsuccess = () => resolve(request.result); request.onerror = reject; });
    const transaction = database.transaction(['highlights'], 'readwrite');
    transaction.objectStore('highlights').put({ id: 'deep', workKey: 'story:gift-of-the-magi', sectionIndex: 0, paragraph: 30, start: 0, end: 12, quote: 'placeholder', color: 'pink', createdAt: 1, updatedAt: 1, dirty: 0 });
    await new Promise(resolve => { transaction.oncomplete = resolve; });
  });
  await page.goto(STORY);
  const progress = page.getByRole('progressbar', { name: 'Story progress' });
  await expect(progress).toHaveAttribute('aria-valuetext', /^Page 1 of/);
  // The stored quote no longer matches paragraph 30, so it is found again only if present; either way the panel lists it.
  await page.getByRole('button', { name: 'Highlights and notes' }).click();
  await page.getByRole('dialog', { name: 'Highlights and notes' }).getByRole('button', { name: /placeholder/ }).click();
  await expect(progress).not.toHaveAttribute('aria-valuetext', /^Page 1 of/);
});

test('a backup file restores highlights and imported books', async ({ page }) => {
  await page.goto(STORY);
  await page.locator('.story-reader-viewport [data-paragraph="0"]').waitFor();
  const backup = {
    app: 'keyhaven', version: 1, exportedAt: 1, settings: null, testResults: [], arcadeScores: [], readingSessions: [], bookProgress: [], shelf: [], academyState: null,
    importedDocuments: [{ id: '3f1b2c4d-1a2b-4c3d-8e9f-0a1b2c3d4e5f', title: 'My Notes Book', author: 'Me', format: 'epub', sections: [{ id: 's1', title: 'One', text: 'Hello there.' }], createdAt: 1, updatedAt: 2 }],
    highlights: [{ id: 'restored', workKey: 'story:gift-of-the-magi', sectionIndex: 0, paragraph: 0, start: 0, end: 10, quote: 'One dollar', color: 'purple', createdAt: 1, updatedAt: 2 }]
  };
  await page.mouse.move(2, 450);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('complementary', { name: 'Settings' });
  await settings.getByRole('tab', { name: 'Data' }).click();
  await settings.locator('input[type="file"]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(settings.getByText('Restored 2 records from the backup.')).toBeVisible();
  await page.reload();
  await expect(page.locator('.story-reader-viewport mark.hl')).toHaveText('One dollar');
});
