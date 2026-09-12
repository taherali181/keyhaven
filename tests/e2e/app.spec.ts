import { expect, test } from '@playwright/test';

test('story mode renders the literary surface and visual wrap hyphens', async ({ page }) => {
  await page.goto('/read');
  await expect(page.getByRole('heading', { name: 'The Gift of the Magi' })).toBeVisible();
  await expect(page.locator('.typing-copy.literary')).toBeVisible();
  await expect(page.locator('.wrap-hyphen').first()).toBeAttached();
});

test('reader keeps upcoming prose prominent and completed prose quiet', async ({ page }) => {
  await page.goto('/read');
  const first = page.locator('.typing-character').first();
  const before = await first.evaluate(node => getComputedStyle(node).color);
  await page.getByLabel('Typing input').press(await first.innerText());
  const after = await first.evaluate(node => getComputedStyle(node).color);
  expect(after).not.toBe(before);
});

test('reader caret does not reflow the prose while typing', async ({ page }) => {
  await page.goto('/read');
  const input = page.getByLabel('Typing input');
  const lineStarts = () => page.locator('.typing-character').evaluateAll(nodes => {
    const starts: number[] = [];
    let previousTop: number | null = null;
    nodes.forEach((node, index) => {
      const top = (node as HTMLElement).offsetTop;
      if (top !== previousTop) starts.push(index);
      previousTop = top;
    });
    return starts;
  });
  const initialLines = await lineStarts();
  const prefix = 'One dollar and eighty-seven cents. That was all. And sixty cents of it was in pennies. Pennies saved one and two at a time by';
  await input.pressSequentially(prefix);
  await expect.poll(lineStarts).toEqual(initialLines);
  await expect(page.locator('.typing-caret')).toHaveCSS('position', 'absolute');
});

test('reader scenery stays optional and is controlled from the settings panel', async ({ page }) => {
  await page.goto('/read');
  await expect(page.locator('.reader-workspace')).toHaveCSS('background-image', 'none');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Scenery').selectOption('cherry-blossoms');
  const background = await page.locator('.reader-workspace').evaluate(node => getComputedStyle(node, '::before').backgroundImage);
  expect(background).toContain('cherry-blossoms.webp');
});

test('competitive text keeps every word on one visual line', async ({ page }) => {
  await page.goto('/speed-test');
  const splitWords = await page.locator('.typing-word').evaluateAll(words => words.filter(word => {
    const characters = [...word.querySelectorAll('.typing-character')];
    return new Set(characters.map(character => (character as HTMLElement).offsetTop)).size > 1;
  }).length);
  expect(splitWords).toBe(0);
});

test('a 15 second speed test stops and opens one result', async ({ page }) => {
  test.setTimeout(25_000);
  await page.goto('/speed');
  await page.getByRole('button', { name: /30 seconds/i }).click();
  await page.getByRole('button', { name: '15s' }).click();
  const firstCharacter = await page.locator('.typing-character').first().innerText();
  await page.getByLabel('Typing input').press(firstCharacter);
  await expect(page.getByText('Result Summary')).toBeVisible({ timeout: 17_000 });
  await expect(page.getByText('Result Summary')).toHaveCount(1);
});

test('speed viewport exposes exactly three measured lines', async ({ page }) => {
  await page.goto('/speed');
  const ratio = await page.locator('.typing-viewport').evaluate(node => {
    const height = node.getBoundingClientRect().height;
    const line = Number.parseFloat(getComputedStyle(node.parentElement!).getPropertyValue('--typing-line-height'));
    return height / line;
  });
  expect(ratio).toBeCloseTo(3, 1);
});

test('alphabet sprint accepts keyboard input without a manual focus click', async ({ page }) => {
  await page.goto('/arcade');
  await page.keyboard.type('abc');
  await expect(page.getByText('D', { exact: true })).toBeVisible();
});

test('mobile pages do not overflow the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/speed-test');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('account creation is a visible first-class flow', async ({ page }) => {
  await page.goto('/sign-up');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});

test('academy exposes placement, daily plan, and the full course', async ({ page }) => {
  await page.goto('/academy');
  await expect(page.getByRole('button', { name: /Take the placement assessment/ })).toBeVisible();
  await expect(page.getByText('Your practice plan')).toBeVisible();
  await page.getByRole('button', { name: 'Course' }).click();
  await expect(page.getByRole('button', { name: /Endurance/ })).toBeVisible();
});
