import { test, expect } from '@playwright/test';
test.use({ screenshot: 'off' });
const actor = {
  id: '10000000-0000-4000-8000-000000000001',
  display_name: 'Owner',
  is_owner: true,
  is_active: true,
  permissions: [],
  staff_kinds: [],
};
async function fixture(page) {
  const state = {
    content: {
      'page:/about/history': JSON.stringify({
        title: 'Original history',
        body: 'Original information',
        image: '',
      }),
    },
    writes: [],
    errors: [],
  };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname;
    const body = ['POST', 'PATCH'].includes(req.method()) ? req.postDataJSON() : null;
    let data = [];
    if (path.includes('/auth/v1/token')) {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const enc = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
      data = {
        user: {
          ...actor,
          email: 'owner@example.invalid',
          role: 'authenticated',
          aud: 'authenticated',
          user_metadata: {},
          app_metadata: {},
        },
        access_token: `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: actor.id, exp })}.test`,
        refresh_token: 'test',
        expires_in: 3600,
        expires_at: exp,
        token_type: 'bearer',
      };
    } else if (path.endsWith('/rpc/get_my_profile')) data = actor;
    else if (path.endsWith('/page_content')) {
      if (body) {
        state.writes.push(body);
        state.content[body.content_key] = body.content_value;
        data = [{ content_key: body.content_key }];
      } else if (url.searchParams.has('content_key'))
        data = {
          content_value:
            state.content[url.searchParams.get('content_key').replace(/^eq\./, '')] || '{}',
        };
      else
        data = Object.entries(state.content).map(([content_key, content_value]) => ({
          content_key,
          content_value,
        }));
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill('owner@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Local test password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.admin-toolbar')).toBeVisible();
  return state;
}

