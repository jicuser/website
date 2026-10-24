import { test, expect } from '@playwright/test';

async function openHome(page, theme = 'dark') {
  await page.addInitScript((value) => {
    if (localStorage.getItem('jic-theme') === null) localStorage.setItem('jic-theme', value);
    if (localStorage.getItem('jic_glass_enabled') === null)
      localStorage.setItem('jic_glass_enabled', 'true');
    sessionStorage.setItem('jic-salawat-shown', '1');
  }, theme);
  await page.route('**/preview-api/**', (route) =>
    route.fulfill({ contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/');
  await expect(page.locator('.jic-home-shortcuts')).toBeVisible();
}

// The approved header replaces the old floating tools and cursive Menu control.
for (const width of [320, 390, 768, 1440]) {
  test(`aligned header and right-hand drawer fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openHome(page);
    const tools = page.getByRole('navigation', { name: 'Quick navigation' });
    await expect(tools.getByRole('link', { name: 'Search site' })).toBeVisible();
    await expect(tools.getByRole('button')).toHaveCount(2);
    expect(await tools.locator('a, button').evaluateAll((nodes) => nodes.every((node) => {
      const box = node.getBoundingClientRect();
      return box.width >= 44 && box.height >= 44;
    }))).toBe(true);
    const trigger = tools.getByRole('button', { name: 'Open navigation menu' });
    await trigger.click();
    const menu = page.getByRole('dialog', { name: 'Navigation menu' });
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  });
}

test('appearance is independently selectable, persists, and search stays available', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openHome(page, 'light');
  await page.getByRole('button', { name: 'Appearance settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Appearance settings', exact: true });
  await settings.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'glass');
  await settings.getByRole('switch', { name: 'Transparency' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'solid');
  await settings.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'solid');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'solid');
  await page.getByRole('button', { name: 'Appearance settings', exact: true }).click();
  await expect(settings.getByRole('switch', { name: 'Transparency' })).toHaveAttribute('aria-checked', 'false');
  await settings.getByRole('switch', { name: 'Transparency' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'glass');
  await settings.getByRole('button', { name: 'Close navigation menu' }).click();
  await page.getByRole('navigation', { name: 'Quick navigation' }).getByRole('link', { name: 'Search site' }).click();
  await expect(page).toHaveURL('/search');
  await expect(page.getByRole('searchbox')).toBeFocused();
  expect(errors).toEqual([]);
});

for (const theme of ['light', 'dark']) {
  test(`branded menu keeps service links, subpages and keyboard focus in ${theme} mode`, async ({ page }) => {
    await openHome(page, theme);
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Navigation menu' });
    for (const path of ['/', '/prayer-times', '/funerals', '/services/nikah', '/worship', '/education', '/services', '/projects', '/donate', '/about', '/contact']) {
      await expect(menu.locator(`.jic-drawer-row > a[href="${path}"]`)).toHaveCount(1);
    }
    await menu.getByRole('button', { name: 'Expand Community Hub subpages' }).click();
    await expect(menu.getByRole('link', { name: 'Youth', exact: true })).toBeVisible();
    await menu.getByRole('button', { name: 'Expand About JIC subpages' }).click();
    await expect(menu.getByRole('link', { name: 'Youth', exact: true })).toBeHidden();
    await expect(menu.getByRole('link', { name: 'Social Media', exact: true })).toBeVisible();
    await menu.getByRole('link', { name: 'Staff login', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(menu.getByRole('link', { name: 'Jamatia Islamic Centre home' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(menu.getByRole('link', { name: 'Staff login', exact: true })).toBeFocused();
    await menu.locator('.jic-drawer-row > a[href="/services/nikah"]').click();
    await expect(page).toHaveURL('/services/nikah');
    await expect(menu).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  });
}
