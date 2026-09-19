import { expect, test, type Page } from '@playwright/test';
import { seedSettings } from './helpers';

const STORY = '/read?story=gift-of-the-magi';
const pageText = (page: Page) => page.getByRole('progressbar', { name: 'Story progress' });

async function open(page: Page, readerInput: Record<string, unknown>) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedSettings(page, { storyMode: 'read', readerInput });
  await page.goto(STORY);
  await expect(pageText(page)).toHaveAttribute('aria-valuetext', /^Page 1 of/);
  await page.keyboard.press('Escape');
}

/** Retries an input until the page moves, in case the first one lands before the reader is listening. */
async function until(page: Page, act: () => Promise<void>, expected: RegExp) {
  await expect(async () => {
    if (!expected.test((await pageText(page).getAttribute('aria-valuetext')) ?? '')) await act();
    await expect(pageText(page)).toHaveAttribute('aria-valuetext', expected, { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

test('the mouse wheel turns pages when switched on', async ({ page }) => {
  await open(page, { wheel: true });
  await page.mouse.move(720, 450);
  await until(page, () => page.mouse.wheel(0, 120), /^Page 2 of/);
  await page.waitForTimeout(500);
  await page.mouse.wheel(0, -120);
  await expect(pageText(page)).toHaveAttribute('aria-valuetext', /^Page 1 of/);
});

test('the wheel leaves pages alone by default', async ({ page }) => {
  await open(page, {});
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(600);
  await expect(pageText(page)).toHaveAttribute('aria-valuetext', /^Page 1 of/);
});

test('remapped keys turn pages and replace the old ones', async ({ page }) => {
  await open(page, { keys: { next: ['j'], prev: ['k'], first: ['Home'], last: ['End'] } });
  await until(page, () => page.keyboard.press('j'), /^Page 2 of/);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await expect(pageText(page)).toHaveAttribute('aria-valuetext', /^Page 2 of/);
  await page.keyboard.press('k');
  await expect(pageText(page)).toHaveAttribute('aria-valuetext', /^Page 1 of/);
  // The corner hint shows the keys in use.
  await expect(page.locator('.reading-hint kbd')).toHaveText(['K', 'J']);
});

test('clicking the page edges turns pages when click zones are on', async ({ page }) => {
  await open(page, { clickZones: true });
  const box = (await page.locator('.reader-stage').boundingBox())!;
  await until(page, () => page.mouse.click(box.x + box.width - 20, box.y + box.height / 2), /^Page 2 of/);
  await page.mouse.click(box.x + 20, box.y + box.height / 2);
  await expect(pageText(page)).toHaveAttribute('aria-valuetext', /^Page 1 of/);
  // The middle of the page is for reading, not turning.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
  await expect(pageText(page)).toHaveAttribute('aria-valuetext', /^Page 1 of/);
});
