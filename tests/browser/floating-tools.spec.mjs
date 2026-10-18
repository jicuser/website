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

async function expectCenteredHint(tools) {
  const result = await tools.evaluate((node) => {
    const hint = node.querySelector('.jic-floating-hint:not([hidden])');
    const label = hint.getBoundingClientRect();
    const icon = hint.parentElement.querySelector('a, button').getBoundingClientRect();
    return {
      offset: Math.abs(label.x + label.width / 2 - icon.x - icon.width / 2),
      below: label.y >= icon.bottom,
      fits: label.x >= 0 && label.right <= innerWidth,
      background: getComputedStyle(hint).backgroundColor,
    };
  });
  expect(result.offset).toBeLessThan(1);
  expect(result.below).toBe(true);
  expect(result.fits).toBe(true);
  expect(result.background).not.toBe('rgba(0, 0, 0, 0)');
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
    await expect.poll(async () => (await tools.boundingBox()).y).toBe(initial.y);
    let box = await tools.boundingBox();
    expect(box.y).toBe(initial.y);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.evaluate(() => scrollTo(0, 600));
    await expect(page.locator('#jic-prayer-dock')).not.toHaveAttribute('aria-hidden', 'true');
    await expect(tools).toBeVisible();
    box = await tools.boundingBox();
    expect(box.y).toBe(initial.y);
    expect(box.y + box.height).toBeLessThan(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
      false,
    );
    for (const route of ['/team', '/donate', '/prayer-times/reminders']) {
      await page.goto(route);
      await expect(tools).toBeVisible();
      await expect.poll(async () => (await tools.boundingBox()).y).toBe(initial.y);
      expect((await tools.boundingBox()).x).toBe(initial.x);
      const brand = await page.locator('.jic-free-nav-row').boundingBox();
      expect(brand.y).toBeGreaterThanOrEqual(initial.y + initial.height);
    }
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
  await expectCenteredHint(tools);
  await expect(tools.getByRole('status')).toBeHidden({ timeout: 4000 });
  await tools.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(tools.getByRole('status')).toHaveText('Light mode');
  await expectCenteredHint(tools);
  await tools.getByRole('button', { name: 'Turn transparency off' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'solid');
  await expect(tools.getByRole('button', { name: 'Turn transparency on' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(tools.getByRole('status')).toHaveText('Transparency off');
  await expectCenteredHint(tools);
  await expect(tools).toHaveCSS('backdrop-filter', 'none');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'solid');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await tools.getByRole('button', { name: 'Turn transparency on' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'glass');
  await expect(tools.getByRole('status')).toHaveText('Transparency on');
  await expectCenteredHint(tools);
  const material = await tools.evaluate((node) => ({
    background: getComputedStyle(node).backgroundColor,
    blur: getComputedStyle(node).backdropFilter,
  }));
  expect(material.blur).toBe('none');
  expect(material.background).toBe('rgba(0, 0, 0, 0)');
  await expect(tools).toHaveCSS('box-shadow', 'none');
  await expect(tools).toHaveCSS('border-top-width', '0px');
  await page.screenshot({ path: testInfo.outputPath('transparency-hint-mobile.png') });
  await tools.getByRole('link', { name: 'Search site' }).click();
  await expect(page).toHaveURL('/search');
  await expect(page.getByRole('searchbox')).toBeFocused();
  await expect(tools.getByRole('status')).toHaveText('Search');
  await expectCenteredHint(tools);
  await page.getByRole('searchbox').fill('volunteer');
  await expect(page.locator('.jic-search-results a[href="/get-involved/volunteer"]')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const theme of ['light', 'dark']) {
  test(`compact menu groups related destinations in ${theme} mode`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHome(page, theme);
    await page.locator('.jic-bottom-menu-trigger').click();
    const menu = page.getByRole('dialog', { name: 'Navigation menu' });
    await expect(menu.locator('.jic-unified-menu-row > a')).toHaveText([
      'Home',
      'About',
      'Prayer Times',
      'Faith & practice',
      'Services',
      'Learning',
      'Get involved',
    ]);
    await expect(menu.locator('.jic-menu-account')).toBeVisible();
    const actions = menu.getByRole('navigation', { name: 'Quick actions' });
    await expect(actions.locator('a, button')).toHaveCount(4);
    await expect(actions.getByRole('link', { name: 'Staff login', exact: true })).toHaveAttribute(
      'href',
      '/admin/login',
    );
    const tops = await actions
      .locator('a, button')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
    expect(new Set(tops).size).toBe(1);
    const surfaces = await actions
      .locator('a, button')
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).background));
    expect(new Set(surfaces).size).toBe(1);
    await expect(menu).toHaveCSS('backdrop-filter', /blur/);
    const tint = await menu.evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(tint).toMatch(/rgba\(|\/ 0\./);
    await menu.getByRole('button', { name: 'Expand Services subpages' }).click();
    await expect(menu.getByRole('link', { name: 'Certificates', exact: true })).toHaveCount(0);
    await menu.getByRole('button', { name: 'Collapse Services subpages' }).click();
    const donate = menu.getByRole('button', { name: 'Donate', exact: true });
    await expect(donate).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`compact-menu-${theme}.png`) });
    await menu.getByRole('button', { name: 'Expand Learning subpages' }).click();
    await expect(menu.getByRole('link', { name: 'Madrassah', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Youth', exact: true })).toBeVisible();
    await menu.getByRole('button', { name: 'Expand About subpages' }).click();
    await expect(menu.getByRole('link', { name: 'Youth', exact: true })).toBeHidden();
    await expect(menu.getByRole('link', { name: 'Social Media', exact: true })).toBeVisible();
    await menu.getByRole('link', { name: 'Our Masjid Project', exact: true }).click();
    await expect(page).toHaveURL('/projects');
    await expect(menu).toBeHidden();
    await page.getByRole('button', { name: 'Turn transparency off' }).click();
    await page.locator('.jic-bottom-menu-trigger').click();
    await expect(menu).toHaveCSS('backdrop-filter', 'none');
    await expect(menu).toHaveCSS(
      'background-color',
      theme === 'dark' ? 'rgb(17, 42, 67)' : 'rgb(255, 254, 250)',
    );
  });
}
