import { test, expect } from '@playwright/test';

async function openHome(page, theme, width = 390) {
  await page.setViewportSize({ width, height: 844 });
  await page.addInitScript((value) => {
    localStorage.setItem('jic-theme', value);
    sessionStorage.setItem('jic-salawat-shown', '1');
  }, theme);
  await page.route('**/preview-api/**', (route) =>
    route.fulfill({ contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/');
  await expect(page.locator('.jic-home-shortcuts a')).toHaveCount(4);
}

for (const theme of ['dark', 'light']) {
  test(`one homepage photo continues behind the header and hero in ${theme} mode`, async ({
    page,
  }, testInfo) => {
    await openHome(page, theme);
    const backdrop = page.locator('.jic-page-backdrop img');
    await expect.poll(() => backdrop.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
    const surfaces = await page.evaluate(() => {
      const image = document.querySelector('.jic-page-backdrop').getBoundingClientRect();
      const header = document.querySelector('.jic-unified-header');
      const hero = document.querySelector('.jic-hero');
      return {
        photoStartsAtTop: image.top === 0 && image.left === 0 && image.width >= innerWidth,
        headerOverPhoto: header.getBoundingClientRect().top >= image.top,
        headerBackground: getComputedStyle(header).backgroundColor,
        heroBackground: getComputedStyle(hero).backgroundColor,
        heroImage: getComputedStyle(hero).backgroundImage,
        heroInk: getComputedStyle(hero).color,
        pageInk: getComputedStyle(document.querySelector('.jic-home-content')).color,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    expect(surfaces.photoStartsAtTop).toBe(true);
    expect(surfaces.headerOverPhoto).toBe(true);
    expect(surfaces.headerBackground).toBe('rgba(0, 0, 0, 0)');
    expect(surfaces.heroBackground).toBe('rgba(0, 0, 0, 0)');
    expect(surfaces.heroImage).toBe('none');
    expect(surfaces.heroInk).toBe(surfaces.pageInk);
    expect(surfaces.overflow).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath(`home-header-${theme}.png`),
      fullPage: false,
    });
    await page.goto('/services');
    await expect(page.locator('.jic-page-backdrop')).toHaveCount(0);
  });
}

for (const width of [390, 1280]) {
  test(`floating bars stay out of the reading area until scrolling up at ${width}px`, async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openHome(page, 'dark', width);
    const prayer = page.locator('#jic-prayer-dock');
    const updates = page.locator('.jic-mobile-info-banner');
    await expect(prayer).not.toHaveAttribute('aria-hidden', 'true');
    const pageGeometry = () =>
      page.evaluate(() => ({
        headerHeight: document.querySelector('.jic-unified-header').getBoundingClientRect().height,
        heroTop: document.querySelector('.jic-hero').getBoundingClientRect().top + scrollY,
      }));
    const geometry = await pageGeometry();
    await page.evaluate(() => window.scrollTo(0, 450));
    await expect(prayer).toHaveAttribute('aria-hidden', 'true');
    if (width < 768) {
      await expect(updates).toHaveAttribute('aria-hidden', 'true');
      await expect(updates).toBeHidden();
      await expect(page.getByRole('navigation', { name: 'Quick navigation' })).toBeVisible();
    }
    // This pause exceeds the old auto-return timer: reading must remain unobstructed.
    await page.waitForTimeout(1100);
    await expect(prayer).toBeHidden();
    expect(await pageGeometry()).toEqual(geometry);
    await page.evaluate(() => window.scrollTo(0, 410));
    await expect(prayer).not.toHaveAttribute('aria-hidden', 'true');
    await expect(prayer).toBeVisible();
    if (width < 768) await expect(updates).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 460));
    await expect(prayer).toHaveAttribute('aria-hidden', 'true');
    if (width < 768) {
      await page.evaluate(() => window.scrollTo(0, 410));
      await expect(prayer).not.toHaveAttribute('aria-hidden', 'true');
      await page.locator('.jic-mobile-prayer-content').click();
      await expect(page.locator('#jic-prayer-details')).toBeHidden();
    }
    await page.goto('/services');
    await expect(prayer).not.toHaveAttribute('aria-hidden', 'true');
    expect(errors).toEqual([]);
  });
}
