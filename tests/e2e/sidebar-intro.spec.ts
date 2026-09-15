import { expect, test } from '@playwright/test';

test('sidebar stays open for ten seconds on each page load', async ({ page }) => {
  await page.clock.install();
  await page.goto('/quotes');
  const sidebar = page.locator('.app-sidebar');
  await expect(sidebar).toHaveAttribute('data-peek', 'true');
  await page.clock.fastForward(9000);
  await expect(sidebar).toHaveAttribute('data-peek', 'true');
  await page.clock.fastForward(1100);
  await expect(sidebar).toHaveAttribute('inert', '');
  await page.reload();
  await expect(sidebar).toHaveAttribute('data-peek', 'true');
  await page.clock.fastForward(10_100);
  await expect(sidebar).toHaveAttribute('inert', '');
});

test('tapping content dismisses the sidebar introduction immediately', async ({ page }) => {
  await page.goto('/quotes');
  const sidebar = page.locator('.app-sidebar');
  await expect(sidebar).toHaveAttribute('data-peek', 'true');
  await page.locator('main.app-content').click({ position: { x: 900, y: 400 } });
  await expect(sidebar).toHaveAttribute('inert', '');
});

test('mobile navigation introduction dismisses on backdrop tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/quotes');
  await expect(page.locator('.mobile-drawer')).toBeVisible();
  await page.locator('.mobile-scrim').click({ position: { x: 370, y: 400 } });
  await expect(page.locator('.mobile-drawer')).toHaveCount(0);
});
