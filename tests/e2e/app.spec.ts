import { expect, test } from '@playwright/test';

test('story mode renders the literary surface and visual wrap hyphens', async ({ page }) => {
  await page.goto('/stories');
  await expect(page.getByRole('heading', { name: 'The Gift of the Magi' })).toBeVisible();
  await expect(page.locator('.typing-copy.literary')).toBeVisible();
  await expect(page.locator('.wrap-hyphen').first()).toBeAttached();
});

test('competitive text keeps every word on one visual line', async ({ page }) => {
  await page.goto('/speed-test');
  const splitWords = await page.locator('.typing-word').evaluateAll(words => words.filter(word => {
    const characters = [...word.querySelectorAll('.typing-character')];
    return new Set(characters.map(character => (character as HTMLElement).offsetTop)).size > 1;
  }).length);
  expect(splitWords).toBe(0);
});

test('a 15 second speed test stops and opens one result', async ({ page }) => {
  test.setTimeout(25_000);
  await page.goto('/speed-test');
  await page.getByRole('button', { name: '15s' }).click();
  const firstCharacter = await page.locator('.typing-character').first().innerText();
  await page.getByLabel('Typing input').press(firstCharacter);
  await expect(page.getByText('Result Summary')).toBeVisible({ timeout: 17_000 });
  await expect(page.getByText('Result Summary')).toHaveCount(1);
});

test('alphabet sprint accepts keyboard input without a manual focus click', async ({ page }) => {
  await page.goto('/arcade');
  await page.keyboard.type('abc');
  await expect(page.getByText('D', { exact: true })).toBeVisible();
});

test('mobile pages do not overflow the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/speed-test');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
