import { test, expect } from '@playwright/test';

async function openPublic(page, theme, path) {
  await page.addInitScript((value) => {
    localStorage.setItem('jic-theme', value);
    sessionStorage.setItem('jic-salawat-shown', '1');
  }, theme);
  await page.route('**/preview-api/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: '[]',
    }),
  );
  await page.goto(path);
}

async function expectReadableSelection(control) {
  await expect(control).toHaveAttribute('aria-pressed', 'true');
  const material = await control.evaluate((node) => {
    const style = getComputedStyle(node);
    const rgb = (value) => value.match(/[\d.]+/g).map(Number);
    const luminance = (values) =>
      values
        .slice(0, 3)
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const background = rgb(style.backgroundColor);
    const levels = [luminance(rgb(style.color)), luminance(background)].sort((a, b) => b - a);
    return {
      contrast: (levels[0] + 0.05) / (levels[1] + 0.05),
      opacity: background[3] ?? 1,
      sheen: style.backgroundImage,
    };
  });
  expect(material.sheen).toBe('none');
  expect(material.opacity).toBe(1);
  expect(material.contrast).toBeGreaterThanOrEqual(4.5);
}

for (const theme of ['light', 'dark']) {
  test(`${theme} giving and service controls keep readable selected states`, async ({ page }) => {
    await openPublic(page, theme, '/donate');
    const action = page.getByRole('button', { name: 'One off', exact: true });
    await expectReadableSelection(action);
    const monthly = page.getByRole('button', { name: 'Monthly', exact: true });
    await monthly.click();
    await expect(action).toHaveAttribute('aria-pressed', 'false');
    await expectReadableSelection(monthly);
    await page.goto('/services');
    await expect(page.getByRole('heading', { name: 'Community Hub' })).toBeVisible();
    const filters = page.getByRole('group', { name: 'Filter services' });
    const allServices = filters.getByRole('button', { name: 'All services', exact: true });
    await expectReadableSelection(allServices);
    const choice = filters.getByRole('button', { name: 'Learning', exact: true });
    await choice.click();
    await expect(allServices).toHaveAttribute('aria-pressed', 'false');
    await expectReadableSelection(choice);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
      false,
    );
  });
}

test('project navigation has one overview and Giving has its own location', async ({ page }) => {
  await openPublic(page, 'dark', '/donate');
  const breadcrumb = page.getByRole('navigation', { name: 'Current section' });
  await expect(breadcrumb).toContainText('Giving');
  await expect(breadcrumb).not.toContainText('Our Masjid Project');
  await expect(page.locator('.ops-giving-hero .ops-actions a')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Choose your donation' })).toBeVisible();
  await page.goto('/projects');
  const tabs = page.locator('.jic-unified-subnav');
  await expect(tabs.locator('a[href="/projects/masjid-extension"]')).toHaveCount(0);
  await expect(tabs.locator('a[href="/projects"]')).toHaveCount(1);
});

test('solid appearance keeps hero surfaces opaque', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jic_glass_enabled', 'false'));
  await openPublic(page, 'light', '/');
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'solid');
  const prayer = page.locator('.jic-home-prayer');
  await expect(prayer).toBeVisible();
  const surface = await prayer.evaluate((node) => ({
    background: getComputedStyle(node).backgroundColor,
    blur: getComputedStyle(node).backdropFilter,
  }));
  expect(surface.background).toMatch(/^rgb\(/);
  expect(surface.blur).toBe('none');
});

test('saved home card photos retain their dark overlay and readable text', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('jic-theme', 'light');
    sessionStorage.setItem('jic-salawat-shown', '1');
  });
  await page.route('**/preview-api/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: route.request().url().includes('/page_content')
        ? JSON.stringify([
            {
              content_key: 'home_tiles',
              content_value: JSON.stringify([
                { key: 'madrassah', image: '/optimized/jic-aerial-sunset.webp' },
              ]),
            },
          ])
        : '[]',
    }),
  );
  await page.goto('/');
  const card = page
    .getByRole('navigation', { name: 'Services and learning', exact: true })
    .getByRole('link', { name: 'Madrassah', exact: true });
  await expect(card).toBeVisible();
  const material = await card.evaluate((node) => ({
    background: getComputedStyle(node).backgroundImage,
    colour: getComputedStyle(node).color,
  }));
  expect(material.background).toContain('jic-aerial-sunset.webp');
  expect(material.background).toContain('linear-gradient');
  expect(material.colour).toBe('rgb(244, 246, 250)');
});
