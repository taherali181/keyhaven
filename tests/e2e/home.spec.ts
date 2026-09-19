import { expect, test, type Page } from '@playwright/test';

/** /profile opens the database; write a book in progress and remember it as the current work. */
async function seedReading(page: Page) {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'Guest reader' })).toBeVisible();
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('KeyHavenDB'); request.onsuccess = () => resolve(request.result); request.onerror = reject; });
    const transaction = database.transaction(['bookProgress'], 'readwrite');
    transaction.objectStore('bookProgress').put({ bookId: 'story:gift-of-the-magi', kind: 'story', title: 'The Gift of the Magi', author: 'O. Henry', chapterIndex: 0, charOffset: 0, percent: 30, totalWordsTyped: 0, lastRead: Date.now(), dirty: 0 });
    await new Promise(resolve => { transaction.oncomplete = resolve; });
    localStorage.setItem('keyhaven_current_work_v1', 'story:gift-of-the-magi');
  });
}

test('a first visit lands on the library with a story of the day', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Your library' })).toBeVisible();
  const hero = page.getByRole('region', { name: 'Story of the day' });
  await expect(hero).toBeVisible();
  const title = await hero.getByRole('heading', { level: 2 }).innerText();
  await hero.getByRole('button', { name: 'Start reading' }).click();
  await expect(page).toHaveURL(/\/read$/);
  await expect(page.locator('.story-bar h1')).toHaveText(title);
  await expect(page.getByRole('radio', { name: 'Reading mode' })).toBeChecked();
});

test('home picks up where you left off', async ({ page }) => {
  await seedReading(page);
  await page.goto('/');
  const hero = page.getByRole('region', { name: 'Continue reading' });
  await expect(hero.getByRole('heading', { name: 'The Gift of the Magi' })).toBeVisible();
  await expect(hero).toContainText('30% read');
  await hero.getByRole('button', { name: 'Type it' }).click();
  await expect(page.locator('.story-bar h1')).toHaveText('The Gift of the Magi');
  await expect(page.getByLabel('Typing input')).toBeVisible();
});

test('a classic opens its details in the library', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('.home-section').filter({ hasText: 'Classics to discover' });
  const first = row.locator('.home-card').first();
  const title = await first.locator('.library-book-text strong').innerText();
  await first.click();
  const library = page.getByRole('dialog', { name: /Library/ });
  await expect(library).toBeVisible();
  await expect(library.getByRole('heading', { name: new RegExp(title) })).toBeVisible();
});

test('the sidebar and logo lead home', async ({ page }) => {
  await page.goto('/speed');
  await page.mouse.move(2, 450);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Your library' })).toBeVisible();
});
