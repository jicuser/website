import { test, expect } from '@playwright/test';

test.use({ screenshot: 'off' });

async function openWorkspace(
  page,
  section,
  { records = [], addedPages = [], prayerFails = false } = {},
) {
  const writes = [],
    content = new Map(),
    day = { d_date: '2026-10-23', fajr_begins: '05:30', fajr_jamah: '06:00' };
  const actor = {
    id: '10000000-0000-4000-8000-000000000001',
    display_name: 'Centre owner',
    is_owner: true,
    is_active: true,
    permissions: [],
    staff_kinds: [],
  };
  await page.route('**/*', (route) =>
    ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      table = url.pathname.split('/').at(-1);
    let data = [];
    if (table === 'token') {
      const expires = Math.floor(Date.now() / 1000) + 3600;
      const encode = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
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
    } else if (table === 'get_my_profile') data = actor;
    else if (table === 'save_site_visibility') {
      const body = request.postDataJSON();
      writes.push({ table, body });
      content.set(`page-visibility:${body.p_path}`, String(body.p_visible));
      const added = addedPages.find((item) => item.id === body.p_page_id);
      if (added) added.published = body.p_visible;
      data = body.p_visible;
    } else if (table === 'page_content') {
      if (request.method() !== 'GET') {
        const body = request.postDataJSON();
        writes.push({ table, body });
        content.set(body.content_key, body.content_value);
      }
      const key = url.searchParams.get('content_key')?.replace('eq.', '');
      data = key
        ? content.has(key)
          ? { content_value: content.get(key) }
          : null
        : [...content].map(([content_key, content_value]) => ({ content_key, content_value }));
    } else if (table === 'community_safeguarding_checks') data = records;
    else if (table === 'site_pages') data = addedPages;
    else if (['save_community_safeguarding', 'remove_community_safeguarding'].includes(table)) {
      writes.push({ table, body: request.postDataJSON() });
      data = records[0] || {};
    } else if (table === 'prayer_times') {
      if (prayerFails && request.method() === 'GET')
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Prayer times could not be loaded.' }),
        });
      if (request.method() !== 'GET') {
        const body = request.postDataJSON();
        writes.push({ table, body });
        Object.assign(day, body);
        data = [{ d_date: day.d_date }];
      } else data = url.searchParams.has('d_date') ? day : [day];
    } else if (request.method() !== 'GET' && !url.pathname.includes('/rpc/'))
      writes.push({ table, body: request.postDataJSON() });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/admin/login');
  await page.locator('input[type="email"]').fill('staff@example.invalid');
  await page.locator('input[type="password"]').fill('Local testing passphrase');
  await page.locator('form button[type="submit"], form > button').first().click();
  await expect(page.locator('.admin-toolbar')).toBeVisible();
  await page.goto(`/admin?section=${section}`);
  await expect(page.locator('.admin-toolbar')).toBeVisible();
  return writes;
}

