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
        const element = document.querySelector<HTMLElement>('.stories-shell')!;
        const shell = element.getBoundingClientRect();
        const content = document.querySelector('main')!.getBoundingClientRect();
        // Pinned uses the outer top gap. Hidden uses the full space above the text,
        // including its glyph inset, mirrored at the bottom of the viewport.
        const style = getComputedStyle(element);
        const topGap = parseFloat(style.paddingTop) + (element.dataset.titlebar === 'auto' ? parseFloat(style.getPropertyValue('--text-half-leading')) || 0 : 0);
        // While the sidebar is hidden the margins also clear its menu button (14px inset + 42px + 14px).
        const edge = innerWidth < 768 ? 16 : document.documentElement.dataset.sidebar === 'open' ? topGap : Math.max(topGap, 70);
        return Math.max(Math.abs(shell.left - content.left - edge), Math.abs(content.right - shell.right - edge));
      })).toBeLessThan(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width >= 768 && sidebar === 'auto') {
        // The menu button never covers the title bar or the text.
        expect(await page.evaluate(() => {
          const dock = document.querySelector('.sidebar-dock')!.getBoundingClientRect();
          return ['.story-bar', '.story-reader-copy p'].some(selector => {
            const box = document.querySelector(selector)!.getBoundingClientRect();
            return box.left < dock.right && box.right > dock.left && box.top < dock.bottom && box.bottom > dock.top;
          });
        })).toBe(false);
      }
    });
    }
  }
}
