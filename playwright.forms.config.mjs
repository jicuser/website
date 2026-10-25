import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: ['custom-forms.spec.mjs', 'certificates.spec.mjs', 'sitewide-learning.spec.mjs'],
  outputDir: 'test-results/workspace',
  workers: 1,
  timeout: 30000,
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4337',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4337',
    url: 'http://127.0.0.1:4337',
    env: {
      VITE_ENABLE_WORKSPACE: 'true',
      VITE_ENABLE_CERTIFICATES: 'true',
      VITE_SUPABASE_URL: 'http://127.0.0.1:4337/preview-api',
      VITE_SUPABASE_ANON_KEY: 'local-browser-test',
    },
  },
});
