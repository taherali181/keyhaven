import { expect, test } from '@playwright/test';
import { seedSettings } from './helpers';
import { textPdf } from '../fixtures/pdf';

test('a PDF opens as its original pages, turns pages, and switches to reflowed text at the same place', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedSettings(page, { storyMode: 'read' });
  await page.goto('/pdf');
  await expect(page.getByRole('heading', { name: 'Your PDFs' })).toBeVisible();
  const pdf = textPdf(['The first page of the report.', 'The second page has the findings.', 'The third page closes it.']);
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: pdf });

  // Original: real pages, drawn on canvas, with selectable text.
  const status = page.getByRole('status').filter({ hasText: /^Page/ });
  await expect(status).toHaveText('Page 1 of 3');
  await expect(page.getByRole('figure', { name: 'Page 1' }).locator('canvas')).toBeVisible();
  await expect(page.locator('.textLayer')).toContainText('The first page of the report.');
  await expect(async () => {
    if ((await status.textContent()) === 'Page 1 of 3') await page.keyboard.press('ArrowRight');
    await expect(status).toHaveText('Page 2 of 3', { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
  await expect(page.locator('.textLayer')).toContainText('The second page has the findings.');

  // Reflowed: the same page as text in the reader.
  await page.getByRole('button', { name: 'Reflowed' }).click();
  await expect(page).toHaveURL(/\/read$/);
  await expect(page.locator('.story-bar h1')).toHaveText('report');
  await expect(page.locator('.story-reader-viewport').first()).toContainText('The second page has the findings.');

  // And back to the original pages, still on page 2.
  await page.getByRole('button', { name: 'Original pages' }).click();
  await expect(page).toHaveURL(/\/pdf$/);
  await expect(status).toHaveText('Page 2 of 3');
});
