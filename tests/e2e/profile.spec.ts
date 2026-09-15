import { expect, test, type Page } from '@playwright/test';

/** Writes a speed test, a reading session and an unfinished story straight into the app's IndexedDB. */
async function seed(page: Page) {
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('KeyHavenDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = Date.now();
    const transaction = database.transaction(['testResults', 'readingSessions', 'bookProgress'], 'readwrite');
    transaction.objectStore('testResults').put({ clientId: crypto.randomUUID(), mode: 'speed-test', subMode: '30s', title: 'Speed Test · 30s', wpm: 72, rawWpm: 75, accuracy: 96, consistency: 81, duration: 30, timestamp: now - 3_600_000, errors: 3, errorKeys: { e: 2, t: 1 }, totalChars: 185, correctChars: 180, incorrectChars: 5, dirty: 1 });
    transaction.objectStore('readingSessions').put({ clientId: crypto.randomUUID(), workKey: 'story:gift-of-the-magi', kind: 'story', title: 'The Gift of the Magi', author: 'O. Henry', mode: 'read', startedAt: now - 1_800_000, durationMs: 300_000, words: 1200, pages: 5, dirty: 1 });
    transaction.objectStore('bookProgress').put({ bookId: 'story:gift-of-the-magi', kind: 'story', title: 'The Gift of the Magi', author: 'O. Henry', chapterIndex: 0, chunkIndex: 1, charOffset: 0, percent: 40, totalWordsTyped: 0, lastRead: now - 1_500_000, dirty: 1 });
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
    database.close();
  });
}

async function openSeededProfile(page: Page) {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'Guest reader' })).toBeVisible();
  await seed(page);
  await page.reload();
  await expect(page.getByRole('table', { name: 'Personal bests' })).toBeVisible();
}

test('a fresh profile explains each section and invites a first session', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'Guest reader' })).toBeVisible();
  await expect(page.getByText('No typing yet')).toBeVisible();
  await expect(page.getByText('Nothing read yet')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Daily goals' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Keep and manage' })).toBeVisible();
});

test('the profile summarises typing and reading and continues a story', async ({ page }) => {
  await openSeededProfile(page);
  await expect(page.getByRole('table', { name: 'Personal bests' }).getByRole('row').filter({ hasText: '30s' })).toContainText('72 wpm');
  await expect(page.locator('.profile-stat').filter({ hasText: 'Time reading' }).first()).toContainText('5 min');
  await expect(page.locator('.profile-key').first()).toContainText('e');
  await page.getByRole('button', { name: 'Continue The Gift of the Magi' }).click();
  await expect(page).toHaveURL(/\/read/);
  await expect(page.getByRole('heading', { name: 'The Gift of the Magi' })).toBeVisible();
});

test('clearing typing history asks first', async ({ page }) => {
  await openSeededProfile(page);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Clear typing history?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Clear history' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('No typing yet')).toBeVisible();
});
