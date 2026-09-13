import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 20000,
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4319',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4319',
    url: 'http://127.0.0.1:4319',
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:4319/preview-api',
      VITE_SUPABASE_ANON_KEY: 'local-browser-test',
    },
  },
});
