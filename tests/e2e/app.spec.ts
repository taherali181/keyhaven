import { expect, test } from '@playwright/test';
import { seedSettings } from './helpers';

// Read opens a random story on each visit; tests that depend on the text pin one with ?story=.
const STORY = '/read?story=gift-of-the-magi';

// Stories open in Read mode by default; most reader tests here type, so they start in Type mode.
test.beforeEach(async ({ page }) => { await seedSettings(page, { storyMode: 'type' }); });

test('story mode renders the literary surface', async ({ page }) => {
  await page.goto(STORY);
  await expect(page.getByRole('heading', { name: 'The Gift of the Magi' })).toBeVisible();
  await expect(page.locator('.typing-copy.literary')).toBeVisible();
});

test('read opens a full story at random and resumes it on the next visit', async ({ page }) => {
  await page.goto('/read');
  const heading = page.locator('.story-bar h1');
  await expect(heading).not.toBeEmpty();
  await page.locator('.typing-character').first().waitFor();
  const title = await heading.innerText();
  const first = await page.locator('.typing-character').first().innerText();
  await page.getByLabel('Typing input').press(first);
  // Progress is saved shortly after it changes.
  await page.waitForTimeout(900);
  await page.goto('/read');
  await expect(heading).toHaveText(title);
});

test('stories switch to a paged reading mode and back to typing', async ({ page }) => {
  await page.goto(STORY);
  await page.locator('.typing-character').first().waitFor();
  await page.getByRole('radio', { name: 'Reading mode' }).click();
  await expect(page.getByLabel('Typing input')).toHaveCount(0);
  const progress = page.getByRole('progressbar', { name: 'Story progress' });
  await expect(progress).toHaveAttribute('aria-valuetext', /^Page 1 of \d+/);
  const stats = page.getByRole('group', { name: 'Reader stats' });
  await expect(stats).toContainText('story left');
  await expect(stats).toContainText('page');
  if (!/^Page 1 of 1,/.test((await progress.getAttribute('aria-valuetext')) ?? '')) {
    await page.keyboard.press('ArrowRight');
    await expect(progress).toHaveAttribute('aria-valuetext', /^Page 2 of \d+/);
  }
  await page.getByRole('radio', { name: 'Typing mode' }).click();
  await expect(page.getByLabel('Typing input')).toHaveCount(1);
});

test('story contents list every part and jump between them', async ({ page }) => {
  await page.goto(STORY);
  await page.locator('.typing-character').first().waitFor();
  const eyebrow = page.locator('.story-bar .eyebrow');
  await expect(eyebrow).toHaveText(/^Story · Part 1 of \d+$/);
  const parts = Number((await eyebrow.textContent())!.match(/of (\d+)/)![1]);
  expect(parts).toBeGreaterThan(4);
  await page.getByRole('button', { name: 'Contents' }).click();
  const list = page.getByRole('listbox', { name: 'Contents' });
  await expect(list.getByRole('option')).toHaveCount(parts);
  await list.getByRole('option', { name: /Part 2\b/ }).click();
  await expect(eyebrow).toHaveText(`Story · Part 2 of ${parts}`);
});

test('the progress bar follows the reader across reading and typing', async ({ page }) => {
  await page.goto(STORY);
  await page.locator('.typing-character').first().waitFor();
  const bar = page.getByRole('navigation', { name: 'Story parts' });
  for (let step = 0; step < 3; step++) await bar.getByRole('button', { name: 'Next', exact: true }).click();
  const eyebrow = page.locator('.story-bar .eyebrow');
  await expect(eyebrow).toHaveText(/Part 4 of/);
  const progress = page.getByRole('progressbar', { name: 'Story progress' });
  const typed = Number(await progress.getAttribute('aria-valuenow'));
  await page.getByRole('radio', { name: 'Reading mode' }).click();
  await expect(progress).toHaveAttribute('aria-valuetext', /^Page \d+ of/);
  await expect(eyebrow).toHaveText(/Part 4 of/);
  expect(Math.abs(Number(await progress.getAttribute('aria-valuenow')) - typed)).toBeLessThanOrEqual(3);
  await page.getByRole('radio', { name: 'Typing mode' }).click();
  await expect(eyebrow).toHaveText(/Part 4 of/);
});

