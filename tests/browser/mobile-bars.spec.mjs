import { test, expect } from '@playwright/test';

test('mobile prayer strip and bottom bar fit the visible viewport', async ({ page, browserName }, testInfo) => {
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/preview-api/**', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.goto('/');
  await expect(page.locator('.jic-mobile-prayer-summary')).toBeVisible();
  await expect(page.locator('.jic-mobile-jummah')).toContainText('Jummah 1');
  await expect(page.locator('.jic-mobile-jummah')).toContainText('Jummah 2');
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/);
  for (const height of [844, 680, 760]) {
    await page.setViewportSize({ width: 390, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    const size = await page.evaluate(() => {
      const strip = document.querySelector('.jic-mobile-prayer-summary').getBoundingClientRect();
      const dock = document.querySelector('.jic-mobile-dock').getBoundingClientRect();
      const nav = document.querySelector('.jic-mobile-controls').getBoundingClientRect();
      return {
        top: strip.top,
        innerWidth,
        innerHeight,
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        visualHeight: visualViewport?.height,
        visualWidth: visualViewport?.width,
        scale: visualViewport?.scale,
        stripHeight: strip.height,
        bottomGap: (visualViewport ? visualViewport.offsetTop + visualViewport.height : innerHeight) - dock.bottom,
        navInsideDock: nav.bottom <= dock.bottom,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        targets: [...document.querySelectorAll('.jic-mobile-controls > *, .jic-mobile-prayer-summary button')]
          .every((el) => el.getBoundingClientRect().height >= 44),
      };
    });
    expect(size.top).toBe(0);
    expect(size.stripHeight).toBeLessThanOrEqual(46);
    expect(Math.abs(size.bottomGap), JSON.stringify(size)).toBeLessThanOrEqual(1);
    expect(size.navInsideDock).toBe(true);
    expect(size.overflow).toBe(false);
    expect(size.targets).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('mobile-top-strip-bottom-jummah.png') });
  await page.getByRole('navigation', { name: 'Quick navigation' })
    .getByRole('button', { name: 'Prayer times', exact: true }).click();
  await expect(page.locator('#jic-prayer-details')).toBeVisible();
  const bounds = await page.locator('#jic-prayer-details').evaluate((node) => {
    const strip = document.querySelector('.jic-mobile-prayer-summary').getBoundingClientRect();
    const details = node.getBoundingClientRect();
    return { startsBelow: details.top >= strip.bottom, endsAboveBottom: details.bottom < document.querySelector('.jic-mobile-dock').getBoundingClientRect().top };
  });
  expect(bounds).toEqual({ startsBelow: true, endsAboveBottom: true });
  if (browserName === 'chromium') {
    // Chromium can emulate non-zero CSS safe areas; this is not physical iOS testing.
    await page.keyboard.press('Escape');
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setSafeAreaInsetsOverride', {
      insets: { top: 47, bottom: 34, left: 0, right: 0 },
    });
    await expect.poll(() => page.locator('.jic-mobile-dock').evaluate((node) =>
      Number.parseFloat(getComputedStyle(node).paddingBottom))).toBe(34);
    const safe = await page.evaluate(() => {
      const strip = document.querySelector('.jic-mobile-prayer-summary');
      const dock = document.querySelector('.jic-mobile-dock').getBoundingClientRect();
      const nav = document.querySelector('.jic-mobile-controls').getBoundingClientRect();
      const button = strip.querySelector('button').getBoundingClientRect();
      return {
        topPadding: Number.parseFloat(getComputedStyle(strip).paddingTop),
        buttonBelowNotch: button.top >= 47,
        bottomPadding: dock.bottom - nav.bottom,
        bottomGap: innerHeight - dock.bottom,
      };
    });
    expect(safe.topPadding).toBe(47);
    expect(safe.buttonBelowNotch).toBe(true);
    expect(safe.bottomPadding).toBe(34);
    expect(Math.abs(safe.bottomGap)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath('mobile-emulated-safe-areas.png') });
  }
});
