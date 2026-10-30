import { test, expect } from '@playwright/test';
import { sitewideFixture } from './helpers/sitewideFixture.mjs';
import { monthDates } from '../../src/lib/timetableEditor.js';

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function timetableFixture(page, options = {}) {
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00Z'));
  const evidence = await sitewideFixture(page, { signedIn: !options.public });
  const rows = monthDates('2026-10').map((d_date) => ({
    d_date,
    fajr_begins: '05:30',
    fajr_jamah: '06:00',
    sunrise: '07:00',
    zuhr_begins: '12:00',
    zuhr_jamah: '13:00',
    asr_begins: '15:00',
    asr_jamah: '16:00',
    maghrib_begins: '17:00',
    maghrib_jamah: '17:00',
    isha_begins: '19:00',
    isha_jamah: '20:00',
    ...(d_date === '2026-10-16'
      ? {
          jummah_1_start: '12:45',
          jummah_1_jamah: '13:10',
          jummah_2_begins: '13:45',
          jummah_2_jamah: '14:10',
        }
      : {}),
  }));
  const writes = [];
  await page.route('**/preview-api/rest/v1/prayer_times*', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (request.method() === 'GET') {
      if (
        options.monthFails &&
        url.searchParams.get('select') === '*' &&
        !url.searchParams.get('d_date')?.startsWith('eq.')
      )
        return route.fulfill({ status: 503, json: { message: 'Month unavailable' } });
      const date = url.searchParams.get('d_date');
      return route.fulfill({
        json: date?.startsWith('eq.') ? rows.find((r) => r.d_date === date.slice(3)) : rows,
      });
    }
    const body = request.postDataJSON();
    writes.push(body);
    options.started?.resolve();
    if (options.release) await options.release.promise;
    if (options.emptySave) return route.fulfill({ json: [] });
    for (const row of body)
      Object.assign(
        rows.find((r) => r.d_date === row.d_date),
        row,
      );
    return route.fulfill({ json: body.map(({ d_date }) => ({ d_date })) });
  });
  return { ...evidence, writes };
}

