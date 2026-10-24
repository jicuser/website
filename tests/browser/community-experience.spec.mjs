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
  const services = page.locator('.jic-home-shortcuts');
  await expect(services).toBeVisible();
  // Certificates remain hidden until the workspace feature is enabled.
  await expect(services.locator('a')).toHaveCount(6);
  await expect(page.getByRole('searchbox', { name: 'Search services' })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Filter services' })).toHaveCount(0);
  await expect(
    page.locator('.jic-learning, .jic-account-connection, .jic-visitor-questions'),
  ).toHaveCount(0);
  await expect(page.locator('.home-whats-on .whats-on-row')).toHaveCount(3);
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
  await expect(page.locator('.service-explorer-card')).toHaveCount(1);
  const result = page
    .locator('.service-explorer-grid')
    .getByRole('link', { name: 'Marriage & family', exact: true });
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
  await expect(page.locator('.jic-home-shortcuts')).toBeVisible();
  await expect(page.locator('.jic-home-shortcuts a[href="/services/hall-booking"]')).toHaveCount(0);
  await expect(
    page.getByText('Does a hall enquiry confirm my booking?', { exact: true }),
  ).toHaveCount(0);
});
