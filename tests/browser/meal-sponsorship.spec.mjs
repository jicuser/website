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
    day_settings: [{ kind: 'suhoor', day_date: '2027-02-11', enabled: false }],
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
test('a Suhoor meal request selects days independently from Iftar and blocks reserved or closed days', async ({
  page,
}) => {
  const { writes, errors } = await fixture(page);
  await page.goto('/ramadan/suhoor');
  await expect(page.getByRole('heading', { name: 'Sponsor a Suhoor', exact: true })).toBeVisible();
  const first = page.getByRole('button', { name: /^Day 1,/ });
  await expect(first).toBeEnabled();
  await expect(page.getByRole('button', { name: /^Day 2,/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^Day 3,/ })).toBeDisabled();
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name', { exact: false }).fill('Suhoor sponsor');
  await page.getByLabel('Phone or email', { exact: false }).fill('sponsor@example.test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Show my name on the sponsorship board')).not.toBeChecked();
  await page.getByRole('button', { name: 'Review answers', exact: true }).click();
  await expect(page.locator('.smart-form-booking-summary')).toContainText('9 February 2027');
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Request sponsorship', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Booking request received', exact: true }),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].kind).toBe('suhoor');
  expect(writes[0].dates).toEqual(['2027-02-09']);
  expect(errors).toEqual([]);
});
test('the homepage day-card option links to the enabled meal booking pages', async ({ page }) => {
  const { errors } = await fixture(page, { home: true });
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Ramadan meal sponsorships', exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.locator('a[href="/ramadan/suhoor"]')).toBeVisible();
  await expect(panel.locator('.home-sponsorship-days')).toHaveCount(3);
  expect(errors).toEqual([]);
});

for (const width of [320, 390]) {
  test(`public sponsorship month keeps multi-selection and a real scrolling table at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const { writes, errors } = await fixture(page);
    await page.goto('/ramadan/suhoor');
    await expect(page.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const month = page.getByRole('group', { name: 'Ramadan month' });
    await expect(page.getByLabel('Your name', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Choose your dates first' })).toBeVisible();
    await expect(month.getByRole('button')).toHaveCount(30);
    expect((await month.boundingBox()).height).toBeLessThan(550);
    await expect(month.getByRole('button', { name: /^Day 2,/ })).toBeDisabled();
    await expect(month.getByRole('button', { name: /^Day 3,/ })).toBeDisabled();
    const first = month.getByRole('button', { name: /^Day 1,/ });
    const last = month.getByRole('button', { name: /^Day 30,/ });
    await first.click();
    await last.click();
    await expect(first).toHaveAttribute('aria-pressed', 'true');
    await expect(last).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: '2 days selected', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Table', exact: true }).click();
    const tableRegion = page.getByRole('region', { name: 'Ramadan sponsorship table' });
    expect(
      await tableRegion.locator('table').evaluate((node) => getComputedStyle(node).display),
    ).toBe('table');
    expect(await tableRegion.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    await expect(
      tableRegion.getByRole('button', { name: 'Select 30 Ramadan, 10 March 2027' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Month', exact: true }).click();
    await page.getByText('Choose a date range', { exact: true }).click();
    const range = page.getByRole('group', { name: 'Sponsorship date range' });
    await range.getByLabel('From', { exact: true }).selectOption('2027-02-27');
    await range.getByLabel('To', { exact: true }).selectOption('2027-03-03');
    await expect(month.getByRole('button')).toHaveCount(30);
    await expect(month.locator('button:enabled')).toHaveCount(5);
    await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
    await expect(first).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByLabel('Your name', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('a newly reserved date clears selection but keeps the request error and contact draft', async ({
  page,
}) => {
  const { writes, errors } = await fixture(page, { failRequest: true });
  await page.goto('/ramadan/suhoor');
  await page.getByRole('button', { name: /^Day 1,/ }).click();
  await page.getByRole('button', { name: 'Show all questions', exact: true }).click();
  await page.getByLabel('Your name', { exact: false }).fill('Returning sponsor');
  await page.getByLabel('Phone or email', { exact: false }).fill('returning@example.test');
  await page.getByRole('button', { name: 'Review answers', exact: true }).click();
  await page.getByRole('button', { name: 'Request sponsorship', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'That day has just been reserved. Choose another date.',
  );
  await expect(page.getByRole('heading', { name: 'Choose your dates first' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Day 1,/ })).toBeDisabled();
  await expect(page.getByLabel('Your name', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^Day 4,/ }).click();
  await page.getByRole('button', { name: 'Show all questions', exact: true }).click();
  await expect(page.getByLabel('Your name', { exact: false })).toHaveValue('Returning sponsor');
  await expect(page.getByLabel('Phone or email', { exact: false })).toHaveValue(
    'returning@example.test',
  );
  expect(writes).toHaveLength(1);
  expect(errors).toEqual([]);
});
