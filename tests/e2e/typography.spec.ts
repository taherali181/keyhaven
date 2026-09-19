import { expect, test } from '@playwright/test';
import { seedSettings } from './helpers';

const STORY = '/read?story=gift-of-the-magi';

test('typography sliders and presets resize the reader and re-paginate it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedSettings(page, { storyMode: 'type' });
  await page.goto(STORY);
  await page.locator('.typing-character').first().waitFor();
  await page.locator('.story-side').getByText('Read', { exact: true }).click();
  const reader = page.locator('.story-reader');
  await expect(reader).toBeVisible();
  const progress = page.getByRole('progressbar', { name: 'Story progress' });
  const pages = async () => Number(((await progress.getAttribute('aria-valuetext')) ?? '').match(/Page \d+ of (\d+)/)?.[1]);
  await expect.poll(pages).toBeGreaterThan(0);
  const before = await pages();

  await page.getByRole('button', { name: 'Reading settings' }).first().click();
  await page.getByRole('tab', { name: 'Typography' }).click();
  const increase = page.getByRole('button', { name: 'Increase text size' });
  for (let step = 0; step < 5; step += 1) await increase.click();
  await expect(page.getByRole('slider', { name: 'Text size' })).toHaveValue('28');
  await expect.poll(() => reader.evaluate(node => getComputedStyle(node).fontSize)).toBe('28px');

  await page.getByRole('button', { name: /Large print/ }).click();
  await expect(page.getByRole('button', { name: /Large print/ })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => reader.evaluate(node => getComputedStyle(node).fontSize)).toBe('32px');
  // Bigger type means more pages, and the page frame stays a whole number of lines.
  await expect.poll(pages).toBeGreaterThan(before);
  const whole = await reader.evaluate(node => {
    const viewport = node.querySelector<HTMLElement>('.story-reader-viewport')!;
    const line = Number.parseFloat(getComputedStyle(node.querySelector('p')!).lineHeight);
    return Math.abs(viewport.offsetHeight / line - Math.round(viewport.offsetHeight / line)) < 0.02;
  });
  expect(whole).toBe(true);
});
