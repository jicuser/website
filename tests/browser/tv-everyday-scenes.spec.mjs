import { test, expect } from '@playwright/test';
import { DEFAULT_TV_SETTINGS, validateSettings } from '../../supabase/functions/_shared/tv.js';

test.use({ screenshot: 'off' });

async function openScreens(page) {
  const writes = [],
    errors = [];
  const actor = {
    id: '10000000-0000-4000-8000-000000000001',
    display_name: 'Centre owner',
    is_owner: true,
    is_active: true,
    permissions: [],
    staff_kinds: [],
  };
  let state = {
    settings: structuredClone(DEFAULT_TV_SETTINGS),
    updated_at: '2026-10-23T10:00:00Z',
    presentation: null,
    templates: [],
    inputs: [],
    devices: [],
    relayConfigured: false,
  };
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
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
    else if (path.endsWith('/rpc/ramadan_calendar_public'))
      data = {
        season: { title: 'Ramadan sponsorships', start_date: '2027-02-09', day_count: 30 },
        days: [],
        settings: { tv_enabled: true },
      };
    else if (path.endsWith('/functions/v1/tv-control')) {
      const body = route.request().postDataJSON();
      if (body.action === 'save-background') {
        writes.push(body);
        state = {
          ...state,
          settings: validateSettings(body.settings, body.screenId),
          updated_at: '2026-10-23T11:00:00Z',
        };
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
  return { writes, errors };
}

for (const width of [390, 1280]) {
  test(`fixed sponsorship scenes and rotations save through the existing screen endpoint at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const { writes, errors } = await openScreens(page);
    await expect(page.locator('.tv-screen-miniature')).toHaveCount(4);
    await page.getByRole('button', { name: 'Edit automatic display', exact: true }).first().click();
    const everyday = page.getByRole('region', { name: 'Everyday content', exact: true });
    await everyday
      .getByRole('combobox', { name: 'Scene to keep on screen' })
      .selectOption('daily-giving');
    await expect(everyday.locator('figcaption')).toContainText('Draft · Daily Giving');
    await everyday.getByText('Preview everyday content', { exact: true }).click();
    const display = everyday.frameLocator('iframe');
    await expect(display.locator('.ramadan-board[aria-label="Daily Giving"]')).toBeVisible();
    await expect(display.getByText('Day 1', { exact: true })).toBeVisible();
    expect(writes).toEqual([]);
    await everyday.getByRole('button', { name: 'Rotate scenes' }).click();
    await everyday.getByRole('button', { name: '+ Add scene', exact: true }).click();
    await everyday.getByRole('combobox', { name: 'Scene 2', exact: true }).selectOption('suhoor');
    await everyday
      .getByRole('combobox', { name: 'Show Suhoor sponsorships for', exact: true })
      .selectOption('90');
    await everyday.getByRole('button', { name: 'Move Suhoor sponsorships earlier' }).click();
    await everyday.getByText('Keep items visible across scenes', { exact: false }).click();
    await everyday.getByRole('checkbox', { name: 'Prayer timetable', exact: true }).check();
    await everyday.getByRole('checkbox', { name: 'Clock', exact: true }).check();
    await expect(
      everyday.getByRole('list', { name: 'Scene rotation order' }).locator('li'),
    ).toHaveCount(2);
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page
      .locator('.tv-save-actions')
      .getByRole('button', { name: 'Save display settings', exact: true })
      .click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].action).toBe('save-background');
    expect(writes[0].expectedUpdatedAt).toBe('2026-10-23T10:00:00Z');
    expect(writes[0].settings.everyday_display).toEqual({
      mode: 'rotation',
      fixed_scene: 'daily-giving',
      rotation: [
        { kind: 'suhoor', duration_seconds: 90 },
        { kind: 'classic', duration_seconds: 20 },
      ],
      persistent_layer_ids: { landscape: ['standby-times', 'standby-clock'], portrait: [] },
    });
    expect(writes[0].settings.display_layouts).toEqual(DEFAULT_TV_SETTINGS.display_layouts);
    await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('phone screen choices keep saved thumbnails beside screen details and one automatic edit action', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const { writes, errors } = await openScreens(page);
  const cards = page.locator('.tv-screen-overview-card');
  await expect(cards).toHaveCount(4);
  await expect(
    cards.getByRole('button', { name: 'Edit automatic display', exact: true }),
  ).toHaveCount(4);
  expect(
    await cards.evaluateAll((nodes) =>
      nodes.every((node) => {
        const preview = node.querySelector('.tv-screen-miniature').getBoundingClientRect();
        const body = node.querySelector('.tv-screen-overview-body').getBoundingClientRect();
        return preview.right <= body.left && node.getBoundingClientRect().height < 240;
      }),
    ),
  ).toBe(true);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: /Live presentation Camera/ }).click();
  await expect(page.getByRole('button', { name: 'Quick present', exact: true })).toHaveCount(3);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});
