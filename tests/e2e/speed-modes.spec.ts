import { expect, test } from '@playwright/test';

const target = (page: import('@playwright/test').Page) => page.locator('.typing-character').evaluateAll(nodes => nodes.map(node => node.textContent).join(''));

test('Speed offers quote, custom and zen tests, and remembers the last one', async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/speed');
  await expect(page.getByRole('button', { name: /30 seconds/i })).toBeVisible();

  // Quote: a real quote, with who said it.
  await page.getByRole('button', { name: 'Quote', exact: true }).click();
  await expect(page.locator('.speed-attribution')).toContainText('—');
  await expect(page.locator('.typing-character').first()).toBeVisible();

  // Custom: your own text, made typeable.
  await page.getByRole('button', { name: 'Custom', exact: true }).click();
  const editor = page.getByRole('textbox', { name: /Your practice text/ });
  await expect(editor).toBeFocused();
  await editor.fill('“Practice” makes\nprogress.');
  await page.getByRole('button', { name: 'Use this text' }).click();
  await expect.poll(() => target(page)).toBe('"Practice" makes progress.');

  // Zen: no clock; Shift+Enter ends it with a result.
  await page.getByRole('button', { name: 'Zen', exact: true }).click();
  await expect(page.getByRole('button', { name: /Until you stop/ })).toBeVisible();
  const input = page.getByLabel('Typing input');
  const first = await page.locator('.typing-character').first().innerText();
  await input.press(first);
  await expect(page.getByRole('button', { name: /Finish/ })).toBeEnabled();
  await input.press('Shift+Enter');
  await expect(page.getByText('Result Summary')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Speed Test · zen' })).toBeVisible();

  // The setup is remembered.
  await page.reload();
  await expect(page.getByRole('button', { name: /Until you stop/ })).toBeVisible();
});

test('a speed result lists the keys missed most', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/speed');
  await page.getByRole('button', { name: /30 seconds/i }).click();
  await page.getByRole('button', { name: 'Words', exact: true }).click();
  await page.getByRole('button', { name: /25 words/i }).click();
  await page.getByRole('button', { name: '10', exact: true }).click();
  await expect(page.locator('.typing-character').first()).toBeVisible();
  const text = await target(page);
  const input = page.getByLabel('Typing input');
  // One wrong key left in place (backspacing would take the mistake back), then the rest as written.
  const wrong = text[0] === 'z' ? 'q' : 'z';
  await input.press(wrong);
  for (const character of text.slice(1)) await input.press(character === ' ' ? 'Space' : character);
  await expect(page.getByText('Result Summary')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Most missed keys' }).getByRole('listitem')).toHaveCount(1);
});
