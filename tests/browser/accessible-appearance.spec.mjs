import { test, expect } from '@playwright/test';

for (const theme of ['light', 'dark']) {
  test(`${theme} high contrast uses paired opaque reading surfaces and keeps labelled menu controls`, async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await page.addInitScript((value) => {
      localStorage.setItem('jic-theme', value);
      sessionStorage.setItem('jic-salawat-shown', '1');
    }, theme);
    await page.route('**/preview-api/**', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }));
    await page.goto('/');
    const prayer = page.locator('.jic-home-prayer');
    await expect(prayer).toBeVisible();
    const surface = theme === 'dark' ? 'rgb(17, 42, 67)' : 'rgb(255, 254, 250)';
    const ink = theme === 'dark' ? 'rgb(244, 246, 250)' : 'rgb(8, 18, 34)';
    await expect(prayer).toHaveCSS('background-color', surface);
    await expect(prayer).toHaveCSS('color', ink);
    await expect(prayer).toHaveCSS('backdrop-filter', 'none');
    await expect(page.locator('.jic-hero h1')).toHaveCSS('color', ink);
    const photoVeil = await page.locator('.jic-page-backdrop').evaluate((node) => getComputedStyle(node, '::after').backgroundColor);
    expect(photoVeil).toBe(theme === 'dark' ? 'rgb(8, 15, 29)' : 'rgb(249, 247, 241)');
    await page.evaluate(() => scrollTo(0, 600));
    await expect(page.locator('html')).toHaveAttribute('data-prayer-dock-hidden', 'true');
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.locator('.jic-mobile-info-banner')).not.toHaveAttribute('aria-hidden', 'true');
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Navigation menu' });
    await expect(menu.getByRole('button', { name: 'Light', exact: true })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Dark', exact: true })).toBeVisible();
    await expect(menu.getByRole('switch', { name: 'Transparency' })).toBeVisible();
    await expect(menu).toHaveCSS('background-color', surface);
    await expect(menu).toHaveCSS('backdrop-filter', 'none');
  });
}