test('the title bar mutes sound and can auto-hide', async ({ page }) => {
  await page.goto(STORY);
  await page.locator('.typing-character').first().waitFor();
  const mute = page.getByRole('button', { name: 'Mute sound' });
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await page.locator('.typing-character').first().waitFor();
  await expect(page.getByRole('button', { name: 'Mute sound' })).toHaveAttribute('aria-pressed', 'true');

  const row = page.locator('.story-bar-row');
  await page.getByRole('button', { name: 'Auto-hide title bar' }).click();
  await page.mouse.move(700, 500);
  await page.locator('.typing-input').focus();
  await expect(row).toHaveCSS('opacity', '0');
  await expect(page.locator('.reader-bar')).toHaveClass(/is-compact/);
  await page.mouse.move(700, 4);
  await expect(row).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'Auto-hide title bar' }).click();
  await expect(page.locator('.reader-bar')).not.toHaveClass(/is-compact/);
});

test('the bottom bar opens a random story and shows chosen stats', async ({ page }) => {
  await page.goto(STORY);
  await page.locator('.typing-character').first().waitFor();
  await page.getByRole('button', { name: 'Reading settings' }).click();
  await page.getByRole('tab', { name: 'Bottom bar' }).click();
  await page.getByRole('switch', { name: 'Clock' }).check();
  await expect(page.locator('.reader-bar-stat[data-stat="clock"]')).toBeVisible();
  await page.getByRole('button', { name: 'Close reading settings' }).click();
  await page.getByRole('button', { name: 'Random story' }).click();
  await expect(page.locator('.story-bar h1')).not.toHaveText('The Gift of the Magi');
});

test('the library window finds a story and opens it', async ({ page }) => {
  await page.goto(STORY);
  await page.locator('.typing-character').first().waitFor();
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  const library = page.getByRole('dialog', { name: 'Library' });
  await expect(library).toBeVisible();
  await library.getByRole('tab', { name: 'Stories' }).click();
  await library.getByLabel('Search stories, authors or themes').fill('tell-tale');
  await library.getByRole('button', { name: /The Tell-Tale Heart/ }).first().click();
  await expect(library).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'The Tell-Tale Heart' })).toBeVisible();
});

test('the library discovers a public-domain book and opens its chapters', async ({ page }) => {
  const chapter = (title: string, word: string) => `<h2>${title}</h2>${Array.from({ length: 6 }, () => `<p>${Array.from({ length: 70 }, () => word).join(' ')}.</p>`).join('')}`;
  await page.route('**/api/gutenberg/1342', route => route.fulfill({
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-book-format': 'html' },
    body: `<html><body><h1>PRIDE AND PREJUDICE</h1>${chapter('CHAPTER I.', 'truth')}${chapter('CHAPTER II.', 'visit')}</body></html>`
  }));
  await page.goto(STORY);
  await page.locator('.typing-character').first().waitFor();
  await page.keyboard.press('Control+k');
  const library = page.getByRole('dialog', { name: 'Library' });
  await expect(library).toBeVisible();
  await library.getByRole('tab', { name: 'Discover' }).click();
  await library.getByLabel('Search books and authors').fill('pride and prejudice');
  await library.getByRole('button', { name: /^Pride and Prejudice/ }).first().click();
  await library.getByRole('complementary', { name: 'About Pride and Prejudice' }).getByRole('button', { name: 'Read', exact: true }).click();
  await expect(library).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Pride and Prejudice' })).toBeVisible();
  await expect(page.locator('.story-bar .eyebrow')).toHaveText('Chapter 1 of 2');
  await page.getByRole('button', { name: 'Contents' }).click();
  await expect(page.getByRole('listbox', { name: 'Contents' }).getByRole('option')).toHaveCount(2);
});

