import { test, expect } from '@playwright/test';

async function fixture(page, state = {}) {
  await page.clock.setFixedTime(new Date('2026-10-15T12:10:17Z'));
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', async (route) => {
    const url = new URL(route.request().url());
    const settings =
      url.pathname.endsWith('/page_content') &&
      url.searchParams.get('content_key') === 'eq.jummah_settings';
    const times = url.pathname.endsWith('/prayer_times');
    const failed = (settings && state.settingsFailed) || (times && state.timesFailed);
    let data = [];
    if (times)
      data = ['2026-10-15', '2026-10-16'].map((d_date) => ({
        d_date,
        fajr_begins: '06:14',
        fajr_jamah: '06:45',
        sunrise: '07:31',
        zuhr_begins: '12:59',
        zuhr_jamah: '13:45',
        asr_begins: '16:22',
        asr_jamah: '17:15',
        maghrib_begins: '18:18',
        maghrib_jamah: '18:18',
        isha_begins: '19:29',
        isha_jamah: '20:15',
        ...(d_date === '2026-10-16' ? state.friday : {}),
      }));
    if (settings) data = state.settings === undefined ? null : { content_value: state.settings };
    await route.fulfill({
      status: failed ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(failed ? { message: 'Service unavailable' } : data),
    });
  });
}

for (const settings of ['invalid JSON', '[]']) {
  test(`invalid Jummah settings preserve the daily and monthly timetables: ${settings}`, async ({
    page,
  }) => {
    await fixture(page, { settings });
    await page.goto('/prayer-times');
    await expect(page.getByRole('row', { name: 'Fajr 6:14 AM 6:45 AM' })).toBeVisible();
    const picker = page.locator('.jic-section-picker');
    await picker.locator('summary').click();
    await picker.getByRole('link', { name: 'Monthly Timetable', exact: true }).click();
    await expect(page.getByRole('table', { name: /October 2026 prayer/ })).toBeVisible();
    await picker.locator('summary').click();
    await picker.getByRole('link', { name: 'Jummah', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Jummah times could not be loaded');
    await expect(page.getByRole('heading', { name: 'First Jummah', exact: true })).toHaveCount(0);
  });
}

test('a failed Jummah settings request shows an error instead of fallback sessions', async ({
  page,
}) => {
  await fixture(page, { settingsFailed: true });
  await page.goto('/prayer-times/jummah');
  await expect(page.getByRole('alert')).toContainText('Jummah times could not be loaded');
  await expect(page.getByRole('heading', { name: 'First Jummah', exact: true })).toHaveCount(0);
});

test('an incomplete Jummah schedule cannot relabel the second session as the first', async ({
  page,
}) => {
  await fixture(page, {
    settings: JSON.stringify({
      jummah_1_start: 'invalid',
      jummah_1_jamah: '13:00',
      jummah_2_begins: '13:45',
      jummah_2_jamah: '14:00',
    }),
  });
  await page.goto('/prayer-times/jummah');
  await expect(page.getByRole('alert')).toContainText('Jummah times could not be loaded');
  await expect(page.getByRole('heading', { name: 'Second Jummah', exact: true })).toHaveCount(0);
  await expect(page.locator('.jic-mobile-info-banner')).not.toContainText('Jummah 1 · 2:00 PM');
});

test('published Friday overrides remain usable when optional Jummah settings fail', async ({
  page,
}) => {
  await fixture(page, {
    settingsFailed: true,
    friday: {
      jummah_1_start: '12:45',
      jummah_1_jamah: '13:00',
      jummah_2_begins: '13:45',
      jummah_2_jamah: '14:00',
    },
  });
  await page.goto('/prayer-times/jummah');
  const main = page.locator('main');
  await expect(main.getByRole('heading', { name: 'First Jummah', exact: true })).toBeVisible();
  await expect(main).toContainText('12:45 PM');
  await expect(main).toContainText('2:00 PM');
  await expect(main.getByRole('alert')).toHaveCount(0);
});

test('missing Jummah settings use the established defaults after a successful load', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/prayer-times/jummah');
  const main = page.locator('main');
  await expect(main.getByRole('heading', { name: 'First Jummah', exact: true })).toBeVisible();
  await expect(main).toContainText('Friday prayer · Friday, 16 October 2026');
  await expect(main).toContainText('1:30 PM');
  await expect(main).toContainText('2:30 PM');
  await expect(main.getByRole('alert')).toHaveCount(0);
});

test('a failed prayer refresh clears stale Jummah sessions and recovers on the next load', async ({
  page,
}) => {
  const state = {};
  await fixture(page, state);
  await page.goto('/prayer-times/jummah');
  const firstSession = page.getByRole('heading', { name: 'First Jummah', exact: true });
  await expect(firstSession).toBeVisible();
  state.timesFailed = true;
  await page.evaluate(() => window.dispatchEvent(new Event('jic-content-updated')));
  await expect(page.getByRole('alert')).toContainText('Jummah times could not be loaded');
  await expect(firstSession).toHaveCount(0);
  state.timesFailed = false;
  await page.evaluate(() => window.dispatchEvent(new Event('jic-content-updated')));
  await expect(firstSession).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
