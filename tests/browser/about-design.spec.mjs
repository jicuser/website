import { test, expect } from '@playwright/test';
test.use({ screenshot: 'off' });

async function fixture(page, { people = [] } = {}) {
  const state = { errors: [], frames: [], writes: [] };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('jic-salawat-shown', '1');
    } catch {
      /* Sandboxed map and social frames have no storage. */
    }
  });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (['POST', 'PATCH'].includes(req.method()) && !path.includes('/rpc/'))
      state.writes.push(path);
    const data = path.endsWith('/team_members')
      ? people
      : path.endsWith('/rpc/get_public_form')
        ? {
            id: 'contact-form',
            slug: 'contact-us',
            title: 'Send a message',
            description: 'Contact the centre.',
            version: 1,
            enabled: true,
            schema: {
              fields: [
                { id: 'name', label: 'Your name', type: 'text', required: true },
                { id: 'email', label: 'Email address', type: 'email', required: true },
                { id: 'message', label: 'Your message', type: 'textarea', required: true },
              ],
            },
          }
        : [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return state;
}

for (const width of [320, 390, 1280]) {
  test(`About pages use compact visual layouts and preserve navigation at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width, height: 900 });
    const state = await fixture(page);
    for (const [path, selector] of [
      ['/about', '.about-overview'],
      ['/about/history', '.about-history'],
      ['/team', '.about-team'],
      ['/social-media', '.about-social'],
      ['/financial-history', '.about-finances'],
      ['/contact', '.about-contact'],
    ]) {
      await page.goto(path);
      const content = page.locator(selector);
      await expect(content).toBeVisible();
      await expect(content.getByRole('heading', { level: 1 })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (['/about', '/about/history', '/social-media'].includes(path)) {
        const photo = content.locator('.about-photo img');
        await expect
          .poll(() => photo.evaluate((img) => img.complete && img.naturalWidth > 0))
          .toBe(true);
        expect((await photo.boundingBox()).height).toBeLessThan(width < 700 ? 260 : 500);
      }
      if (path === '/about') {
        await expect(
          content.getByRole('navigation', { name: 'Explore About JIC' }).getByRole('link'),
        ).toHaveCount(4);
        expect((await content.boundingBox()).height).toBeLessThan(width < 700 ? 1700 : 1100);
      }
      if (path === '/team') {
        await expect(
          content.getByText('Profiles are not available yet.', { exact: false }),
        ).toBeVisible();
        await expect(content.getByRole('tablist')).toHaveCount(0);
      }
      if (path === '/contact') {
        await expect(content.getByLabel('Your name', { exact: false })).toBeVisible();
        await expect(
          content.getByRole('button', { name: 'Send message', exact: true }),
        ).toBeVisible();
      }
      if (path === '/financial-history') {
        await expect(content.locator('.about-financial-year')).toHaveCount(5);
        await expect(content.locator('tbody tr')).toHaveCount(5);
        await expect(content.locator('tbody tr').first()).toContainText('31 Mar 2024');
        await expect(content.locator('tbody tr').first()).toContainText('£545,030');
        expect((await content.boundingBox()).height).toBeLessThan(1150);
      }
    }
    expect(state.errors).toEqual([]);
    expect(state.writes).toEqual([]);
  });
}

test('team opens the first populated group and biographies expand without publishing drafts', async ({
  page,
}) => {
  const state = await fixture(page, {
    people: [
      {
        id: 'one',
        name: 'Published Teacher',
        role_title: 'Teacher',
        member_group: 'staff',
        published: true,
        image_url: '/optimized/jic-about-480.webp',
        bio: 'A full published biography.',
      },
      {
        id: 'two',
        name: 'Private draft',
        role_title: 'Draft',
        member_group: 'staff',
        published: false,
      },
    ],
  });
  await page.goto('/team');
  const content = page.locator('.about-team');
  await expect(content.getByRole('tab', { name: /Staff/ })).toHaveAttribute('data-state', 'active');
  await expect(
    content.getByRole('heading', { name: 'Published Teacher', exact: true }),
  ).toBeVisible();
  await expect(content.getByText('Private draft')).toHaveCount(0);
  await expect(content.getByText('A full published biography.')).toBeHidden();
  await content.getByText('About Published', { exact: true }).click();
  await expect(content.getByText('A full published biography.')).toBeVisible();
  expect(state.errors).toEqual([]);
});

test('social previews load on request and return focus to the compact channel button', async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto('/social-media');
  const content = page.locator('.about-social');
  await expect(content.locator('.about-channel')).toHaveCount(6);
  await expect(content.locator('.about-photo')).toHaveCount(1);
  await expect(page.locator('.ops-social-live iframe')).toHaveCount(0);
  const button = content.getByRole('button', { name: 'Preview Facebook', exact: true });
  await button.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('dialog').getByRole('link', { name: 'Open Facebook', exact: true }),
  ).toHaveAttribute('href', 'https://facebook.com/JICMasjid');
  await page.getByRole('button', { name: 'Close preview', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(button).toBeFocused();
  expect(state.errors).toEqual([]);
});