for (const width of [320, 390, 1280]) {
  test(`daily prayer inputs share headings and fit without losing touch targets at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const writes = await openWorkspace(page, 'prayer');
    const times = page.getByRole('table', { name: 'Daily prayer times' });
    await expect(times.getByRole('columnheader')).toHaveText(['Prayer', 'Start', 'Jama’ah']);
    await expect(times.getByRole('rowheader')).toHaveText([
      'Fajr',
      'Dhuhr',
      'Asr',
      'Maghrib',
      'Isha',
    ]);
    await expect(times.locator('input')).toHaveCount(10);
    const geometry = await times.evaluate((table) => ({
      height: table.getBoundingClientRect().height,
      width: table.getBoundingClientRect().width,
      parentWidth: table.parentElement.clientWidth,
      smallInputs: [...table.querySelectorAll('input')].filter(
        (input) => input.getBoundingClientRect().height < 44,
      ).length,
      clippedInputs: [...table.querySelectorAll('input')].filter(
        (input) => input.scrollWidth > input.clientWidth,
      ).length,
    }));
    expect(geometry.height).toBeLessThan(360);
    expect(geometry.width).toBeLessThanOrEqual(geometry.parentWidth);
    expect(geometry.smallInputs).toBe(0);
    expect(geometry.clippedInputs).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByLabel('Asr Jama’ah', { exact: true }).fill('16:20');
    await page.getByLabel('Sunrise', { exact: true }).fill('07:10');
    await page.getByRole('button', { name: 'Jummah', exact: true }).click();
    await page.getByRole('button', { name: 'Daily times', exact: true }).click();
    await expect(page.getByLabel('Asr Jama’ah', { exact: true })).toHaveValue('16:20');
    await page.getByRole('button', { name: 'Save date', exact: true }).click();
    await expect(page.locator('.admin-success')).toContainText('Timetable saved.');
    expect(writes.find((write) => write.table === 'prayer_times')?.body).toMatchObject({
      asr_jamah: '16:20',
      sunrise: '07:10',
    });
  });
}

test('prayer task views retain drafts and save daily and weekly changes together', async ({
  page,
}) => {
  const writes = await openWorkspace(page, 'prayer');
  await expect(page.getByRole('button', { name: 'Daily times', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByLabel('Fajr begins', { exact: true }).fill('05:45');
  await page.getByRole('button', { name: 'Jummah', exact: true }).click();
  await page.getByLabel('First khutbah', { exact: true }).first().fill('13:15');
  await page.getByRole('button', { name: 'CSV import', exact: true }).click();
  await page.getByRole('button', { name: 'Daily times', exact: true }).click();
  await expect(page.getByLabel('Fajr begins', { exact: true })).toHaveValue('05:45');
  await page
    .locator('.admin-toolbar')
    .getByRole('button', { name: 'Save timetable changes', exact: true })
    .click();
  await expect(page.locator('.admin-success')).toContainText('Timetable saved.');
  expect(writes.find((w) => w.table === 'prayer_times')?.body).toMatchObject({
    fajr_begins: '05:45',
    fajr_jamah: '06:00',
  });
  expect(
    JSON.parse(writes.find((w) => w.body.content_key === 'jummah_settings').body.content_value),
  ).toMatchObject({ jummah_1_start: '13:15' });
});

test('changing the daily date preserves the independent weekly Jummah draft and CSV preview', async ({
  page,
}) => {
  const writes = await openWorkspace(page, 'prayer');
  await page.getByRole('button', { name: 'Jummah', exact: true }).click();
  await page.getByLabel('First khutbah', { exact: true }).first().fill('13:10');
  await page.getByRole('button', { name: 'CSV import', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'timetable.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'd_date,fajr_begins,fajr_jamah,sunrise,zuhr_begins,zuhr_jamah,asr_begins,asr_jamah,maghrib_begins,maghrib_jamah,isha_begins,isha_jamah\n2026-10-25,05:30,06:00,07:00,12:00,13:00,15:00,16:00,17:00,17:00,19:00,20:00',
    ),
  });
  await expect(page.locator('.admin-import-preview')).toContainText('timetable.csv · 1 dates');
  await page.getByRole('button', { name: 'Daily times', exact: true }).click();
  await page.getByLabel('Date', { exact: true }).fill('2026-10-25');
  await page.getByRole('button', { name: 'Jummah', exact: true }).click();
  await expect(page.getByLabel('First khutbah', { exact: true }).first()).toHaveValue('13:10');
  await page.getByRole('button', { name: 'CSV import', exact: true }).click();
  await expect(page.locator('.admin-import-preview')).toContainText('timetable.csv · 1 dates');
  expect(writes).toEqual([]);
});

test('a failed prayer load leaves daily, weekly and import fields disabled', async ({ page }) => {
  const writes = await openWorkspace(page, 'prayer', { prayerFails: true });
  await expect(page.getByRole('alert')).toContainText('Prayer times could not be loaded.');
  await expect(page.getByLabel('Fajr begins', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Ramadan day', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Jummah', exact: true }).click();
  await expect(page.getByLabel('First khutbah', { exact: true }).first()).toBeDisabled();
  await page.getByRole('button', { name: 'CSV import', exact: true }).click();
  await expect(page.locator('input[type="file"]')).toBeDisabled();
  expect(writes).toEqual([]);
});

test('a pending CSV cannot save after a later daily read fails and remains cancellable until recovery', async ({
  page,
}) => {
  const writes = await openWorkspace(page, 'prayer');
  const csv = {
    name: 'pending-timetable.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'd_date,fajr_begins,fajr_jamah,sunrise,zuhr_begins,zuhr_jamah,asr_begins,asr_jamah,maghrib_begins,maghrib_jamah,isha_begins,isha_jamah\n2026-10-25,05:30,06:00,07:00,12:00,13:00,15:00,16:00,17:00,17:00,19:00,20:00',
    ),
  };
  await page.getByRole('button', { name: 'CSV import', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(csv);
  await expect(page.locator('.admin-import-preview')).toContainText(
    'pending-timetable.csv · 1 dates',
  );
  let finishRead;
  const readGate = new Promise((resolve) => {
    finishRead = resolve;
  });
  await page.route('**/preview-api/rest/v1/prayer_times?**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET' && url.searchParams.get('d_date') === 'eq.2026-10-26') {
      await readGate;
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Daily date could not be read.' }),
      });
    }
    return route.fallback();
  });
  await page.getByRole('button', { name: 'Daily times', exact: true }).click();
  await page.getByLabel('Date', { exact: true }).fill('2026-10-26');
  await page.getByRole('button', { name: 'CSV import', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save CSV', exact: true })).toBeDisabled();
  expect(writes).toEqual([]);
  finishRead();
  await expect(page.getByRole('alert')).toContainText('Daily date could not be read.');
  const saveCsv = page.getByRole('button', { name: 'Save CSV', exact: true });
  await expect(saveCsv).toBeDisabled();
  await page
    .locator('.admin-toolbar')
    .getByRole('button', { name: 'Save timetable changes', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('Daily date could not be read.');
  await expect(page.locator('.admin-success')).toHaveCount(0);
  await expect(page.locator('.admin-import-preview')).toContainText(
    'pending-timetable.csv · 1 dates',
  );
  expect(writes).toEqual([]);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.admin-import-preview')).toHaveCount(0);
  expect(writes).toEqual([]);
  await page.getByRole('button', { name: 'Daily times', exact: true }).click();
  await page.getByLabel('Date', { exact: true }).fill('2026-10-27');
  await expect(page.getByLabel('Fajr begins', { exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'CSV import', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(csv);
  await expect(saveCsv).toBeEnabled();
  await saveCsv.click();
  await expect(page.locator('.admin-success')).toContainText('Timetable saved.');
  await expect(page.locator('.admin-import-preview')).toHaveCount(0);
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({
    table: 'prayer_times',
    body: [{ d_date: '2026-10-25', fajr_begins: '05:30' }],
  });
});

test('visibility summaries reveal search and filter matches and persist toggles', async ({
  page,
}) => {
  const writes = await openWorkspace(page, 'visibility');
  const groups = page.locator('.site-visibility-section');
  await expect(groups.first()).toHaveJSProperty('tagName', 'DETAILS');
  await expect(groups.first()).not.toHaveAttribute('open');
  await page.getByLabel('Find a page').fill('prayer');
  await expect(page.getByRole('switch', { name: 'Salah Times', exact: true })).toBeVisible();
  await page.getByRole('switch', { name: 'Salah Times', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('off');
  await page.getByLabel('Find a page').fill('');
  await page.getByRole('combobox', { name: 'Show', exact: true }).selectOption('off');
  await expect(page.getByRole('switch', { name: 'Salah Times', exact: true })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await page.reload();
  await page.getByRole('combobox', { name: 'Show', exact: true }).selectOption('off');
  await expect(page.getByRole('switch', { name: 'Salah Times', exact: true })).toBeVisible();
  expect(writes).toEqual([
    {
      table: 'save_site_visibility',
      body: { p_path: '/prayer-times', p_visible: false, p_page_id: null },
    },
  ]);
});

test('visibility keeps always-on pages restricted and added pages on the existing save contract', async ({
  page,
}) => {
  const writes = await openWorkspace(page, 'visibility', {
    addedPages: [
      {
        id: 'added-1',
        title: 'Local added page',
        slug: 'local-added-page',
        placement: '/education',
        published: true,
      },
    ],
  });
  await page.getByLabel('Find a page').fill('Home');
  await expect(page.getByRole('switch', { name: 'Home', exact: true })).toBeDisabled();
  await page.getByLabel('Find a page').fill('Local added');
  const added = page.getByRole('switch', { name: 'Local added page', exact: true });
  await expect(added).toBeVisible();
  await added.click();
  await expect(added).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await page.getByLabel('Find a page').fill('Local added');
  await expect(added).toHaveAttribute('aria-checked', 'false');
  expect(writes).toEqual([
    {
      table: 'save_site_visibility',
      body: { p_path: '/pages/local-added-page', p_visible: false, p_page_id: 'added-1' },
    },
  ]);
});

test('safeguarding opens deliberately and cancelling protects input then returns focus', async ({
  page,
}) => {
  const writes = await openWorkspace(page, 'safeguarding');
  await expect(page.getByLabel('Staff / volunteer name', { exact: true })).toHaveCount(0);
  const create = page.getByRole('button', { name: 'New record', exact: true });
  await create.click();
  await expect(page.getByLabel('Staff / volunteer name', { exact: true })).toBeFocused();
  await page.getByLabel('Staff / volunteer name', { exact: true }).fill('Unsaved review');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Staff / volunteer name', { exact: true })).toHaveValue(
    'Unsaved review',
  );
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Staff / volunteer name', { exact: true })).toHaveCount(0);
  await expect(create).toBeFocused();
  expect(writes).toEqual([]);
});

test('safeguarding Edit leaves the stored record untouched when a changed draft is cancelled', async ({
  page,
}) => {
  const writes = await openWorkspace(page, 'safeguarding', {
    records: [
      {
        id: 'review-1',
        subject_name: 'Stored review',
        role_name: 'Volunteer',
        check_level: 'basic',
        checked_on: '2026-01-01',
        review_on: '2026-10-23',
        retention_review_on: '2027-01-01',
        status: 'recorded',
        policy_reference: 'Approved policy',
        version: 3,
      },
    ],
  });
  const edit = page.getByRole('button', { name: 'Edit Stored review', exact: true });
  await edit.click();
  await expect(page.getByLabel('Staff / volunteer name', { exact: true })).toHaveValue(
    'Stored review',
  );
  await page.getByLabel('Role checked for', { exact: true }).fill('Unsaved role');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(edit).toBeFocused();
  await edit.click();
  await expect(page.getByLabel('Role checked for', { exact: true })).toHaveValue('Volunteer');
  expect(writes).toEqual([]);
});

for (const width of [320, 390]) {
  test(`hall day labels stay whole and retain status and selection at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.clock.install({ time: new Date('2026-10-23T12:00:00Z') });
    await page.route('**/*', (route) =>
      ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname)
        ? route.continue()
        : route.abort(),
    );
    await page.route('**/preview-api/**', (route) => {
      const table = new URL(route.request().url()).pathname.split('/').at(-1);
      const data =
        table === 'hall_bookings'
          ? [
              { booking_date: '2026-10-24', status: 'available' },
              { booking_date: '2026-10-25', status: 'pending' },
              { booking_date: '2026-10-26', status: 'booked' },
              { booking_date: '2026-10-27', status: 'closed' },
            ]
          : [];
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.goto('/services/hall-booking');
    const available = page.getByRole('button', { name: '24/10/2026 · Available', exact: true });
    const held = page.getByRole('button', { name: '25/10/2026 · Provisional', exact: true });
    const unknown = page.getByRole('button', { name: '23/10/2026 · Ask us', exact: true });
    await expect(available).toHaveText('24Open');
    await expect(held).toHaveText('25Held');
    await expect(unknown).toHaveText('23Ask');
    await expect(unknown).toHaveAttribute('title', 'Ask us');
    await available.click();
    await expect(available).toHaveAttribute('aria-pressed', 'true');
    await page.emulateMedia({ contrast: 'more', reducedMotion: 'reduce' });
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      expect(
        await page.locator('.date-calendar-day span').evaluateAll((labels) =>
          labels
            .filter((label) => {
              const style = getComputedStyle(label);
              return (
                style.whiteSpace !== 'nowrap' ||
                label.scrollWidth > label.closest('button').clientWidth
              );
            })
            .map((label) => ({
              text: label.textContent,
              width: label.scrollWidth,
              cell: label.closest('button').clientWidth,
            })),
        ),
      ).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
}
