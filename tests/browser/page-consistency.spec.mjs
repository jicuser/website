import { test, expect } from '@playwright/test';

const routes = [
  '/',
  '/about',
  '/team',
  '/contact',
  '/education',
  '/education/courses',
  '/madrassah',
  '/madrassah/classes-courses',
  '/youth',
  '/worship',
  '/worship/daily-duas',
  '/worship/prayer-guide',
  '/worship/janazah-guide',
  '/services',
  '/services/support',
  '/services/marriage-family',
  '/services/skills-careers',
  '/services/nikah',
  '/funerals',
  '/services/hall-booking',
  '/get-involved',
  '/donate',
  '/fundraise',
  '/ramadan',
  '/ramadan/iftar',
  '/projects',
  '/events',
  '/prayer-times',
  '/prayer-times/monthly',
  '/privacy',
  '/financial-history',
];
const screenshots = new Set([
  '/services/skills-careers',
  '/services/support',
  '/madrassah',
  '/youth',
  '/donate',
  '/worship/daily-duas',
  '/ramadan/iftar',
  '/services',
  '/about',
  '/projects',
]);

for (const theme of ['light', 'dark']) {
  for (const width of [320, 390, 1280]) {
    test(`public page families keep readable hierarchy in ${theme} at ${width}px`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript((value) => {
        try {
          localStorage.setItem('jic-theme', value);
          sessionStorage.setItem('jic-salawat-shown', '1');
        } catch {
          /* Cross-origin map frames do not share the test site's storage. */
        }
      }, theme);
      await page.route('**/*', (route) =>
        ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
          ? route.continue()
          : route.abort(),
      );
      await page.route('**/preview-api/**', (route) =>
        route.fulfill({
          contentType: 'application/json',
          body: route.request().url().includes('/rpc/get_public_form') ? 'null' : '[]',
        }),
      );
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      for (const path of routes) {
        await page.goto(path);
        const heading = page.locator('#main-content h1').first();
        await expect(heading, path).toBeVisible({ timeout: 15000 });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          `${path}: horizontal overflow`,
        ).toBe(true);
        if (path !== '/') {
          await expect(page.locator('.jic-page-backdrop')).toHaveCount(0);
          const title = await heading.evaluate((node) => ({
            fontSize: parseFloat(getComputedStyle(node).fontSize),
            fits: node.scrollWidth <= node.clientWidth + 1,
          }));
          // The venue and funeral heroes have their own bounded display typography.
          const maximumTitleSize =
            path === '/services/nikah'
              ? width < 768
                ? 40
                : 64
              : path === '/funerals' && width >= 768
                ? 52
                : 36;
          expect(title.fontSize, path).toBeLessThanOrEqual(maximumTitleSize);
          expect(title.fits, `${path}: heading fits its content column`).toBe(true);
        }
        if (path.startsWith('/worship/')) {
          await expect(page.locator('#jic-prayer-dock')).toBeHidden();
          await expect(page.locator('.jic-daily-reminder')).toHaveCount(0);
        }
        if (width === 390 && screenshots.has(path)) {
          await page
            .locator('#main-content img')
            .evaluateAll((images) =>
              Promise.all(
                images
                  .filter((image) => image.loading !== 'lazy')
                  .map((image) => image.decode().catch(() => null)),
              ),
            );
          await page.screenshot({
            path: testInfo.outputPath(`${path.replaceAll('/', '-')}.png`),
            fullPage: true,
            animations: 'disabled',
          });
        }
      }
      expect(errors).toEqual([]);
    });
  }
}
