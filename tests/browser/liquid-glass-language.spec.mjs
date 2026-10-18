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

for (const theme of ['light', 'dark']) {
  test(`${theme} giving and service controls share the navigation glass material`, async ({
    page,
  }) => {
    await openPublic(page, theme, '/donate');
    const material = (node) => {
      const style = getComputedStyle(node);
      return {
        background: style.backgroundColor,
        sheen: style.backgroundImage,
        colour: style.color,
      };
    };
    const action = page.getByRole('link', { name: 'Make a donation', exact: true });
    await expect(action).toBeVisible();
    const navigation = await page.locator('.jic-unified-subnav-link').first().evaluate(material);
    expect(await action.evaluate(material)).toEqual(navigation);
    expect(navigation.sheen).toContain('linear-gradient');
    await page.goto('/services');
    await expect(
      page.getByRole('heading', { name: 'Faith, learning & life together.' }),
    ).toBeVisible();
    const choice = page
      .getByRole('group', { name: 'Filter services' })
      .getByRole('button', { name: 'Learning' });
    await choice.click();
    expect((await choice.evaluate(material)).sheen).toContain('linear-gradient');
    expect((await choice.evaluate(material)).colour).toBe(navigation.colour);
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
  await expect(page.locator('.ops-giving-hero .ops-actions a')).toHaveCount(1);
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
                { key: 'projects', image: '/optimized/jic-aerial-sunset.webp' },
              ]),
            },
          ])
        : '[]',
    }),
  );
  await page.goto('/');
  const card = page.locator('.jic-home-destination.has-image');
  await expect(card).toBeVisible();
  const material = await card.evaluate((node) => ({
    background: getComputedStyle(node).backgroundImage,
    colour: getComputedStyle(node).color,
  }));
  expect(material.background).toContain('jic-aerial-sunset.webp');
  expect(material.background).toContain('linear-gradient');
  expect(material.colour).toBe('rgb(244, 246, 250)');
});
