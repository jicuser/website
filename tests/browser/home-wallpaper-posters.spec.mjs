import { test, expect } from '@playwright/test';

const poster = (title) => ({
  id: 'home-poster',
  title,
  image: '/posters/open-quran-circle.png',
  website_locations: ['/'],
  groups: [],
  to: '/events',
});

for (const installed of [false, true]) {
  test(`Home opens the monthly wallpaper and downloads a JPEG (${installed ? 'installed' : 'browser'})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: installed ? 375 : 320, height: 812 });
    await page.addInitScript((standalone) => {
      sessionStorage.setItem('jic-salawat-shown', '1');
      Object.defineProperty(navigator, 'standalone', { value: standalone, configurable: true });
    }, installed);
    await page.route('**/preview-api/**', async (route) => {
      const url = new URL(route.request().url());
      const dates = url.searchParams.getAll('d_date');
      const day =
        dates.find((d) => d.startsWith('gte.'))?.slice(4, 11) ||
        new Date().toISOString().slice(0, 7);
      const data = url.pathname.endsWith('/prayer_times')
        ? [
            {
              d_date: dates.find((d) => d.startsWith('eq.'))?.slice(3) || `${day}-01`,
              fajr_begins: '05:34',
              fajr_jamah: '06:15',
              sunrise: '07:07',
              zuhr_begins: '11:56',
              zuhr_jamah: '13:00',
              asr_begins: '14:44',
              asr_jamah: '15:30',
              maghrib_begins: '16:37',
              maghrib_jamah: '16:37',
              isha_begins: '18:24',
              isha_jamah: '19:30',
            },
          ]
        : [];
      await route.fulfill({ json: data });
    });
    await page.goto('/');
    const link = page.locator('.jic-prayer-card').getByRole('link', { name: 'Download wallpaper' });
    await expect(link).toBeVisible();
    expect(await link.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(
      44,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await link.click();
    await expect(page).toHaveURL(/\/prayer-times\/monthly#phone-wallpaper$/);
    const jpeg = page.getByRole('link', { name: 'Download phone wallpaper JPEG' });
    await expect(jpeg).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent('download'), jpeg.click()]);
    expect(download.suggestedFilename()).toMatch(/phone-wallpaper\.jpg$/);
  });
}

test('returning to the bookmark refreshes a remotely edited or unlisted Home poster', async ({
  page,
}) => {
  let posters = [poster('Published first')];
  await page.addInitScript(() => {
    sessionStorage.setItem('jic-salawat-shown', '1');
    Object.defineProperty(navigator, 'standalone', { value: true });
  });
  await page.route('**/preview-api/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.endsWith('/page_content')) return route.fulfill({ json: [] });
    const row = { content_key: 'programme_posters', content_value: JSON.stringify(posters) };
    return route.fulfill({ json: [row] });
  });
  await page.goto('/');
  const feed = page.getByRole('region', { name: 'What’s on' });
  await expect(feed.getByText('Published first')).toBeVisible();
  posters = [poster('Updated in admin')];
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(feed.getByText('Updated in admin')).toBeVisible();
  posters = [{ ...posters[0], groups: ['home'], website_locations: [] }];
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(feed.getByText('Updated in admin')).toHaveCount(0);
});
