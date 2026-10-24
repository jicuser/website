import { test, expect } from '@playwright/test';

async function openHome(page, theme, width = 390) {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.setViewportSize({ width, height: 844 });
  await page.addInitScript((value) => {
    localStorage.setItem('jic-theme', value);
    sessionStorage.setItem('jic-salawat-shown', '1');
  }, theme);
  await page.route('**/preview-api/**', (route) =>
    route.fulfill({ contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/');
  await expect(page.locator('.jic-home-shortcuts a')).toHaveCount(6);
}

for (const theme of ['dark', 'light']) {
  test(`public photo covers the viewport and continues through the page in ${theme} mode`, async ({
    page,
  }, testInfo) => {
    await openHome(page, theme, 320);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    // Finish the keyboard journey before checking the initial header geometry.
    await page.goto('/');
    await expect(page.locator('.jic-home-shortcuts a')).toHaveCount(6);
    const titleHeights = await page
      .locator('.jic-home-shortcuts strong')
      .evaluateAll((nodes) =>
        nodes.map(
          (node) =>
            node.getBoundingClientRect().height <=
            parseFloat(getComputedStyle(node).lineHeight) + 1,
        ),
      );
    expect(titleHeights.every(Boolean)).toBe(true);
    const backdrop = page.locator('.jic-page-backdrop img');
    await expect.poll(() => backdrop.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
    const surfaces = await page.evaluate(() => {
      const image = document.querySelector('.jic-page-backdrop').getBoundingClientRect();
      const header = document.querySelector('.jic-unified-header');
      const hero = document.querySelector('.jic-hero');
      return {
        photoCoversViewport: image.top === 0 && image.bottom === innerHeight,
        photoPosition: getComputedStyle(document.querySelector('.jic-page-backdrop')).position,
        contentBackground: getComputedStyle(document.querySelector('.jic-home-content'))
          .backgroundColor,
        headerBackground: getComputedStyle(header).backgroundColor,
        heroBackground: getComputedStyle(hero).backgroundColor,
        heroImage: getComputedStyle(hero).backgroundImage,
        heroInk: getComputedStyle(hero).color,
        pageInk: getComputedStyle(document.querySelector('.jic-home-content')).color,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    expect(surfaces.photoCoversViewport).toBe(true);
    expect(surfaces.photoPosition).toBe('fixed');
    expect(surfaces.contentBackground).toBe('rgba(0, 0, 0, 0)');
    expect(surfaces.headerBackground).toBe('rgba(0, 0, 0, 0)');
    expect(surfaces.heroBackground).toBe('rgba(0, 0, 0, 0)');
    expect(surfaces.heroImage).toBe('none');
    expect(surfaces.heroInk).toBe(surfaces.pageInk);
    expect(surfaces.overflow).toBe(false);
    await page.evaluate(() => scrollTo(0, 900));
    expect(
      await page.locator('.jic-page-backdrop').evaluate((node) => node.getBoundingClientRect().top),
    ).toBe(0);
    await page.screenshot({
      path: testInfo.outputPath(`home-header-${theme}.png`),
      fullPage: false,
    });
    await page.goto('/services');
    await expect(page.locator('.jic-page-backdrop')).toHaveCount(1);
    await expect(page.locator('.service-explorer-card').first()).not.toHaveCSS(
      'backdrop-filter',
      'none',
    );
    await page.evaluate(() => {
      document.documentElement.dataset.surface = 'solid';
    });
    await expect(page.locator('.service-explorer-card').first()).toHaveCSS(
      'backdrop-filter',
      'none',
    );
    await page.emulateMedia({ contrast: 'more' });
    await expect(page.locator('.service-explorer-card').first()).toHaveCSS(
      'background-color',
      theme === 'dark' ? 'rgb(17, 42, 67)' : 'rgb(255, 254, 250)',
    );
    await page.goto('/youth');
    await expect(page.locator('.jic-youth-page')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.locator('.jic-page-backdrop')).toHaveCount(1);
    await page.goto('/prayer-times');
    const guidance = page.locator('.jic-prayer-visit details');
    await expect(guidance).not.toHaveAttribute('open');
    await expect(page.getByRole('link', { name: 'Salah guide', exact: true })).toBeVisible();
    await guidance.locator('summary').click();
    await expect(guidance).toContainText('step-free access');
    await expect(guidance.getByRole('heading', { name: 'General Guidelines' })).toBeVisible();
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
    if (width < 768) await expect(prayer).toHaveAttribute('aria-hidden', 'true');
    else await expect(prayer).not.toHaveAttribute('aria-hidden', 'true');
    const pageGeometry = () =>
      page.evaluate(() => ({
        headerHeight: document.querySelector('.jic-unified-header').getBoundingClientRect().height,
        heroTop: document.querySelector('.jic-hero').getBoundingClientRect().top + scrollY,
      }));
    const geometry = await pageGeometry();
    await page.evaluate((y) => window.scrollTo(0, y), width < 768 ? 900 : 450);
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
    await page.evaluate((y) => window.scrollTo(0, y), width < 768 ? 850 : 410);
    await expect(prayer).not.toHaveAttribute('aria-hidden', 'true');
    await expect(prayer).toBeVisible();
    if (width < 768) await expect(updates).toBeVisible();
    await page.evaluate((y) => window.scrollTo(0, y), width < 768 ? 920 : 460);
    await expect(prayer).toHaveAttribute('aria-hidden', 'true');
    if (width < 768) {
      await page.evaluate((y) => window.scrollTo(0, y), width < 768 ? 850 : 410);
      await expect(prayer).not.toHaveAttribute('aria-hidden', 'true');
      await page.locator('.jic-mobile-prayer-content').click();
      await expect(page).toHaveURL('/prayer-times');
      await expect(page.locator('#jic-prayer-details')).toBeHidden();
    }
    await page.goto('/services');
    await expect(prayer).not.toHaveAttribute('aria-hidden', 'true');
    expect(errors).toEqual([]);
  });
}
