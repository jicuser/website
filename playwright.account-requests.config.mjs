import { defineConfig, devices } from '@playwright/test';

const states = [
  { name: 'disabled', port: 4341, flag: 'false' },
  { name: 'enabled', port: 4342, flag: 'true' },
];

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'account-requests.spec.mjs',
  outputDir: 'test-results/account-requests',
  workers: 1,
  timeout: 20000,
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
    screenshot: 'only-on-failure',
  },
  projects: states.map(({ name, port }) => ({
    name,
    use: { baseURL: `http://127.0.0.1:${port}` },
  })),
  webServer: states.map(({ port, flag }) => ({
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    env: {
      VITE_ENABLE_ACCOUNT_REQUESTS: flag,
      VITE_ENABLE_WORKSPACE: 'false',
      VITE_SUPABASE_URL: `http://127.0.0.1:${port}/preview-api`,
      VITE_SUPABASE_ANON_KEY: 'local-browser-test',
      VITE_TURNSTILE_SITE_KEY: '',
    },
  })),
});
