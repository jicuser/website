import { test, expect } from '@playwright/test';

async function setup(page, theme, friday = false) {
  await page.clock.install({
    time: new Date(friday ? '2026-10-16T10:00:00Z' : '2026-10-15T10:00:00Z'),
  });
  await page.addInitScript((value) => {
    localStorage.setItem('jic-theme', value);
    sessionStorage.setItem('jic-salawat-shown', '1');
  }, theme);
  await page.route('**/preview-api/**', (route) => {
    const url = new URL(route.request().url());
    const rows = [15, 16].map((day) => ({
      d_date: `2026-10-${day}`,
      fajr_begins: '06:15',
      fajr_jamah: '07:00',
      sunrise: '07:38',
      zuhr_begins: '12:58',
      zuhr_jamah: '13:45',
      asr_begins: '16:14',
      asr_jamah: '16:45',
      maghrib_begins: '18:09',
      maghrib_jamah: '18:09',
      isha_begins: '19:21',
      isha_jamah: '20:00',
      jummah_1_jamah: '13:20',
    }));
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(url.pathname.endsWith('/prayer_times') ? rows : []),
    });
  });
  await page.goto('/');
  await expect(page.locator('.jic-mini-prayer-start').nth(1)).toHaveText('6:15am');
}

for (const width of [320, 390]) {
  for (const theme of ['light', 'dark']) {
    test(`start and jama’ah rows align at ${width}px in ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await setup(page, theme);
      const pill = page.locator('.jic-mobile-prayer-content');
      await expect(pill.locator('.jic-mini-prayer-start')).toHaveText([
        'Start',
        '6:15am',
        '12:58pm',
        '4:14pm',
        '6:09pm',
        '7:21pm',
      ]);
      await expect(pill.locator('.jic-mini-prayer-time')).toHaveText([
        'Jama’ah',
        '7:00am',
        '1:45pm',
        '4:45pm',
        '6:09pm',
        '8:00pm',
      ]);
      await expect(pill).toHaveAccessibleName(/Fajr: start 6:15 AM, jama’ah 7:00 AM/);
      const layout = await pill.evaluate((node) => {
        const cells = [...node.querySelectorAll('.jic-mini-prayer')];
        return {
          height: node.getBoundingClientRect().height,
          rows: ['.jic-mini-prayer-start', '.jic-mini-prayer-time'].map(
            (selector) =>
              new Set(cells.map((cell) => cell.querySelector(selector).getBoundingClientRect().top))
                .size,
          ),
          fits: cells.every((cell) =>
            [...cell.children].every((child) => child.scrollWidth <= cell.clientWidth + 1),
          ),
        };
      });
      expect(layout.rows).toEqual([1, 1]);
      expect(layout.fits).toBe(true);
      expect(layout.height).toBeLessThanOrEqual(76);
      const nav = page.getByRole('navigation', { name: 'Quick navigation' });
      await expect(nav.getByRole('button')).toHaveText(['Home']);
      await expect(pill.locator('button, [aria-expanded]')).toHaveCount(0);
      await expect(pill).toContainText('Today’s prayer times');
      await expect(page.locator('#jic-prayer-dock')).toHaveCount(0);
      await pill.click();
      await expect(page).toHaveURL('/prayer-times');
      await expect(
        page.getByRole('heading', { name: "Today's Prayer Times", exact: true }),
      ).toBeVisible();
      await expect(page.locator('#jic-prayer-details')).toBeHidden();
      const home = nav.getByRole('button', { name: 'Home' });
      await home.click();
      await expect(page).toHaveURL('/');
      await expect(page.locator('.jic-hero')).toBeVisible();
      await expect(home).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(home).toHaveCSS('border-top-width', '0px');
      await expect(home).toHaveCSS('box-shadow', 'none');
      expect((await home.boundingBox()).y + (await home.boundingBox()).height).toBeLessThan(
        (await pill.boundingBox()).y,
      );
      const documentPosition = () =>
        home.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return {
            x: rect.x + scrollX,
            y: rect.y + scrollY,
            width: rect.width,
            height: rect.height,
          };
        });
      const before = await documentPosition();
      await page.evaluate(() => scrollTo(0, 500));
      await expect(page.locator('html')).toHaveAttribute('data-prayer-dock-hidden', 'true');
      // Home stays in the branding row; hiding the dock must not move page content.
      expect(await documentPosition()).toEqual(before);
      await page.evaluate(() => scrollTo(0, 400));
      await expect(page.locator('html')).not.toHaveAttribute('data-prayer-dock-hidden', 'true');
      await nav.getByRole('button', { name: 'Home' }).click();
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      await page.screenshot({ path: testInfo.outputPath(`prayer-pill-${theme}-${width}.png`) });
      await page.goto('/team');
      await nav.getByRole('button', { name: 'Home' }).click();
      await expect(page).toHaveURL('/');
    });
  }
}

test('Friday keeps the Dhuhr start alongside the first Jummah congregation', async ({ page }) => {
  await setup(page, 'dark', true);
  const prayer = page.locator('.jic-mini-prayer').filter({ hasText: 'Jummah' });
  await expect(prayer.locator('.jic-mini-prayer-start')).toHaveText('12:58pm');
  await expect(prayer.locator('.jic-mini-prayer-time')).toHaveText('1:20pm');
});
