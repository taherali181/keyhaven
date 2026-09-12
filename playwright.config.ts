import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3001',
    headless: true,
    launchOptions: { executablePath: '/usr/bin/google-chrome' },
    viewport: { width: 1280, height: 800 }
  }
});
