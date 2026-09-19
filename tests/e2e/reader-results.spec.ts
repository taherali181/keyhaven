import { expect, test, type Page } from '@playwright/test';
import { seedSettings, typePassage } from './helpers';

test.setTimeout(90_000);

// Stories open in Read mode by default; these tests type.
test.beforeEach(async ({ page }) => { await seedSettings(page, { storyMode: 'type' }); });

const moreHeight = (page: Page) => page.locator('.rr-toast .rr-toast-more').evaluate(node => node.getBoundingClientRect().height);

test('a finished quote rises from the bottom bar, opens up on hover and in full with earlier results', async ({ page }) => {
  await page.goto('/quotes');
  await page.mouse.move(2, 2);
  await typePassage(page);

  const toast = page.locator('.rr-toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('Quote done');
  await expect(toast).toContainText('First attempt');
  await expect(page.getByText('Result Summary')).toHaveCount(0);

  // Hovering reveals the detail.
  expect(await moreHeight(page)).toBeLessThan(2);
  await toast.hover();
  await expect.poll(() => moreHeight(page)).toBeGreaterThan(40);
  await expect(toast.getByText('Consistency')).toBeVisible();

  // Clicking opens the full result with earlier attempts.
  await toast.getByRole('button', { name: 'Details' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Previous results' })).toBeVisible();
  await expect(dialog.locator('.rr-history li')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // Enter moves on; the result waits until typing starts, then tucks into the chip.
  const input = page.getByLabel('Typing input');
  await expect(input).toBeFocused();
  const firstQuote = await page.locator('.typing-copy').innerText();
  await page.mouse.move(2, 2);
  await page.keyboard.press('Enter');
  await expect(page.locator('.typing-copy')).not.toHaveText(firstQuote);
  await expect(toast).toBeVisible();

  await typePassage(page);
  await expect(toast).toContainText(/vs average|New best/);
  await toast.getByRole('button', { name: 'Details' }).click();
  await expect(dialog.locator('.rr-history li')).toHaveCount(2);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();

  await page.mouse.move(2, 2);
  await page.keyboard.press('Enter');
  const first = await page.locator('.typing-character').first().innerText();
  await input.press(first);
  await expect(toast).toHaveCount(0);
  const chip = page.locator('.rr-chip');
  await expect(chip).toContainText('Last result');
  await chip.click();
  await expect(toast).toBeVisible();
});

test('a finished story part shows its result on the bottom bar and moves on', async ({ page }) => {
  // A story part is over a thousand keystrokes, which is slow when the suite runs in parallel.
  test.setTimeout(240_000);
  await page.goto('/read?story=gift-of-the-magi');
  await page.mouse.move(2, 2);
  await typePassage(page);

  const toast = page.locator('.rr-toast');
  await expect(toast).toContainText('Part 1 done');
  await expect(page.locator('.story-bar .eyebrow')).toHaveText(/^Story · Part 1 of/);
  await toast.getByRole('button', { name: /Next part/ }).click();
  await expect(page.locator('.story-bar .eyebrow')).toHaveText(/^Story · Part 2 of/);
  await expect(toast).toBeVisible();

  await page.getByLabel('Typing input').press('Escape');
  await expect(toast).toHaveCount(0);
  await expect(page.locator('.rr-chip')).toContainText('Last result');
});

for (const [name, width, height] of [['laptop', 1280, 720], ['phone', 390, 844]] as const) {
  test(`the full result never scrolls as a whole, only its list of earlier results (${name})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    // /profile opens the database; seed thirty earlier quote results into it.
    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1, name: 'Guest reader' })).toBeVisible();
    await page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('KeyHavenDB'); request.onsuccess = () => resolve(request.result); request.onerror = reject; });
      const transaction = database.transaction(['testResults'], 'readwrite');
      const now = Date.now();
      for (let index = 0; index < 30; index++) transaction.objectStore('testResults').put({ clientId: crypto.randomUUID(), mode: 'quotes', subMode: `seed-${index}`, title: `Earlier quote ${index}`, wpm: 50 + index, rawWpm: 60, accuracy: 95, consistency: 80, duration: 20, timestamp: now - (index + 1) * 3_600_000, errors: 1, errorKeys: {}, totalChars: 120, correctChars: 119, incorrectChars: 1, dirty: 0 });
      await new Promise(resolve => { transaction.oncomplete = resolve; });
    });
    await page.goto('/quotes');
    await page.mouse.move(2, 2);
    await typePassage(page);
    await page.locator('.rr-toast').getByRole('button', { name: 'Details' }).click();
    const dialog = page.getByRole('dialog');
    if (width < 900) await dialog.getByRole('button', { name: 'Previous results' }).click();
    await dialog.getByRole('button', { name: /Show more/ }).click();
    await expect(dialog.locator('.rr-history li')).toHaveCount(16);
    const scroll = await page.evaluate(() => {
      const scrolls = (selector: string) => { const node = document.querySelector(selector)!; return node.scrollHeight > node.clientHeight + 1; };
      return { dialog: scrolls('.rr-dialog'), scrim: scrolls('.rr-dialog-scrim'), list: scrolls('.rr-history') };
    });
    expect(scroll).toEqual({ dialog: false, scrim: false, list: true });
    // The actions stay on screen.
    await expect(dialog.getByRole('button', { name: 'Retry' })).toBeInViewport();
  });
}