test('escape closes the library window', async ({ page }) => {
  await page.goto(STORY);
  await page.locator('.typing-character').first().waitFor();
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Library' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Library' })).toHaveCount(0);
});

test('quotes is its own section', async ({ page }) => {
  await page.goto('/quotes');
  await page.locator('.typing-character').first().waitFor();
  await page.mouse.move(2, 450);
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(nav.getByRole('button', { name: 'Quotes' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('button', { name: 'Library' })).toHaveCount(0);
});

for (const width of [1440, 900, 400]) {
  test(`reader never breaks a word mid-way at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(STORY);
    await page.locator('.typing-character').first().waitFor();
    const broken = await page.locator('.typing-copy .typing-character').evaluateAll(nodes => {
      // Paragraph breaks render as <br> and carry no text.
      const text = nodes.map(node => node.textContent || '\n').join('');
      const lines = new Map<number, number[]>();
      nodes.forEach((node, index) => {
        const top = (node as HTMLElement).offsetTop;
        if (!lines.has(top)) lines.set(top, []);
        lines.get(top)!.push(index);
      });
      const ordered = [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, indexes]) => indexes);
      const splits: string[] = [];
      for (let line = 0; line < ordered.length - 1; line += 1) {
        const last = ordered[line][ordered[line].length - 1];
        const next = ordered[line + 1][0];
        // A wrap is only legal where one side of the break is whitespace or a hyphen.
        if (!/[\s\-–—]/.test(text[last] ?? '') && !/[\s\-–—]/.test(text[next] ?? '')) {
          splits.push(`${text.slice(Math.max(0, last - 8), last + 1)} / ${text.slice(next, next + 8)}`);
        }
      }
      return splits;
    });
    expect(broken).toEqual([]);
    await expect(page.locator('.wrap-hyphen')).toHaveCount(0);
  });
}

test('reader keeps upcoming prose prominent and completed prose quiet', async ({ page }) => {
  await page.goto(STORY);
  const first = page.locator('.typing-character').first();
  const before = await first.evaluate(node => getComputedStyle(node).color);
  await page.getByLabel('Typing input').press(await first.innerText());
  const after = await first.evaluate(node => getComputedStyle(node).color);
  expect(after).not.toBe(before);
});

test('reader caret does not reflow the prose while typing', async ({ page }) => {
  await page.goto(STORY);
  await page.locator('.typing-character').first().waitFor();
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

test('reader scenery stays optional and is controlled from reading settings', async ({ page }) => {
  await page.goto(STORY);
  await expect(page.locator('.reader-workspace')).toHaveCSS('background-image', 'none');
  await page.getByRole('button', { name: 'Reading settings' }).click();
  // Cherry blossoms sits in the collapsed (inert) "More scenery" section, so expand it first.
  await page.getByRole('button', { name: 'More scenery' }).click();
  const scenery = page.getByRole('radiogroup', { name: 'Scenery' }).getByRole('radio', { name: 'Cherry blossoms' });
  await scenery.click();
  await expect(scenery).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => page.locator('.reader-workspace').evaluate(node => getComputedStyle(node, '::before').backgroundImage)).toContain('cherry-blossoms.webp');
});

test('general settings no longer duplicate reading settings', async ({ page }) => {
  await page.goto(STORY);
  await page.locator('.typing-character').first().waitFor();
  // The sidebar auto-hides by default; resting the pointer on the left edge peeks it in.
  await page.mouse.move(2, 450);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Settings' })).toBeVisible();
  await expect(page.getByLabel('Scenery')).toHaveCount(0);
  await expect(page.getByLabel('Typeface')).toHaveCount(0);
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
  // Poll: the ratio is only meaningful once React has measured and set --typing-line-height.
  await expect.poll(() => page.locator('.typing-viewport').evaluate(node => {
    const height = node.getBoundingClientRect().height;
    const line = Number.parseFloat(getComputedStyle(node.parentElement!).getPropertyValue('--typing-line-height'));
    return height / line;
  })).toBeCloseTo(3, 1);
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

test('the speed test hydrates without mismatched words', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', message => { if (/hydrat/i.test(message.text())) problems.push(message.text().slice(0, 200)); });
  page.on('pageerror', error => { if (/hydrat/i.test(error.message)) problems.push(error.message.slice(0, 200)); });
  await page.goto('/speed');
  await expect(page.locator('.typing-character').first()).toBeVisible();
  await page.waitForTimeout(1500);
  expect(problems).toEqual([]);
});

test('practice sections have their own small settings, and other pages none', async ({ page }) => {
  await page.goto('/speed');
  await expect(page.locator('.typing-character').first()).toBeVisible();
  await page.getByRole('button', { name: 'Speed settings' }).click();
  const sheet = page.getByRole('dialog', { name: 'Speed settings' });
  await expect(sheet.getByRole('radio', { name: /Geist Mono/ })).toHaveAttribute('aria-checked', 'true');
  await expect(sheet.getByText('Scenery')).toHaveCount(0);
  await sheet.getByRole('radio', { name: /Literata/ }).click();
  await expect(page.locator('.typing-surface.font-serif')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  // Speed's typeface is its own: Academy still starts in monospace.
  await page.goto('/academy');
  await page.getByRole('button', { name: 'Academy settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Academy settings' }).getByRole('radio', { name: /Geist Mono/ })).toHaveAttribute('aria-checked', 'true');
  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.reader-settings-trigger')).toHaveCount(0);
});

test('the sidebar offers sign in and brings you back afterwards', async ({ page }) => {
  await page.goto('/speed');
  await page.mouse.move(2, 450);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fspeed$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/sign-up?callbackUrl=%2Fspeed');
});

test('the library lists categories in its rail and shows book details beside the list', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const library = page.getByRole('dialog', { name: 'Library' });
  // The shortcut can arrive before the page listens for it.
  await expect(async () => {
    if (!(await library.count())) await page.keyboard.press('Control+k');
    await expect(library).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
  await library.getByRole('tab', { name: 'Discover' }).click();
  const rail = library.getByRole('group', { name: 'Browse categories' });
  await rail.getByRole('button', { name: 'Poetry' }).click();
  await expect(rail.getByRole('button', { name: 'Poetry' })).toHaveAttribute('aria-pressed', 'true');
  await expect(library.locator('.library-shelf h3').first()).toContainText('Poetry');
  const firstBook = library.locator('.library-grid .library-book').first();
  await firstBook.click();
  const detail = library.locator('.library-detail');
  await expect(detail).toBeVisible();
  // Wide screens: the details sit beside the list rather than on top of it.
  const [list, pane] = await Promise.all([library.locator('.library-main').boundingBox(), detail.boundingBox()]);
  expect(list!.x + list!.width).toBeLessThanOrEqual(pane!.x + 1);
  await library.getByRole('tab', { name: 'Stories' }).click();
  await library.getByRole('group', { name: 'Story collections' }).getByRole('button', { name: 'Humour' }).click();
  await expect(library.locator('.library-shelf h3').first()).toContainText('Humour');
});

test('a quote can be saved and found again under Saved', async ({ page }) => {
  await page.goto('/quotes');
  const star = page.getByRole('button', { name: 'Save quote' });
  await expect(star).toBeEnabled();
  const author = await page.locator('.story-bar h1').innerText();
  await star.click();
  await expect(page.getByRole('button', { name: 'Saved quote' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('combobox', { name: 'Quote category' }).click();
  await page.getByRole('option', { name: /Saved/ }).click();
  await page.reload();
  // The filter is remembered, and the saved quote is the only one there.
  await expect(page.locator('.story-bar h1')).toHaveText(author);
  await expect(page.getByRole('button', { name: 'Saved quote' })).toBeVisible();
  await page.getByRole('button', { name: 'Saved quote' }).click();
  await expect(page.getByText('No saved quotes yet')).toBeVisible();
  await page.getByRole('button', { name: 'Show all quotes' }).click();
  await expect(page.locator('.typing-character').first()).toBeVisible();
});
