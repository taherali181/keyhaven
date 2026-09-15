import { expect, test, type Page } from '@playwright/test';

async function typePassage(page: Page) {
  await page.locator('.typing-character').first().waitFor();
  const text = await page.locator('.typing-copy .typing-character').evaluateAll(nodes => nodes.map(node => node.textContent ?? '').join(''));
  await page.locator('.typing-surface').click();
  await page.keyboard.type(text);
}

test('the keyboard guide stays visible while typing a lesson', async ({ page }) => {
  await page.goto('/academy');
  await page.getByRole('button', { name: 'Course' }).click();
  await page.getByRole('button', { name: /F, J, D and K/ }).click();
  await expect(page.getByRole('heading', { name: 'F, J, D and K' })).toBeVisible();
  await page.getByRole('button', { name: 'Start lesson' }).click();
  await page.locator('.typing-character').first().waitFor();
  const text = await page.locator('.typing-copy .typing-character').evaluateAll(nodes => nodes.map(node => node.textContent ?? '').join(''));
  await page.locator('.typing-surface').click();
  await page.keyboard.type(text.slice(0, 4));
  const guide = page.getByRole('img', { name: /^Keyboard guide\. Next key/ });
  await expect(guide).toBeVisible();
  await expect(guide).toHaveAttribute('aria-label', new RegExp(`Next key ${text[4] === ' ' ? 'Space' : text[4].toUpperCase()}`));
  await expect(page.locator('.kb-key[data-next]')).toHaveCount(1);
});

test('passing a checkpoint unlocks the next lesson', async ({ page }) => {
  await page.goto('/academy');
  await expect(page.getByText('Your practice plan')).toBeVisible();
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('KeyHavenDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('academyState', 'readwrite');
    transaction.objectStore('academyState').put({ id: 'academy', version: 2, placementComplete: false, currentLessonId: 'home-1', lessons: { 'home-1': { stepIndex: 3, bestWpm: 0, bestAccuracy: 0, stars: 0, attempts: 3 } }, keyStats: {}, practiceLog: {}, dailyGoalMinutes: 10, updatedAt: 1, dirty: 1 });
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
    database.close();
  });
  await page.reload();
  await page.getByRole('button', { name: 'Course' }).click();
  await expect(page.getByRole('button', { name: /The whole home row/ })).toBeDisabled();
  await page.getByRole('button', { name: /F, J, D and K/ }).click();
  await page.getByRole('button', { name: 'Resume at step 4' }).click();
  await typePassage(page);
  await expect(page.getByText(/Checkpoint passed/)).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'The whole home row' })).toBeVisible();
  await page.getByRole('button', { name: 'Course', exact: true }).click();
  await expect(page.getByRole('button', { name: /The whole home row/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /F, J, D and K/ })).toContainText('Passed');
});
