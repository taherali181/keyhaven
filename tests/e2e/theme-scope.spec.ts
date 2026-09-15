import { expect, test, type Page } from '@playwright/test';

const STORY = '/read?story=gift-of-the-magi';

async function withSettings(page: Page, theme: string, customTones: unknown[] = []) {
  await page.addInitScript(([themeId, tones]) => {
    localStorage.setItem('keyhaven_settings_v1', JSON.stringify({ theme: themeId, customTones: tones, updatedAt: 1 }));
    localStorage.setItem('keyhaven_sidebar_v2', 'pinned');
  }, [theme, customTones] as const);
}

const color = (page: Page, selector: string) => page.locator(selector).first().evaluate(node => getComputedStyle(node).color);

for (const example of [
  { name: 'Soft paper', theme: 'paper', attr: 'paper', text: 'rgb(29, 37, 34)', background: '#f4f1e8', accent: 'rgb(83, 107, 84)' },
  { name: 'Rose dusk', theme: 'rose', attr: 'rose', text: 'rgb(241, 228, 233)', background: '#291e23', accent: 'rgb(214, 156, 176)' },
  { name: 'Lavender haze', theme: 'lavender', attr: 'lavender', text: 'rgb(43, 36, 51)', background: '#e8e2ef', accent: 'rgb(117, 90, 141)' },
  { name: 'custom theme', theme: 'custom:test', attr: 'custom', text: 'rgb(32, 42, 35)', background: '#dfe9df', accent: 'rgb(69, 103, 77)', customTones: [{ id: 'test', name: 'Mint', background: '#dfe9df', text: '#202a23', accent: '#45674d' }] }
]) {
  test(`${example.name} colors the page and all application chrome`, async ({ page }) => {
    await withSettings(page, example.theme, example.customTones);
    await page.goto(STORY);
    await page.locator('.typing-character').first().waitFor();

    await expect(page.locator('html')).toHaveAttribute('data-theme', example.attr);
    expect(await page.locator('html').evaluate(node => getComputedStyle(node).getPropertyValue('--bg-primary').trim())).toBe(example.background);
    expect(await color(page, '.reader-workspace')).toBe(example.text);
    expect(await color(page, '.app-sidebar')).toBe(example.text);
    expect(await color(page, '.brand-logo-mark')).toBe(example.accent);
    expect(await page.locator('.brand-logo-silhouette').first().evaluate(node => getComputedStyle(node).maskImage)).not.toBe('none');

    await page.getByRole('button', { name: 'Reading settings' }).first().click();
    await expect(page.locator('.rs-panel')).toBeVisible();
    expect(await color(page, '.rs-panel')).toBe(example.text);
    await expect(page.getByRole('radiogroup', { name: 'Theme' })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Page tone' })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'Match theme' })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.keyboard.press('Control+k');
    await expect(page.locator('.library-window')).toBeVisible();
    expect(await color(page, '.library-window')).toBe(example.text);
  });
}

test('sidebar theme shortcut switches between Night and Soft paper', async ({ page }) => {
  await withSettings(page, 'sage');
  await page.goto(STORY);
  await page.getByRole('button', { name: 'Switch to dark theme' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await page.getByRole('button', { name: 'Switch to light theme' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
});

test('theme menu presents the twelve built-in themes in the requested order', async ({ page }) => {
  await withSettings(page, 'night');
  await page.goto(STORY);
  await page.getByRole('button', { name: 'Reading settings' }).first().click();
  const themes = page.getByRole('radiogroup', { name: 'Theme' });
  await expect(themes.getByRole('radio', { name: 'Espresso' })).toBeVisible();
  await page.getByRole('button', { name: 'More tones' }).click();
  expect(await themes.getByRole('radio').evaluateAll(radios => radios.map(radio => radio.getAttribute('aria-label')))).toEqual([
    'Night', 'Soft paper', 'Sepia', 'Pitch black', 'Rose dusk', 'Deep ocean',
    'Sage', 'Espresso', 'Slate', 'Mist', 'Bright white', 'Lavender haze'
  ]);
});
