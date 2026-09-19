import { expect, type Page } from '@playwright/test';

/**
 * Merges `patch` into the saved settings before the app first loads. It is applied once per tab (a sessionStorage flag
 * marks it), so later navigations keep whatever the test changed in between.
 */
export async function seedSettings(page: Page, patch: Record<string, unknown>) {
  await page.addInitScript(value => {
    if (sessionStorage.getItem('kh_e2e_seeded')) return;
    sessionStorage.setItem('kh_e2e_seeded', '1');
    let current: Record<string, unknown> = {};
    try { current = JSON.parse(localStorage.getItem('keyhaven_settings_v1') ?? '{}') ?? {}; } catch {}
    localStorage.setItem('keyhaven_settings_v1', JSON.stringify({ ...current, ...value }));
  }, patch);
}

/** Types the whole passage on screen, once the first keystroke is known to count (the page may still be hydrating). */
export async function typePassage(page: Page) {
  await page.locator('.typing-character').first().waitFor();
  const text = await page.locator('.typing-copy .typing-character:not(.typing-end-marker)').evaluateAll(nodes => nodes.map(node => node.textContent || '\n').join(''));
  const input = page.getByLabel('Typing input');
  const progress = page.getByText(/^\d+ of \d+ characters complete\.$/);
  await expect(progress).toHaveText(/^0 of/);
  await expect(async () => {
    if (/^0 of/.test((await progress.textContent()) ?? '')) await input.press(text[0]);
    await expect(progress).toHaveText(/^1 of/, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await input.pressSequentially(text.slice(1));
}

/** Closes the sidebar intro that opens on every page load. */
export async function dismissIntro(page: Page) {
  await page.keyboard.press('Escape');
}
