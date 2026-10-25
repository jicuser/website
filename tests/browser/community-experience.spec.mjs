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
  const services = page.getByRole('navigation', { name: 'Services and learning' });
  await expect(services).toBeVisible();
  await expect(services.getByRole('link')).toHaveCount(6);
  await expect(page.locator('.service-explorer--compact')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'More from JIC' })).toBeVisible();
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
          document.querySelector('.jic-home-shortcuts').getBoundingClientRect().top,
      ),
  ).toBe(true);
  expect(
    await page.locator('.jic-premium-home').evaluate((node) => node.getBoundingClientRect().height),
  ).toBeLessThan(3000);
});

test('the Hub groups eight areas while keeping individual services searchable', async ({ page }) => {
  await publicSite(page);
  await page.goto('/services');
  await expect(page.getByRole('heading', { name: 'Community Hub', exact: true })).toBeVisible();
  await expect(page.locator('.jic-daily-reminder')).toHaveCount(0);
  await expect(page.locator('.community-hub-card')).toHaveCount(8);
  await expect(page.locator('.community-hub').getByRole('link', { name: 'TV & live controls' })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search services' }).fill('nikah');
  await expect(page.locator('.community-hub-results > a')).toHaveCount(2);
  const result = page.locator('.community-hub-results a[href="/services/nikah"]');
  await expect(result).toBeVisible();
  await expect(result).toContainText('Nikah');
  expect((await result.boundingBox()).height).toBeLessThan(160);
  await page.getByRole('button', { name: 'Clear service search' }).click();
  await expect(page.locator('.community-hub-card')).toHaveCount(8);
  await page.getByRole('button', { name: 'Life events', exact: true }).click();
  await expect(page.locator('.community-hub-card')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
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
