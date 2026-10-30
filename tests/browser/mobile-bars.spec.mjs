import { test, expect } from '@playwright/test';

test('mobile ticker, navigation and timetable panel fit the visible viewport', async ({
  page,
  browserName,
}, testInfo) => {
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/preview-api/**', (route) =>
    route.fulfill({ contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/prayer-times');
  await expect(page.locator('.jic-mobile-prayer-summary')).toBeVisible();
  await expect(page.locator('.jic-mobile-prayer-summary')).toContainText('Today’s prayer times');
  await expect(page.locator('.jic-mobile-info-banner')).toBeVisible();
  await expect(page.locator('.jic-mobile-jummah')).toHaveCount(0);
  const navigation = page.getByRole('navigation', { name: 'Quick navigation', exact: true });
  await expect(navigation.getByRole('link', { name: 'Search site', exact: true })).toHaveAttribute(
    'href',
    '/search',
  );
  await expect(navigation.getByRole('button', { name: 'Appearance settings' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
  await expect(navigation.locator('a[href="/portal"]')).toHaveCount(0);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    /viewport-fit=cover/,
  );
  for (const height of [844, 680, 760]) {
    await page.setViewportSize({ width: 390, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    const size = await page.evaluate(() => {
      const strip = document.querySelector('.jic-mobile-info-banner').getBoundingClientRect();
      const pill = document.querySelector('#jic-prayer-dock').getBoundingClientRect();
      const brand = document.querySelector('.jic-free-brand').getBoundingClientRect();
      const nav = document.querySelector('.jic-header-actions').getBoundingClientRect();
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
        bottomGap:
          (visualViewport ? visualViewport.offsetTop + visualViewport.height : innerHeight) -
          pill.bottom,
        controlsBesideBrand:
          nav.left >= brand.right &&
          Math.abs(nav.top + nav.height / 2 - brand.top - brand.height / 2) < 1,
        pillBelowNav: pill.top >= nav.bottom + 7,
        pillHeight: pill.height,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        targets: [
          ...document.querySelectorAll(
            '.jic-header-actions > *, .jic-mobile-prayer-content, .jic-mobile-info-banner button',
          ),
        ].every((el) => el.getBoundingClientRect().height >= 44),
      };
    });
    expect(size.top).toBe(0);
    expect(size.stripHeight).toBeLessThanOrEqual(46);
    expect(Math.abs(size.bottomGap), JSON.stringify(size)).toBeLessThanOrEqual(1);
    expect(size.controlsBesideBrand).toBe(true);
    expect(size.pillBelowNav, JSON.stringify(size)).toBe(true);
    expect(size.pillHeight).toBeLessThanOrEqual(72);
    expect(size.overflow).toBe(false);
    expect(size.targets).toBe(true);
  }
  await page.getByRole('button', { name: 'Pause rolling updates' }).click();
  await expect(page.locator('.jic-ticker-track')).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('button', { name: 'Resume rolling updates' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mobile-ticker-timetable-pill.png') });
  await page.locator('.jic-mobile-prayer-content').click();
  await expect(page).toHaveURL('/prayer-times');
  await expect(
    page.getByRole('heading', { name: "Today's Prayer Times", exact: true }),
  ).toBeVisible();
  await expect(page.locator('#jic-prayer-details')).toBeHidden();
  await expect(page.locator('.jic-mobile-prayer-summary button')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.jic-ticker-track')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.jic-ticker-motion')).toBeHidden();
  await expect(page.locator('.jic-ticker-window')).toHaveCSS('overflow-x', 'auto');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Resume rolling updates' }).click();
  await expect(page.locator('.jic-ticker-track')).toHaveCSS('animation-name', 'jic-info-roll');
  await navigation.getByRole('button', { name: 'Open navigation menu' }).click();
  const menu = page.getByRole('dialog', { name: 'Navigation menu', exact: true });
  await expect(menu).toBeVisible();
  await expect(menu.locator('a[href="/portal"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await navigation.getByRole('button', { name: 'Appearance settings' }).click();
  const appearance = page.getByRole('dialog', { name: 'Appearance settings', exact: true });
  const nextTheme =
    (await page.locator('html').getAttribute('data-theme')) === 'dark' ? 'light' : 'dark';
  await appearance
    .getByRole('button', { name: nextTheme === 'dark' ? 'Dark' : 'Light', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', nextTheme);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: testInfo.outputPath('mobile-ticker-alternate-theme.png') });
  if (browserName === 'chromium') {
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setSafeAreaInsetsOverride', {
      insets: { top: 47, bottom: 34, left: 0, right: 0 },
    });
    const safe = await page.evaluate(() => {
      const strip = document.querySelector('.jic-mobile-info-banner');
      const dock = document.querySelector('#jic-prayer-dock').getBoundingClientRect();
      const nav = document.querySelector('.jic-header-actions').getBoundingClientRect();
      const button = strip.querySelector('button').getBoundingClientRect();
      return {
        topPadding: Number.parseFloat(getComputedStyle(strip).paddingTop),
        buttonBelowNotch: button.top >= 47,
        navigationAbovePill: nav.bottom < dock.top,
        bottomGap: innerHeight - dock.bottom,
      };
    });
    expect(safe.topPadding).toBe(47);
    expect(safe.buttonBelowNotch).toBe(true);
    expect(safe.navigationAbovePill).toBe(true);
    expect(Math.abs(safe.bottomGap - 34)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath('mobile-emulated-safe-areas.png') });
  }
});
