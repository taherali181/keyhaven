import { expect, test, type Page } from '@playwright/test';

// A page tone colours the page only. The sidebar, reading settings and library keep the site theme.
const STORY = '/read?story=gift-of-the-magi';
const LIGHT_TEXT = 'rgb(244, 241, 232)';
const DARK_TEXT = 'rgb(29, 37, 34)';

async function withSettings(page: Page, theme: 'reading-room' | 'daylight', readerPaper: string) {
  await page.addInitScript(([themeId, paper]) => {
    const saved = JSON.parse(localStorage.getItem('keyhaven_settings_v1') || '{}');
    localStorage.setItem('keyhaven_settings_v1', JSON.stringify({ ...saved, theme: themeId, readerPaper: paper, updatedAt: 1 }));
    localStorage.setItem('keyhaven_sidebar_v2', 'pinned');
  }, [theme, readerPaper] as const);
}

const color = (page: Page, selector: string) => page.locator(selector).first().evaluate(node => getComputedStyle(node).color);

for (const [theme, paper, chromeText, pageBg] of [
  ['reading-room', 'paper', LIGHT_TEXT, '#f4f1e8'],
  ['daylight', 'night', DARK_TEXT, '#1d2522']
] as const) {
  test(`${paper} page tone in ${theme} leaves the chrome in the site theme`, async ({ page }) => {
    await withSettings(page, theme, paper);
    await page.goto(STORY);
    await page.locator('.typing-character').first().waitFor();

    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const workspaceBg = await page.locator('.reader-workspace').evaluate(node => getComputedStyle(node).getPropertyValue('--bg-primary').trim());
    expect(workspaceBg).toBe(pageBg);
    expect(await color(page, '.app-sidebar')).toBe(chromeText);

    await page.getByRole('button', { name: 'Reading settings' }).first().click();
    await expect(page.locator('.rs-panel')).toBeVisible();
    expect(await color(page, '.rs-panel')).toBe(chromeText);
    await page.keyboard.press('Escape');

    await page.keyboard.press('Control+k');
    await expect(page.locator('.library-window')).toBeVisible();
    expect(await color(page, '.library-window')).toBe(chromeText);
  });
}
