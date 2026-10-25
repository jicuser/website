import { expect } from '@playwright/test';
import {
  DEFAULT_TV_SETTINGS,
  TV_SCREENS,
  validateSettings,
} from '../../../supabase/functions/_shared/tv.js';

export const TV_TEST_USER = '10000000-0000-4000-8000-000000000001';
export const TV_TEST_REVISION = '2026-10-23T10:00:00Z';

export async function openTvAdmin(page, { theme = 'dark' } = {}) {
  const writes = [];
  const errors = [];
  const actor = {
    id: TV_TEST_USER,
    display_name: 'Centre owner',
    is_owner: true,
    is_active: true,
    permissions: [],
    staff_kinds: [],
  };
  // Separate records catch accidental cross-screen saves and draft restoration.
  const states = Object.fromEntries(
    TV_SCREENS.map(({ id }) => [
      id,
      {
        settings: structuredClone(DEFAULT_TV_SETTINGS),
        updated_at: TV_TEST_REVISION,
        presentation: null,
        templates: [],
        inputs: [],
        devices: [],
        relayConfigured: false,
      },
    ]),
  );
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((value) => {
    localStorage.setItem('jic-theme', value);
    sessionStorage.setItem('jic-salawat-shown', '1');
  }, theme);
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path.includes('/auth/v1/token')) {
      const expires = Math.floor(Date.now() / 1000) + 3600;
      const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
      data = {
        user: {
          id: actor.id,
          email: 'staff@example.invalid',
          role: 'authenticated',
          aud: 'authenticated',
          user_metadata: {},
          app_metadata: {},
        },
        access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: actor.id, exp: expires })}.test`,
        refresh_token: 'local-test-only',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: expires,
      };
    } else if (path.endsWith('/rpc/get_my_profile')) data = actor;
    else if (path.endsWith('/rpc/ramadan_calendar_public')) {
      data = {
        season: { title: 'Ramadan sponsorships', start_date: '2027-02-09', day_count: 30 },
        days: [],
        settings: { tv_enabled: true },
      };
    } else if (path.endsWith('/functions/v1/tv-control')) {
      const body = route.request().postDataJSON();
      const state = states[body.screenId];
      if (!state) {
        await route.fulfill({ status: 400, json: { error: 'Unknown screen' } });
        return;
      }
      if (!['admin', 'status', 'public'].includes(body.action)) writes.push(body);
      if (body.action === 'save-background') {
        if (body.expectedUpdatedAt !== state.updated_at) {
          await route.fulfill({ status: 409, json: { error: 'Settings changed elsewhere.' } });
          return;
        }
        state.settings = validateSettings(body.settings, body.screenId);
        state.updated_at = new Date(Date.parse(state.updated_at) + 60000).toISOString();
      }
      data = { ...state, id: body.screenId };
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/admin/login');
  await page.locator('input[type="email"]').fill('staff@example.invalid');
  await page.locator('input[type="password"]').fill('Local testing passphrase');
  await page.locator('form button[type="submit"], form > button').first().click();
  await expect(page.locator('.admin-toolbar')).toBeVisible();
  await page.goto('/admin?section=tv');
  return { writes, errors, states };
}

export async function openTvScreen(page, screenId = 'mens-main') {
  const screen = TV_SCREENS.find(({ id }) => id === screenId);
  await page.getByRole('button', { name: `Open ${screen.label} display`, exact: true }).click();
  await expect(page.locator('.tv-workspace')).toBeVisible();
  return page.locator('.tv-workspace');
}
