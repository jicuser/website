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

for (const width of [320, 390, 1280]) {
  test(`floating icons stay reachable while scrolling at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await openHome(page);
    const tools = page.getByRole('navigation', { name: 'Page controls' });
    await expect(tools).toBeVisible();
    await expect(tools.getByRole('link')).toHaveCount(1);
    await expect(tools.getByRole('button')).toHaveCount(2);
    const initial = await tools.boundingBox();
    expect(initial.width).toBeLessThanOrEqual(154);
    expect(initial.height).toBeLessThanOrEqual(54);
    const targets = await tools.locator('a, button').evaluateAll((controls) =>
      controls.map((control) => {
        const box = control.getBoundingClientRect();
        return box.width >= 44 && box.height >= 44;
      }),
    );
    expect(targets.every(Boolean)).toBe(true);
    await page.evaluate(() => scrollTo(0, 650));
    await expect(page.locator('#jic-prayer-dock')).toHaveAttribute('aria-hidden', 'true');
    await expect(tools).toBeVisible();
    await expect.poll(async () => (await tools.boundingBox()).y).toBeLessThan(100);
    let box = await tools.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.evaluate(() => scrollTo(0, 600));
    await expect(page.locator('#jic-prayer-dock')).not.toHaveAttribute('aria-hidden', 'true');
    await expect(tools).toBeVisible();
    box = await tools.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThan(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
      false,
    );
    if (width === 390)
      await page.screenshot({ path: testInfo.outputPath('floating-icons-mobile.png') });
  });
}

test('appearance changes show brief labels, retain preferences, and search is ready to type', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openHome(page, 'light');
  const tools = page.getByRole('navigation', { name: 'Page controls' });
  await tools.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(tools.getByRole('status')).toHaveText('Dark mode');
  await expect(tools.getByRole('status')).toBeHidden({ timeout: 4000 });
  await tools.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(tools.getByRole('status')).toHaveText('Light mode');
  await tools.getByRole('button', { name: 'Turn transparency off' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'solid');
  await expect(tools.getByRole('button', { name: 'Turn transparency on' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(tools.getByRole('status')).toHaveText('Transparency off');
  await expect(tools).toHaveCSS('backdrop-filter', 'none');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'solid');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await tools.getByRole('button', { name: 'Turn transparency on' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'glass');
  await expect(tools.getByRole('status')).toHaveText('Transparency on');
  const material = await tools.evaluate((node) => ({
    background: getComputedStyle(node).backgroundColor,
    blur: getComputedStyle(node).backdropFilter,
  }));
  expect(material.blur).toContain('blur');
  expect(material.background).toMatch(/rgba\(|\/ 0\./);
  await page.screenshot({ path: testInfo.outputPath('transparency-hint-mobile.png') });
  await tools.getByRole('link', { name: 'Search site' }).click();
  await expect(page).toHaveURL('/search');
  await expect(page.getByRole('searchbox')).toBeFocused();
  await expect(tools.getByRole('status')).toHaveText('Search');
  await page.getByRole('searchbox').fill('volunteer');
  await expect(page.locator('.jic-search-results a[href="/get-involved/volunteer"]')).toBeVisible();
  expect(errors).toEqual([]);
});
