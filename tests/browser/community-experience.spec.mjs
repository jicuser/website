import { test, expect } from '@playwright/test';

async function publicSite(page) {
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/preview-api/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: route.request().url().includes('/auth/v1/settings')
        ? '{"external":{"google":false}}'
        : '[]',
    }),
  );
  await page.goto('/');
}

test('homepage leads with masjid activity and compact practical links', async ({ page }) => {
  await publicSite(page);
  const services = page.locator('.service-explorer--compact');
  await expect(services).toBeVisible();
  // Certificates remain hidden until the workspace feature is enabled.
  await expect(services.locator('.service-explorer-card')).toHaveCount(4);
  await expect(page.getByRole('searchbox', { name: 'Search services' })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Filter services' })).toHaveCount(0);
  await expect(
    page.locator('.jic-learning, .jic-account-connection, .jic-visitor-questions'),
  ).toHaveCount(0);
  expect(
    await page
      .locator('.community-programme-feed')
      .evaluate(
        (node) =>
          node.getBoundingClientRect().top >
          document.querySelector('.service-explorer--compact').getBoundingClientRect().top,
      ),
  ).toBe(true);
  expect(
    await page.locator('.jic-premium-home').evaluate((node) => node.getBoundingClientRect().height),
  ).toBeLessThan(3000);
});

test('the services page keeps the complete searchable directory in short rows', async ({
  page,
}) => {
  await publicSite(page);
  await page.goto('/services');
  await expect(page.getByRole('heading', { name: 'Community Hub' })).toBeVisible();
  await expect(page.locator('.jic-daily-reminder')).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search services' }).fill('nikah');
  await expect(page.locator('.service-explorer-card')).toHaveCount(2);
  const result = page
    .locator('.service-explorer-grid')
    .getByRole('link', { name: 'Nikah', exact: true });
  await expect(result).toHaveAttribute('href', '/services/nikah');
  expect((await result.boundingBox()).height).toBeLessThan(160);
});

test('hidden services are absent from compact homepage links', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/preview-api/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: route.request().url().includes('/page_content')
        ? JSON.stringify([
            { content_key: 'page-visibility:/services/hall-booking', content_value: 'false' },
          ])
        : '[]',
    }),
  );
  await page.goto('/');
  await expect(page.locator('.service-explorer')).toBeVisible();
  await expect(page.locator('.service-explorer a[href="/services/hall-booking"]')).toHaveCount(0);
  await expect(
    page.getByText('Does a hall enquiry confirm my booking?', { exact: true }),
  ).toHaveCount(0);
});
