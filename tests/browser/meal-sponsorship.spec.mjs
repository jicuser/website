import { test, expect } from '@playwright/test';
test.use({ screenshot: 'off' });
const season = {
  id: '20000000-0000-4000-8000-000000000001',
  title: 'Ramadan meal sponsorships',
  start_date: '2027-02-09',
  day_count: 30,
  published: true,
};
async function fixture(page, { home = false } = {}) {
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
  await page.getByLabel('Your name', { exact: true }).fill('Suhoor sponsor');
  await page.getByLabel('Phone or email', { exact: true }).fill('sponsor@example.test');
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
