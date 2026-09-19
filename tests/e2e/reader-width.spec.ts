import { expect, test } from '@playwright/test';

for (const width of [390, 1920, 3840]) {
  for (const sidebar of ['auto', 'pinned']) {
    for (const titlebar of ['auto', 'pinned']) {
    test(`edge-to-edge uses even margins at ${width}px with sidebar ${sidebar} and titlebar ${titlebar}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
      await page.addInitScript(({ sidebar, titlebar }) => {
        localStorage.setItem('keyhaven_settings_v1', JSON.stringify({ readerWidth: 1400, readerBarPinned: titlebar === 'pinned', storyMode: 'read', updatedAt: 1 }));
        localStorage.setItem('keyhaven_sidebar_v2', sidebar);
      }, { sidebar, titlebar });
      await page.goto('/read?story=gift-of-the-magi');
      await expect(page.locator('.story-reader')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect.poll(async () => page.evaluate(() => {
        const shell = document.querySelector<HTMLElement>('.stories-shell')!.getBoundingClientRect();
        const content = document.querySelector('main')!.getBoundingClientRect();
        // Even margins on both sides: clear of the sidebar button while the sidebar is hidden (inset, button, inset),
        // a small gutter beside a pinned sidebar, and 16px on phones.
        const expected = innerWidth < 768 ? 16 : document.documentElement.dataset.sidebar === 'open' ? 24 : 70;
        return Math.max(Math.abs(shell.left - content.left - expected), Math.abs(content.right - shell.right - expected));
      })).toBeLessThan(2);
      if (width >= 768 && sidebar === 'auto') {
        // The sidebar button never covers the title bar or the text.
        const overlaps = await page.evaluate(() => {
          const dock = document.querySelector('.sidebar-dock')?.getBoundingClientRect();
          if (!dock) return false;
          return ['.story-bar', '.story-reader-copy p'].some(selector => {
            const box = document.querySelector(selector)!.getBoundingClientRect();
            return box.left < dock.right && box.right > dock.left && box.top < dock.bottom && box.bottom > dock.top;
          });
        });
        expect(overlaps).toBe(false);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
    }
  }
}
