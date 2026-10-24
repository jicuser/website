import { test, expect } from '@playwright/test';

test.use({ screenshot: 'off' });
const id = (n) => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function fixture(page) {
  const actor = {
    id: id(1),
    display_name: 'Sponsorship staff',
    is_owner: true,
    is_active: true,
    permissions: [],
    staff_kinds: [],
  };
  const state = {
    errors: [],
    writes: [],
    failSave: false,
    season: {
      id: id(2),
      title: 'Configured Ramadan',
      start_date: '2027-02-09',
      day_count: 30,
      published: true,
      iftar_target_pence: 20000,
      suhoor_target_pence: 10000,
      daily_target_pence: 500,
    },
    settings: {
      website_enabled: true,
      iftar_enabled: true,
      suhoor_enabled: true,
      daily_enabled: true,
      home_enabled: false,
      home_layout: 'card',
      tv_enabled: true,
    },
    records: [
      {
        id: id(3),
        season_id: id(2),
        kind: 'iftar',
        day_date: '2027-02-09',
        sponsor_name: 'Private sponsor',
        public_name: 'Approved family',
        phone: '07123456789',
        email: 'private@example.invalid',
        amount_pence: 20000,
        status: 'confirmed',
        paid: true,
        notes: 'Private staff note',
        reference: 'RAM-ONE',
      },
      {
        id: id(4),
        season_id: id(2),
        kind: 'iftar',
        day_date: '2027-02-10',
        sponsor_name: 'Second sponsor',
        public_name: '',
        phone: '07987654321',
        email: '',
        amount_pence: 20000,
        status: 'pending',
        paid: false,
        notes: 'Another private note',
        reference: 'RAM-TWO',
      },
    ],
  };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.addInitScript(() => {
    sessionStorage.setItem('jic-salawat-shown', '1');
    window.print = () => {};
  });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    const body = request.method() === 'POST' ? request.postDataJSON() : {};
    let data = [],
      status = 200;
    if (path.includes('/auth/v1/token')) {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const enc = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
      data = {
        user: {
          ...actor,
          email: 'staff@example.invalid',
          role: 'authenticated',
          aud: 'authenticated',
          user_metadata: {},
          app_metadata: {},
        },
        access_token: `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: actor.id, exp })}.test`,
        refresh_token: 'test-only',
        expires_in: 3600,
        expires_at: exp,
        token_type: 'bearer',
      };
    } else if (path.endsWith('/rpc/get_my_profile')) data = actor;
    else if (path.endsWith('/ramadan_seasons')) data = [state.season];
    else if (path.endsWith('/ramadan_sponsorships')) data = state.records;
    else if (path.endsWith('/ramadan_settings')) data = state.settings;
    else if (path.endsWith('/rpc/save_ramadan_options')) {
      state.writes.push({ action: 'options', ...body });
      state.settings = { ...state.settings, ...body.p_body };
      data = state.settings;
    } else if (path.endsWith('/rpc/save_ramadan_season')) {
      state.writes.push({ action: 'season', ...body });
      state.season = { ...state.season, ...body.p_body };
      data = state.season.id;
    } else if (path.endsWith('/rpc/save_ramadan_sponsorship')) {
      state.writes.push({ action: 'sponsor', ...body });
      if (state.failSave) {
        status = 400;
        data = { message: 'Sponsorship save failed.' };
      } else {
        const record = { ...body.p_body, id: body.p_body.id || id(5) };
        state.records = [...state.records.filter((row) => row.id !== record.id), record];
        data = record.id;
      }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill('staff@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Local test password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.admin-toolbar')).toBeVisible();
  await page.goto('/admin?section=ramadan');
  await expect(page.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  return state;
}

test('phone bookings show readable rows and expand private details while Setup stays separate', async ({
  page,
}) => {
  const state = await fixture(page);
  const workspace = page.getByRole('region', { name: 'Ramadan management' });
  const month = workspace.getByRole('group', { name: 'Ramadan month', exact: true });
  await expect(month.getByRole('button')).toHaveCount(30);
  expect((await month.boundingBox()).height).toBeLessThan(480);
  await workspace.getByRole('button', { name: 'Table', exact: true }).click();
  const table = workspace.locator('.sponsorship-admin-table');
  const first = table.locator('tbody > tr').first();
  await expect(first.getByText('1 Ramadan', { exact: true })).toBeVisible();
  await expect(first.getByText('9 February 2027', { exact: true })).toBeVisible();
  await expect(first.getByText('Confirmed', { exact: true })).toBeVisible();
  await expect(workspace.getByRole('switch')).toHaveCount(0);
  await expect(workspace.getByLabel('First UK date · 1 Ramadan')).toHaveCount(0);
  expect(await first.evaluate((node) => getComputedStyle(node).display)).toBe('grid');
  expect(
    await workspace
      .locator('.sponsorship-bookings')
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await first.getByRole('button', { name: /^Edit/ }).click();
  const editor = workspace.getByRole('region', { name: 'Edit sponsorship', exact: true });
  await expect(editor.getByLabel('Phone', { exact: true })).toHaveValue('07123456789');
  await expect(editor.getByLabel('Staff notes', { exact: true })).toHaveValue('Private staff note');
  await editor.getByLabel('Staff notes', { exact: true }).fill('Keep this unsaved staff note');
  state.failSave = true;
  await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(workspace.getByRole('alert')).toContainText('Sponsorship save failed.');
  await expect(editor.getByLabel('Staff notes', { exact: true })).toHaveValue(
    'Keep this unsaved staff note',
  );
  state.failSave = false;
  await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(workspace.getByRole('status')).toContainText('Sponsorship saved.');
  expect(state.writes.at(-1).p_body).toMatchObject({
    id: id(3),
    day_date: '2027-02-09',
    notes: 'Keep this unsaved staff note',
  });
  await editor.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await workspace.getByRole('button', { name: 'Month', exact: true }).click();
  await workspace.getByRole('button', { name: /^Day 1,/ }).click();
  await expect(editor.getByLabel('Phone', { exact: true })).toHaveValue('07123456789');
  await editor.getByRole('button', { name: 'Close', exact: true }).click();
  await workspace.getByRole('button', { name: /^Day 3,/ }).click();
  const newSponsor = workspace.getByRole('region', { name: 'Add sponsorship', exact: true });
  await expect(newSponsor.getByLabel('Sponsor name', { exact: true })).toHaveValue('');
  await expect(newSponsor.getByLabel('Amount (£)', { exact: true })).toHaveValue('200');
  await newSponsor.getByRole('button', { name: 'Close', exact: true }).click();

  await workspace.getByRole('button', { name: 'Setup', exact: true }).click();
  await expect(workspace.getByLabel('First UK date · 1 Ramadan')).toHaveValue(
    state.season.start_date,
  );
  await expect(workspace.getByLabel('Last UK date', { exact: true })).toHaveValue('2027-03-10');
  for (const input of await workspace.locator('input[type="date"]').all()) {
    const bounds = await input.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  }
  await expect(workspace.getByRole('checkbox')).toHaveCount(0);
  await expect(table).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test('desktop keeps a real table and prints only the chosen dates and booking status', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  const state = await fixture(page);
  const workspace = page.getByRole('region', { name: 'Ramadan management' });
  await workspace.getByRole('button', { name: 'Table', exact: true }).click();
  const table = workspace.locator('.sponsorship-admin-table');
  expect(await table.evaluate((node) => getComputedStyle(node).display)).toBe('table');
  await workspace.getByText('Date range & availability', { exact: true }).click();
  const range = workspace.getByRole('group', { name: 'Sponsorship date range' });
  await range.getByLabel('From', { exact: true }).selectOption('2027-02-09');
  await range.getByLabel('To', { exact: true }).selectOption('2027-02-10');
  await workspace.getByLabel('Booking status', { exact: true }).selectOption('pending');
  await expect(table.locator('tbody > tr')).toHaveCount(1);
  await workspace.getByRole('button', { name: 'Print table', exact: true }).click();
  const printed = page.frameLocator('iframe[title="Print table"]');
  await expect(
    printed.getByRole('columnheader', { name: 'Ramadan day', exact: true }),
  ).toBeVisible();
  await expect(printed.getByRole('columnheader', { name: 'UK date', exact: true })).toBeVisible();
  await expect(printed.locator('tbody > tr')).toHaveCount(1);
  await expect(printed.getByText('10 February 2027', { exact: true })).toBeVisible();
  await expect(printed.getByText('07987654321', { exact: true })).toBeVisible();
  await expect(printed.getByRole('button', { name: /^Edit/ })).toBeHidden();
  await expect(printed.locator('body')).not.toContainText('Another private note');
  expect(state.writes).toEqual([]);

  await workspace.getByRole('button', { name: 'Website & screens', exact: true }).click();
  await expect(
    workspace.getByRole('switch', { name: 'Iftar bookings', exact: true }),
  ).toBeVisible();
  await expect(
    workspace.getByRole('switch', { name: 'Suhoor bookings', exact: true }),
  ).toBeVisible();
  await workspace.getByRole('button', { name: 'Unpublish Ramadan', exact: true }).click();
  await expect(workspace.getByRole('status')).toContainText('Ramadan unpublished.');
  expect(state.writes.at(-1).p_body).toMatchObject({
    id: id(2),
    start_date: '2027-02-09',
    day_count: 30,
    published: false,
    iftar_target_pence: 20000,
    suhoor_target_pence: 10000,
    daily_target_pence: 500,
  });
  expect(state.errors).toEqual([]);
});

for (const width of [320, 390]) {
  test(`Ramadan month fits at ${width}px and keeps dates in place when filtered`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const state = await fixture(page);
    const workspace = page.getByRole('region', { name: 'Ramadan management' });
    const month = workspace.getByRole('group', { name: 'Ramadan month', exact: true });
    const dates = month.getByRole('button');
    await expect(dates).toHaveCount(30);
    const initial = await dates.evaluateAll((nodes) =>
      nodes.map((node) => ({
        x: node.getBoundingClientRect().x,
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
        overflows: node.scrollWidth > node.clientWidth,
      })),
    );
    expect(initial.filter((cell) => cell.width < 24 || cell.height < 44 || cell.overflows)).toEqual(
      [],
    );
    await expect(month.getByRole('button', { name: /^Day 1,/ })).toContainText('Taken');
    await expect(month.getByRole('button', { name: /^Day 1,/ })).toHaveAttribute(
      'aria-label',
      /Sponsored/,
    );
    await expect(month.getByRole('button', { name: /^Day 2,/ })).toContainText('Held');
    await page.emulateMedia({ contrast: 'more', reducedMotion: 'reduce' });
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      expect(
        await month
          .locator('.sponsorship-month-status')
          .evaluateAll((labels) =>
            labels.every(
              (label) =>
                getComputedStyle(label).whiteSpace === 'nowrap' &&
                label.scrollWidth <= label.closest('button').clientWidth,
            ),
          ),
      ).toBe(true);
    }
    expect((await month.boundingBox()).height).toBeLessThan(480);
    await workspace.getByLabel('Booking status', { exact: true }).selectOption('pending');
    await expect(month.locator('button:enabled')).toHaveCount(1);
    const second = month.getByRole('button', { name: /^Day 2,/ });
    expect((await second.boundingBox()).x).toBe(initial[1].x);
    await second.click();
    const editor = workspace.getByRole('region', { name: 'Edit sponsorship', exact: true });
    await expect(editor.getByLabel('Sponsor name', { exact: true })).toHaveValue('Second sponsor');
    await editor.getByRole('button', { name: 'Close', exact: true }).click();
    await workspace.getByRole('button', { name: 'Suhoor', exact: true }).click();
    await expect(month.locator('button:enabled')).toHaveCount(30);
    await month.getByRole('button', { name: /^Day 30,/ }).click();
    await expect(
      workspace.getByRole('region', { name: 'Add sponsorship', exact: true }),
    ).toBeVisible();
    await expect(workspace.getByLabel('Amount (£)', { exact: true })).toHaveValue('100');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(state.writes).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}
