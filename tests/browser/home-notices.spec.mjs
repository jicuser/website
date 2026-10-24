import { test, expect } from '@playwright/test';

test('a live notice uses its saved placement and a dismissed notification stays closed', async ({
  page,
}) => {
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/preview-api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/livestream_settings')
      ? {
          id: 1,
          enabled: true,
          title: 'Community broadcast',
          stream_url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
          display_settings: { placement: 'after-events', notification: true, position: 'top-left' },
        }
      : path.endsWith('/events')
        ? [
            {
              id: 'activity',
              title: 'Community gathering',
              published: true,
              event_date: '2030-01-01',
            },
          ]
        : [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/');
  const banner = page.locator('.jic-home-live-banner');
  await expect(banner).toContainText('Community broadcast');
  expect(
    await banner.evaluate((node) =>
      Boolean(
        document.querySelector('.community-programme-feed').compareDocumentPosition(node) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);
  const notification = page.locator('.jic-site-notice');
  await expect(notification).toHaveClass(/top-left/);
  await expect(notification.getByRole('link', { name: 'Watch live' })).toHaveAttribute(
    'href',
    '/#live',
  );
  await notification.getByRole('button', { name: 'Dismiss notification' }).click();
  await expect(notification).toHaveCount(0);
  await page.reload();
  await expect(banner).toBeVisible();
  await expect(notification).toHaveCount(0);
  await expect(page.locator('.jic-site-footer a[href="/portal"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Find what you need', exact: true })).toHaveCount(
    0,
  );
});
