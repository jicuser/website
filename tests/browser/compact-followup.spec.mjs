import { test, expect } from '@playwright/test';
async function prepare(page) {
  await page.addInitScript(() => { sessionStorage.setItem('jic-salawat-shown', '1'); localStorage.setItem('jic-theme', 'dark'); });
  await page.route('**/*', r => ['127.0.0.1', 'localhost'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
  await page.route('**/preview-api/**', r => r.fulfill({ contentType: 'application/json', body: '[]' }));
}
test('turning off meaning and transliteration stays off after reopening a reader', async ({ page }) => {
  await prepare(page);
  await page.goto('/worship/daily-duas');
  await page.locator('.worship-preferences > summary').tap();
  await page.getByLabel('Show meaning', { exact: true }).tap();
  await page.getByLabel('Show transliteration', { exact: true }).tap();
  await expect(page.locator('.worship-meaning, .worship-transliteration')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.worship-recitation-arabic').first()).toBeVisible();
  await expect(page.locator('.worship-meaning, .worship-transliteration')).toHaveCount(0);
  await page.goto('/worship/janazah-guide');
  await expect(page.locator('.worship-recitation-arabic').first()).toBeVisible();
  await expect(page.locator('.worship-meaning, .worship-transliteration')).toHaveCount(0);
  await page.locator('.worship-preferences > summary').tap();
  await page.getByLabel('Show meaning', { exact: true }).tap();
  await expect(page.locator('.worship-meaning').first()).toBeVisible();
  await expect(page.locator('.worship-transliteration')).toHaveCount(0);
});
test('Hub has one service chooser and a uniform search surface', async ({ page }) => {
  await prepare(page);
  await page.goto('/services');
  await expect(page.locator('.community-hub-card')).toHaveCount(8);
  await expect(page.locator('.guidance-panel')).toHaveCount(0);
  await expect(page.getByText('Find your place in the community', { exact: true })).toHaveCount(0);
  const search = page.getByRole('searchbox', { name: 'Search services' });
  expect(await search.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await search.fill('nikah');
  await expect(page.locator('.community-hub-results a[href="/services/nikah"]')).toBeVisible();
});
test('menu has six primary destinations and one compact Appearance action', async ({ page }) => {
  await prepare(page);
  await page.goto('/services');
  await page.getByRole('button', { name: 'Open navigation menu', exact: true }).tap();
  const menu = page.getByRole('dialog', { name: 'Navigation menu' });
  await expect(menu.locator('.jic-drawer-row > a')).toHaveText(['Home', 'Salah timetable', 'Community Hub', 'About', 'Donate', 'Contact Us']);
  await menu.getByRole('button', { name: 'Appearance', exact: true }).tap();
  await expect(page.getByRole('dialog', { name: 'Appearance settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Light', exact: true })).toBeVisible();
});
