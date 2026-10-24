import { test, expect } from '@playwright/test';
test.use({ screenshot: 'off' });
const season = {
  id: '20000000-0000-4000-8000-000000000001',
  title: 'Ramadan meal sponsorships',
  start_date: '2027-02-09',
  day_count: 30,
  published: true,
};
async function fixture(page, { home = false, failRequest = false } = {}) {
  const writes = [],
    errors = [];
  const data = {
    season,
    settings: {
      website_enabled: true,
      iftar_enabled: true,
      suhoor_enabled: true,
      daily_enabled: true,
      home_enabled: home,
      home_layout: 'days',
      tv_enabled: true,
    },
    days: [
      {
        kind: 'iftar',
        day_date: '2027-02-09',
        confirmed: 1,
        pending: 0,
        names: ['Approved sponsor'],
      },
      { kind: 'suhoor', day_date: '2027-02-10', confirmed: 0, pending: 1, names: [] },
    ],
    day_settings: [
      { kind: 'suhoor', day_date: '2027-02-11', enabled: false },
      ...['iftar', 'suhoor'].map((kind) => ({
        kind,
        day_date: '2027-02-12',
        enabled: true,
        offer_version: 1,
        menu_title: kind === 'iftar' ? 'Community Iftar' : 'Morning meal',
        dishes: [
          { name: 'Rice', cost_pence: 10000 },
          { name: 'Curry', cost_pence: 5000 },
        ],
        price_pence: kind === 'iftar' ? 15000 : 12000,
        people_fed: 50,
        menu_notes: 'Vegetarian option available',
      })),
    ],
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
    let result = [];
    if (path.endsWith('/rpc/ramadan_calendar_public')) result = data;
    if (path.endsWith('/page_content'))
      result = [{ content_key: 'ramadan:home-enabled', content_value: String(home) }];
    if (path.endsWith('/functions/v1/ramadan-request')) {
      writes.push(route.request().postDataJSON());
      if (failRequest) {
        data.days.push({
          kind: 'suhoor',
          day_date: '2027-02-09',
          confirmed: 0,
          pending: 1,
          names: [],
        });
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'That day has just been reserved. Choose another date.' }),
        });
        return;
      }
      result = { reference: 'RAM-SUHOOR-TEST' };
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) });
  });
  return { writes, errors };
}
test('the homepage day-card option links to the enabled meal booking pages', async ({ page }) => {
  const { errors } = await fixture(page, { home: true });
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Ramadan meal sponsorships', exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.locator('a[href="/ramadan/suhoor"]')).toBeVisible();
  await expect(panel.locator('.home-sponsorship-days')).toHaveCount(3);
  expect(errors).toEqual([]);
});

for (const width of [320, 390, 1366]) {
  test(`date then meal shows the published price and servings at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const { writes, errors } = await fixture(page);
    await page.goto('/ramadan');
    const month = page.getByRole('group', {
      name: 'Ramadan month',
      exact: true,
      includeHidden: true,
    });
    await expect(month.getByRole('button')).toHaveCount(30);
    expect((await month.boundingBox()).height).toBeLessThan(480);
    await expect(page.getByLabel('Your name', { exact: true })).toHaveCount(0);
    await month.getByRole('button', { name: /^Day 4,/ }).click();
    const meal = page.getByRole('region', { name: 'Selected meal', exact: true });
    await expect(meal.getByText('Community Iftar', { exact: true })).toBeVisible();
    await expect(meal.getByText('Feeds 50 people', { exact: true })).toBeVisible();
    await expect(meal.getByText('£150.00', { exact: true })).toBeVisible();
    await meal.getByRole('button', { name: 'Suhoor', exact: true }).click();
    await expect(meal.getByText('Morning meal', { exact: true })).toBeVisible();
    await expect(meal.getByText('£120.00', { exact: true })).toBeVisible();
    await expect(month.locator('button[aria-label^="Day 4,"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.screenshot({ path: testInfo.outputPath('meal-booking.png'), fullPage: true });
    await meal.getByRole('button', { name: 'Book this meal', exact: true }).click();
    await page.getByLabel('Your name', { exact: true }).fill('Meal sponsor');
    await page.getByLabel('Phone or email', { exact: true }).fill('sponsor@example.test');
    await page.getByRole('button', { name: 'Request sponsorship', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Booking request received', exact: true }),
    ).toBeVisible();
    expect(writes[0]).toMatchObject({
      kind: 'suhoor',
      dates: ['2027-02-12'],
      amount_pence: 12000,
      offer_versions: { '2027-02-12': 1 },
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}

test('reserved meals can be viewed but not booked; changing dates keeps the contact draft', async ({
  page,
}) => {
  const { writes, errors } = await fixture(page, { failRequest: true });
  await page.goto('/ramadan/suhoor');
  await page.getByRole('button', { name: /^Day 2,/ }).click();
  await expect(page.getByRole('button', { name: 'Book this meal', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Change date', exact: true }).click();
  await page.getByRole('button', { name: /^Day 1,/ }).click();
  await page.getByRole('button', { name: 'Book this meal', exact: true }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Returning sponsor');
  await page.getByLabel('Phone or email', { exact: true }).fill('returning@example.test');
  await page.getByRole('button', { name: 'Request sponsorship', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('That day has just been reserved.');
  await expect(page.getByRole('button', { name: 'Request sponsorship', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Change date', exact: true }).click();
  await page.getByRole('button', { name: /^Day 4,/ }).click();
  await page.getByRole('button', { name: 'Book this meal', exact: true }).click();
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Returning sponsor');
  await expect(page.getByLabel('Phone or email', { exact: true })).toHaveValue(
    'returning@example.test',
  );
  expect(writes).toHaveLength(1);
  expect(errors).toEqual([]);
});