test('page drafts render in the real website preview before publishing without a dialog', async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto('/admin?section=content&page=%2Fabout%2Fhistory');
  await expect(page.getByRole('textbox', { name: 'Page heading', exact: true })).toHaveValue(
    'Original history',
  );
  await page.getByRole('textbox', { name: 'Page heading', exact: true }).fill('Our draft history');
  await page
    .getByRole('textbox', { name: 'Introduction', exact: true })
    .fill('Updated draft information.');
  await page.getByRole('button', { name: 'Live preview', exact: true }).click();
  const preview = page.frameLocator('iframe[title="Our History website preview"]');
  await expect(
    preview.getByRole('heading', { name: 'Our draft history', exact: true }),
  ).toBeVisible();
  await expect(preview.getByText('Updated draft information.', { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(0);
  expect(state.content['page:/about/history']).toContain('Original history');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit page', exact: true }).click();
  await page
    .locator('#staff-content')
    .getByRole('button', { name: 'Save page', exact: true })
    .click();
  await expect(page.getByText('Saved to the website.', { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(JSON.parse(state.content['page:/about/history']).title).toBe('Our draft history');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(state.errors).toEqual([]);
});

test('menu names and order save together and appear in public navigation', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/admin?section=menus');
  await page.getByRole('button', { name: 'Reorder Ramadan', exact: true }).click();
  await page.getByRole('button', { name: 'Move Ramadan up', exact: true }).click();
  await page.getByLabel('Learning section name', { exact: true }).fill('Learning together');
  await page
    .locator('#staff-content')
    .getByRole('button', { name: 'Save menu', exact: true })
    .click();
  await expect(page.getByText('Menu names and order saved.', { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
  const saved = JSON.parse(state.content.site_navigation);
  expect(saved.labels['/education']).toBe('Learning together');
  expect(saved.order.indexOf('/ramadan')).toBeLessThan(saved.order.indexOf('/worship'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Navigation menu', exact: true });
  await expect(menu.getByRole('link', { name: 'Learning together', exact: true })).toBeVisible();
  const names = await menu.locator('.jic-unified-menu-row > a').allTextContents();
  expect(names.indexOf('Ramadan')).toBeLessThan(names.indexOf('Adhkar, Qur’an & Janazah Guide'));
  expect(state.errors).toEqual([]);
});

for (const width of [320, 390]) {
  test(`compact menus reorder sections and pages with touch and keyboard at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const state = await fixture(page);
    await page.goto('/admin?section=menus');
    const groups = page.locator('.menu-editor__list > section');
    for (const group of await groups.all()) {
      expect((await group.boundingBox()).height).toBeLessThan(65);
    }
    await expect(page.locator('.menu-editor__pages')).toHaveCount(0);
    const handle = page.getByRole('button', { name: 'Reorder Ramadan', exact: true });
    await handle.scrollIntoViewIfNeeded();
    const source = await handle.boundingBox();
    const target = await page
      .getByRole('button', { name: 'Reorder About', exact: true })
      .boundingBox();
    const client = await page.context().newCDPSession(page);
    const x = source.x + source.width / 2;
    const y = source.y + source.height / 2;
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    });
    for (let step = 1; step <= 8; step++) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y + ((target.y + target.height / 2 - y) * step) / 8, id: 1 }],
      });
    }
    await expect(page.locator('.menu-editor .drop-before')).toHaveCount(1);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(groups.nth(1).getByLabel('Ramadan section name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Move Ramadan up', exact: true })).toHaveCount(0);
    expect(state.writes).toHaveLength(0);

    await page.getByRole('button', { name: /^Pages in About/ }).click();
    const children = page.locator('[data-menu-parent="/about"]');
    const initialPages = await children.evaluateAll((nodes) =>
      nodes.map((node) => node.dataset.menuPath),
    );
    const firstHandle = children.first().locator('.menu-editor__handle');
    await firstHandle.focus();
    await page.keyboard.press('ArrowDown');
    const reorderedPages = await children.evaluateAll((nodes) =>
      nodes.map((node) => node.dataset.menuPath),
    );
    expect(reorderedPages[1]).toBe(initialPages[0]);
    await page
      .locator('#staff-content')
      .getByRole('button', { name: 'Save menu', exact: true })
      .click();
    await expect(page.getByText('Menu names and order saved.', { exact: true })).toBeVisible();
    const saved = JSON.parse(state.content.site_navigation);
    expect(saved.order[1]).toBe('/ramadan');
    expect(saved.children['/about']).toEqual(reorderedPages);
    await page.reload();
    await expect(groups.nth(1).getByLabel('Ramadan section name')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(state.errors).toEqual([]);
    await client.detach();
  });
}

for (const theme of ['light', 'dark']) {
  test(`increased contrast keeps the ${theme} homepage and phone navigation readable`, async ({
    page,
  }) => {
    await page.addInitScript((mode) => localStorage.setItem('jic-theme', mode), theme);
    await page.emulateMedia({ contrast: 'more' });
    const state = await fixture(page);
    await page.goto('/');
    await expect(page.locator('.jic-home-prayer')).toBeVisible();
    const reading = await page.locator('.jic-home-prayer').evaluate((node) => {
      const style = getComputedStyle(node);
      const rgb = (text) => text.match(/[\d.]+/g)?.map(Number) || [];
      const luminance = (values) =>
        values
          .slice(0, 3)
          .map((value) => {
            const s = value / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
      const foreground = rgb(style.color),
        background = rgb(style.backgroundColor);
      const sorted = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return {
        foreground,
        background,
        ratio: (sorted[0] + 0.05) / (sorted[1] + 0.05),
        backdrop: style.backdropFilter,
      };
    });
    expect(reading.background[3] ?? 1).toBe(1);
    expect(reading.ratio).toBeGreaterThanOrEqual(4.5);
    expect(reading.backdrop).toBe('none');
    await page.goto('/social-media');
    await expect(page).toHaveURL(/\/about#social$/);
    await expect(
      page
        .getByRole('navigation', { name: 'On this page' })
        .getByRole('link', { name: 'Visit & contact', exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(state.errors).toEqual([]);
  });
}
