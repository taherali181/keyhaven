import { expect, test } from '@playwright/test';
import { seedSettings } from './helpers';

const STORY = '/read?story=gift-of-the-magi';

for (const [name, url, mode] of [['story reading', STORY, 'read'], ['story typing', STORY, 'type'], ['quotes', '/quotes', 'type']] as const) {
  test(`the phone bottom bar is one tidy card (${name})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSettings(page, { storyMode: mode });
    await page.goto(url);
    const bar = page.locator('.reader-bar');
    await expect(bar).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    const boxes = await page.evaluate(() => {
      const box = (selector: string) => { const node = document.querySelector(selector); if (!node) return null; const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
      return { bar: box('.reader-bar'), random: box('.reader-random'), reset: box('.reader-bar-reset'), stats: box('.reader-bar-stats .reader-bar-stat:first-child'), lastStat: box('.reader-bar-stats .reader-bar-stat:last-child'), next: box('.reader-bar-step:last-of-type') };
    });
    const inside = (inner: { left: number; right: number; top: number; bottom: number }, outer: typeof inner) => inner.left >= outer.left - 1 && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
    const overlaps = (a: { left: number; right: number; top: number; bottom: number }, b: typeof a) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    // The random button lives inside the bar, and never on top of the stats or the restart button.
    expect(inside(boxes.random!, boxes.bar!)).toBe(true);
    expect(overlaps(boxes.random!, boxes.stats!)).toBe(false);
    if (boxes.reset) {
      expect(inside(boxes.reset, boxes.bar!)).toBe(true);
      expect(overlaps(boxes.reset, boxes.lastStat!)).toBe(false);
    }
    // Touch targets stay comfortable.
    expect(boxes.next!.bottom - boxes.next!.top).toBeGreaterThanOrEqual(40);
  });
}

test('key hints are hidden on phones', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedSettings(page, { storyMode: 'read' });
  await page.goto(STORY);
  await expect(page.locator('.story-reader')).toBeVisible();
  await expect(page.locator('.reading-hint')).toBeHidden();
});
