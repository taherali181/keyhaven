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
