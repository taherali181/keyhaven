import { expect, test } from '@playwright/test';
import { seedSettings } from './helpers';

test('a piece written in Write saves itself, opens in the reader and comes back to be edited', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedSettings(page, { storyMode: 'read' });
  await page.goto('/write');
  await page.getByRole('button', { name: 'Start a piece' }).click();

  const title = page.getByRole('textbox', { name: 'Title' });
  const text = page.getByRole('textbox', { name: 'Text' });
  await expect(title).toBeFocused();
  await title.fill('Harbour Notes');
  await text.fill('The morning fog lifts — slowly.\n\n# Evening\nLights on the water.');
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await expect(page.locator('.ms-stats')).toContainText('11 words');
  await expect(page.locator('.ms-stats')).toContainText('2 sections');

  // Still there after a reload.
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Harbour Notes');
  await expect(page.getByRole('button', { name: /Harbour Notes/ })).toHaveAttribute('aria-current', 'true');

  // Read it: the reader opens the piece, with its punctuation made typeable.
  await page.getByRole('button', { name: 'Read it' }).click();
  await expect(page).toHaveURL(/\/read$/);
  await expect(page.locator('.story-bar h1')).toHaveText('Harbour Notes');
  await expect(page.locator('.story-reader-viewport').first()).toContainText('The morning fog lifts - slowly.');

  // Back to Write from the reader.
  await page.getByRole('button', { name: 'Edit in Write' }).click();
  await expect(page).toHaveURL(/\/write$/);
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Harbour Notes');

  // Deleting asks first.
  await page.getByRole('button', { name: 'Delete piece' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start a piece' })).toBeVisible();
});

test('an untouched new piece is removed when you move on', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/write');
  await page.getByRole('button', { name: 'Start a piece' }).click();
  await page.getByRole('textbox', { name: 'Title' }).fill('Kept');
  await page.getByRole('button', { name: 'New piece' }).first().click();
  await expect(page.locator('.ms-item')).toHaveCount(2);
  await page.getByRole('button', { name: /^Kept/ }).click();
  await expect(page.locator('.ms-item')).toHaveCount(1);
});
