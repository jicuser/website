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

test('learning choices explain the next step and use real enrolment destinations', async ({
  page,
}) => {
  await publicSite(page);
  const learning = page.getByRole('region', { name: 'Learning for every stage of life.' });
  await expect(learning.getByRole('tab', { name: 'For children' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await learning.getByRole('tab', { name: 'For adults' }).click();
  await expect(learning.getByRole('tabpanel')).toContainText('Make time for your learning');
  await expect(learning.getByRole('link', { name: 'Explore adult classes' })).toHaveAttribute(
    'href',
    '/education/courses',
  );
  await page.keyboard.press('ArrowLeft');
  await expect(learning.getByRole('tab', { name: 'For children' })).toBeFocused();
  await expect(learning.getByRole('tabpanel')).toContainText(
    'A thoughtful start for young learners',
  );
});

test('visitor questions disclose clear next steps without leaving the page', async ({ page }) => {
  await publicSite(page);
  const question = page.getByText('Do I need an account to contact JIC?', { exact: true });
  await question.click();
  await expect(
    page.getByText('You can make a service enquiry without signing in.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('details[open]').getByRole('link', { name: 'Contact the office' }),
  ).toHaveAttribute('href', '/contact');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
    false,
  );
});

test('hidden services are absent from homepage questions and discovery', async ({ page }) => {
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