test('monthly drafts and exports survive a failed save; pending saves block every exit', async ({
  page,
}) => {
  const options = { started: deferred(), release: deferred(), emptySave: true };
  const evidence = await timetableFixture(page, options);
  await page.goto('/admin?section=prayer');
  const editor = page.getByRole('region', { name: 'Monthly timetable editor' });
  await editor.getByRole('button', { name: 'Edit times →', exact: true }).click();
  await editor.getByLabel('Fajr begins', { exact: true }).fill('05:45');
  const tasks = page.getByRole('navigation', { name: 'Timetable tasks' });
  await tasks.getByRole('button', { name: 'Daily times', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Save your changes');
  await expect(editor.getByLabel('Fajr begins', { exact: true })).toHaveValue('05:45');
  await editor.getByRole('button', { name: 'Preview & download →', exact: true }).click();
  await expect(editor).toContainText('Draft — downloads include your unsaved edits.');
  await expect(
    editor.getByRole('link', { name: 'Download a4 timetable JPEG', exact: true }),
  ).toHaveAttribute('href', /^blob:/);
  await expect(
    editor.getByRole('link', { name: 'Download phone wallpaper JPEG', exact: true }),
  ).toHaveAttribute('href', /^blob:/);
  await editor.getByRole('button', { name: 'Save month to website', exact: true }).click();
  await options.started.promise;
  try {
    await expect(page.getByRole('button', { name: 'View website', exact: true })).toBeDisabled();
    await expect(page.getByRole('combobox', { name: 'Go to admin area' })).toBeDisabled();
    for (const button of await tasks.getByRole('button').all()) await expect(button).toBeDisabled();
    await page.locator('.admin-account-menu > summary').click();
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeDisabled();
  } finally {
    options.release.resolve();
  }
  await expect(editor.getByRole('alert')).toContainText('Could not verify every saved date');
  await expect(page.locator('.admin-save-pending')).toBeVisible();
  await expect(editor).toContainText('Draft — downloads include your unsaved edits.');
  options.emptySave = false;
  await editor.getByRole('button', { name: 'Save month to website', exact: true }).click();
  await expect(editor.getByRole('status')).toContainText('Month saved');
  await expect(page.locator('.admin-save-pending')).toHaveCount(0);
  expect(evidence.writes).toHaveLength(2);
  expect(evidence.writes[1]).toHaveLength(1);
  expect(evidence.writes[1][0]).toMatchObject({
    d_date: '2026-10-01',
    fajr_begins: '05:45',
    jummah_1_jamah: null,
  });
  await tasks.getByRole('button', { name: 'Daily times', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Daily prayer times' })).toBeVisible();
  expect(evidence.errors).toEqual([]);
});

test('failed monthly loading does not trap staff in a permanent saving state', async ({ page }) => {
  const evidence = await timetableFixture(page, { monthFails: true });
  await page.goto('/admin?section=prayer');
  const editor = page.getByRole('region', { name: 'Monthly timetable editor' });
  await expect(editor.getByRole('alert')).toContainText('Could not load the month');
  await expect(editor.getByRole('button', { name: 'Edit times →', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'View website', exact: true })).toBeEnabled();
  await page
    .getByRole('navigation', { name: 'Timetable tasks' })
    .getByRole('button', { name: 'Daily times', exact: true })
    .click();
  await expect(page.getByRole('table', { name: 'Daily prayer times' })).toBeVisible();
  expect(evidence.writes).toEqual([]);
  expect(evidence.errors).toEqual([]);
});

for (const installed of [false, true]) {
  test(`Salah navigation and downloads survive unavailable weekly settings (${installed ? 'installed app' : 'website'})`, async ({
    page,
  }) => {
    if (installed)
      await page.addInitScript(() =>
        Object.defineProperty(navigator, 'standalone', { value: true }),
      );
    const evidence = await timetableFixture(page, { public: true });
    await page.route('**/preview-api/rest/v1/page_content*', (route) => {
      const url = new URL(route.request().url());
      return url.searchParams.get('content_key') === 'eq.jummah_settings'
        ? route.fulfill({ status: 503, json: { message: 'Weekly settings unavailable' } })
        : route.fallback();
    });
    await page.goto('/');
    const card = page.getByRole('complementary', { name: 'Daily prayer timetable' });
    await expect(card).toContainText('1:10 PM');
    await expect(card).toContainText('2:10 PM');
    if (installed)
      await page
        .getByRole('navigation', { name: 'App navigation' })
        .getByRole('link', { name: 'Salah timetable' })
        .click();
    else await card.getByRole('link', { name: 'Timetable', exact: true }).click();
    await expect(page.getByRole('row', { name: 'Fajr 5:30 AM 6:00 AM' })).toBeVisible();
    const picker = page.locator(installed ? '.jic-app-section-links' : '.jic-section-picker');
    if (!installed) await picker.locator('summary').click();
    await picker.getByRole('link', { name: 'Monthly Timetable', exact: true }).click();
    const downloads = page.getByRole('region', { name: 'Timetable downloads' });
    await expect(downloads.getByRole('button', { name: 'Print / PDF', exact: true })).toHaveCount(
      0,
    );
    const file = page.waitForEvent('download');
    await downloads.getByRole('link', { name: 'Download a4 timetable JPEG', exact: true }).click();
    expect((await file).suggestedFilename()).toMatch(/monthly-timetable\.jpg$/);
    if (!installed) await picker.locator('summary').click();
    await picker.getByRole('link', { name: 'Jummah', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'First Jummah', exact: true })).toBeVisible();
    await expect(page.locator('main')).toContainText('Friday prayer · Friday, 16 October 2026');
    await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
    expect(evidence.errors).toEqual([]);
  });
}
