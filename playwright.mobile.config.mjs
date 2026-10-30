import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  testMatch: [
    'mobile-bars.spec.mjs',
    'accessible-appearance.spec.mjs',
    'home-compact.spec.mjs',
    'prayer-pill.spec.mjs',
    'pr37-salah-integration.spec.mjs',
  ],
  outputDir: 'test-results/webkit',
  workers: 1,
  timeout: 30000,
  use: {
    ...devices['iPhone 13'],
    browserName: 'webkit',
    baseURL: 'http://127.0.0.1:4347',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4347',
    url: 'http://127.0.0.1:4347',
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:4347/preview-api',
      VITE_SUPABASE_ANON_KEY: 'local-browser-test',
    },
  },
});
