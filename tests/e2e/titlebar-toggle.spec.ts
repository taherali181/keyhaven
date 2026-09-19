import { expect, test } from '@playwright/test';
import { seedSettings } from './helpers';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`title bar can be repeatedly hidden and pinned without moving its mode selection (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await seedSettings(page, { storyMode: 'type' });
    await page.goto('/read?story=gift-of-the-magi');
    const toggle = page.getByRole('radiogroup', { name: 'Story mode' });
    await expect(toggle).toBeVisible();
    const icon = page.locator('.story-hide-button svg');
    const originalIcon = await icon.elementHandle();
    for (let cycle = 0; cycle < 3; cycle++) {
      await page.getByRole('button', { name: 'Auto-hide title bar' }).click();
      await expect(page.locator('.stories-shell')).toHaveAttribute('data-titlebar', 'auto');
      await page.getByRole('button', { name: 'Show title bar' }).click();
      await expect(toggle).toBeVisible();
      await page.getByRole('button', { name: 'Auto-hide title bar' }).click();
      await expect(page.locator('.stories-shell')).toHaveAttribute('data-titlebar', 'pinned');
      await expect(toggle.getByRole('radio', { name: 'Typing mode' })).toBeChecked();
      expect(await originalIcon!.evaluate(node => node.isConnected)).toBe(true);
      expect(await page.locator('.story-mode-pill').evaluate(node => node.getAnimations().some(animation => animation.constructor.name !== 'CSSTransition'))).toBe(false);
    }
    await toggle.getByRole('radio', { name: 'Reading mode' }).click();
    await expect(page.locator('.story-reader')).toBeVisible();
  });
}
