import { test, expect } from '@playwright/test';

test('mobile ticker, floating controls and timetable pill fit the visible viewport', async ({ page, browserName }, testInfo) => {
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/preview-api/**', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.goto('/');
  await expect(page.locator('.jic-mobile-prayer-summary')).toBeVisible();
  await expect(page.locator('.jic-mobile-prayer-summary')).toContainText('Today’s salah times');
  await expect(page.locator('.jic-mobile-info-banner')).toBeVisible();
  await expect(page.locator('.jic-mobile-jummah')).toHaveCount(0);
  await expect(page.locator('.jic-mobile-controls > *')).toHaveCount(4);
  await expect(page.locator('.jic-mobile-controls a[href="/portal"]')).toHaveCount(0);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/);
  for (const height of [844, 680, 760]) {
    await page.setViewportSize({ width: 390, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    const size = await page.evaluate(() => {
      const strip = document.querySelector('.jic-mobile-info-banner').getBoundingClientRect();
      const pill = document.querySelector('#jic-prayer-dock').getBoundingClientRect();
      const dock = document.querySelector('.jic-mobile-dock').getBoundingClientRect();
      const nav = document.querySelector('.jic-mobile-controls').getBoundingClientRect();
      const actions = document.querySelector('.jic-free-actions');
      return {
        top: strip.top, innerWidth, innerHeight,
        clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight,
        visualHeight: visualViewport?.height, visualWidth: visualViewport?.width, scale: visualViewport?.scale,
        stripHeight: strip.height,
        bottomGap: (visualViewport ? visualViewport.offsetTop + visualViewport.height : innerHeight) - dock.bottom,
        navInsideDock: nav.bottom <= dock.bottom, pillAboveNav: pill.bottom <= dock.top - 8,
        pillHeight: pill.height, floating: getComputedStyle(actions).position,
        unboxed: getComputedStyle(actions).backgroundColor,
        controlsBelowHeader: actions.getBoundingClientRect().top >= strip.bottom + 60,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        targets: [...document.querySelectorAll('.jic-mobile-controls > *, .jic-mobile-prayer-summary button, .jic-free-actions > :not(.jic-desktop-action), .jic-mobile-info-banner button')]
          .every((el) => el.getBoundingClientRect().height >= 44),
      };
    });
    expect(size.top).toBe(0);
    expect(size.stripHeight).toBeLessThanOrEqual(46);
    expect(Math.abs(size.bottomGap), JSON.stringify(size)).toBeLessThanOrEqual(1);
    expect(size.navInsideDock).toBe(true);
    expect(size.pillAboveNav, JSON.stringify(size)).toBe(true);
    expect(size.pillHeight).toBeLessThanOrEqual(72);
    expect(size.floating).toBe('fixed');
    expect(size.unboxed).toBe('rgba(0, 0, 0, 0)');
    expect(size.controlsBelowHeader).toBe(true);
    expect(size.overflow).toBe(false);
    expect(size.targets).toBe(true);
  }
  await page.getByRole('button', { name: 'Pause rolling updates' }).click();
  await expect(page.locator('.jic-ticker-track')).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('button', { name: 'Resume rolling updates' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mobile-ticker-timetable-pill.png') });
  await page.locator('.jic-mobile-prayer-toggle').click();
  await expect(page.locator('#jic-prayer-details')).toBeVisible();
  const bounds = await page.locator('#jic-prayer-details').evaluate((node) => {
    const pill = document.querySelector('.jic-mobile-prayer-summary').getBoundingClientRect();
    const details = node.getBoundingClientRect();
    return { abovePill: details.bottom <= pill.top + 1,
      startsBelowBanner: details.top > document.querySelector('.jic-mobile-info-banner').getBoundingClientRect().bottom };
  });
  expect(bounds).toEqual({ abovePill: true, startsBelowBanner: true });
  await page.screenshot({ path: testInfo.outputPath('mobile-timetable-expanded.png') });
  await page.keyboard.press('Escape');
  await expect(page.locator('#jic-prayer-details')).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.jic-ticker-track')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.jic-ticker-motion')).toBeHidden();
  await expect(page.locator('.jic-ticker-window')).toHaveCSS('overflow-x', 'auto');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Resume rolling updates' }).click();
  await expect(page.locator('.jic-ticker-track')).toHaveCSS('animation-name', 'jic-info-roll');
  await page.locator('.jic-free-actions .jic-theme-action').click();
  await page.screenshot({ path: testInfo.outputPath('mobile-ticker-alternate-theme.png') });
  await page.locator('.jic-bottom-menu-trigger').click();
  await expect(page.locator('#jic-site-menu a[href="/portal"]')).toBeVisible();
  await page.keyboard.press('Escape');
  if (browserName === 'chromium') {
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } });
    await expect.poll(() => page.locator('.jic-mobile-dock').evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingBottom))).toBe(34);
    const safe = await page.evaluate(() => {
      const strip = document.querySelector('.jic-mobile-info-banner');
      const dock = document.querySelector('.jic-mobile-dock').getBoundingClientRect();
      const nav = document.querySelector('.jic-mobile-controls').getBoundingClientRect();
      const button = strip.querySelector('button').getBoundingClientRect();
      return { topPadding: Number.parseFloat(getComputedStyle(strip).paddingTop), buttonBelowNotch: button.top >= 47,
        bottomPadding: dock.bottom - nav.bottom, bottomGap: innerHeight - dock.bottom };
    });
    expect(safe.topPadding).toBe(47);
    expect(safe.buttonBelowNotch).toBe(true);
    expect(safe.bottomPadding).toBe(34);
    expect(Math.abs(safe.bottomGap)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath('mobile-emulated-safe-areas.png') });
  }
});
