import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/arcade');
  await expect(page.getByRole('group', { name: 'Choose a game' }).getByRole('button')).toHaveCount(6);
});

test('Accuracy Streak counts correct words and ends on the first wrong key', async ({ page }) => {
  await page.getByRole('button', { name: /Accuracy Streak/ }).click();
  const stage = page.getByRole('group', { name: 'Accuracy Streak' });
  await stage.click();
  // Type the first word and its space exactly as shown, then a wrong key.
  for (let typed = 0; typed < 40; typed++) {
    const next = await stage.locator('.arc-tape-current').textContent();
    const key = next === ' ' ? 'Space' : next!;
    await page.keyboard.press(key);
    if (key === 'Space') break;
  }
  const next = await stage.locator('.arc-tape-current').textContent();
  await page.keyboard.press(next === 'q' ? 'z' : 'q');
  await expect(stage.getByRole('status')).toContainText('The streak ends at 1 word');
  await expect(page.getByRole('button', { name: /Accuracy Streak/ })).toContainText('Best 1 word');
});

test('Word Chain accepts an offered word and asks for its last letter next', async ({ page }) => {
  await page.getByRole('button', { name: /Word Chain/ }).click();
  await page.getByRole('button', { name: 'Begin' }).click();
  const choices = page.getByRole('list', { name: 'Words to choose from' }).locator('span');
  await expect(choices.first()).toBeVisible();
  const word = (await choices.last().textContent())!;
  await page.getByLabel('Type a word from the chain').pressSequentially(word);
  await expect(page.getByRole('list', { name: 'Your chain' })).toContainText(word);
  await expect(page.locator('.arc-chain-letter strong')).toHaveText(word.at(-1)!.toUpperCase());
  await expect(page.locator('.arc-metric').filter({ hasText: 'Score' })).toContainText(String(word.length * 10));
});

test('Code Symbols runs a round of real code and scores it', async ({ page }) => {
  test.setTimeout(60_000);
  await page.getByRole('button', { name: /Code Symbols/ }).click();
  await page.getByRole('button', { name: 'Start coding' }).click();
  const text = await page.locator('.typing-character').evaluateAll(nodes => nodes.map(node => node.textContent).join(''));
  expect(text).toMatch(/[{}()[\];=]/);
  await page.getByLabel('Typing input').pressSequentially(text);
  await expect(page.getByRole('status').filter({ hasText: 'Round score' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next round' })).toBeVisible();
});
