import { test, expect } from '@playwright/test';
test.use({ screenshot: 'off' });

async function fixture(page, { people = [], content = {}, sections = [], addedPages = [] } = {}) {
  const state = { errors: [], reads: [], writes: [] };
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
      url = new URL(req.url()),
      path = url.pathname;
    state.reads.push(path);
    if (['POST', 'PATCH'].includes(req.method()) && !path.includes('/rpc/'))
      state.writes.push(path);
    const data = path.endsWith('/rpc/list_site_pages')
      ? addedPages
      : path.endsWith('/page_content')
        ? Object.entries(content).map(([content_key, content_value]) => ({
            content_key,
            content_value,
          }))
        : path.endsWith('/page_sections')
          ? sections.filter(
              (section) => `eq.${section.page_path}` === url.searchParams.get('page_path'),
            )
          : path.endsWith('/team_members')
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
  test(`one About page keeps sections compact and old links working at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width, height: 900 });
    const state = await fixture(page);
    await page.goto('/about');
    const combined = page.locator('.about-combined');
    await expect(combined).toBeVisible();
    await expect(combined.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(combined.locator('.about-photo')).toHaveCount(1);
    await expect(
      combined.getByRole('navigation', { name: 'On this page' }).getByRole('link'),
    ).toHaveCount(5);
    await expect(combined.locator('.about-purpose-symbol')).toHaveCount(3);
    await expect(combined.locator('.about-jump-links a[href="/about#overview"]')).toHaveCount(0);
    await expect(combined.locator(':scope > .about-section')).toHaveCount(5);
    await expect(combined.locator('.about-timeline')).toContainText('1979');
    await expect(combined.locator('.about-financial-totals')).toContainText('£545,030');
    await expect(combined.locator('details[open]')).toHaveCount(0);
    await expect(combined.locator('iframe')).toHaveCount(0);
    expect(state.reads.filter((path) => /team_members|get_public_form/.test(path))).toEqual([]);
    const photo = combined.locator('.about-photo img');
    await expect
      .poll(() => photo.evaluate((img) => img.complete && img.naturalWidth > 0))
      .toBe(true);
    expect((await photo.boundingBox()).height).toBeLessThan(width < 700 ? 260 : 500);
    expect((await combined.boundingBox()).height).toBeLessThan(width < 700 ? 2400 : 1750);
    await combined
      .getByRole('navigation', { name: 'On this page' })
      .getByRole('link', { name: 'Our story', exact: true })
      .click();
    await expect(page).toHaveURL(/\/about#history$/);
    await expect(page.locator('#history')).toBeFocused();
    for (const [path, id] of [
      ['/about/history', 'history'],
      ['/team', 'team'],
      ['/social-media', 'social'],
      ['/financial-history', 'finances'],
      ['/contact', 'contact'],
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/about#${id}$`));
      const content = page.locator(`#${id}`);
      await expect(content).toBeVisible();
      await expect(page.locator('.about-combined').getByRole('heading', { level: 1 })).toHaveCount(
        1,
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
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
  await expect(page.locator('.about-photo')).toHaveCount(1);
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

test('combined sections keep their saved content, visibility, menu labels and shared anchors', async ({
  page,
}) => {
  const state = await fixture(page, {
    content: {
      'page:/about/history': JSON.stringify({
        title: 'Our saved story',
        body: 'Published history from the office.',
      }),
      'page:/team': JSON.stringify({ title: 'People update', body: 'Published team information.' }),
      'page-visibility:/financial-history': 'false',
      site_navigation: JSON.stringify({
        labels: { '/team': 'Our community team' },
        children: { '/about': ['/about', '/team', '/about/history', '/contact', '/social-media'] },
      }),
    },
    sections: [
      {
        id: 'story-section',
        page_path: '/about/history',
        published: true,
        title: 'History photographs',
        body: 'A published extra section.',
      },
    ],
  });
  await page.goto('/about');
  const content = page.locator('.about-combined');
  await expect(
    content.getByRole('heading', { name: 'Our saved story', exact: true }),
  ).toBeVisible();
  await expect(
    content.getByText('Published history from the office.', { exact: true }),
  ).toBeVisible();
  await expect(content.getByText('A published extra section.', { exact: true })).toBeVisible();
  await expect(content.getByText('Published team information.', { exact: true })).toBeVisible();
  await expect(content.locator('#finances')).toHaveCount(0);
  await expect
    .poll(() =>
      content
        .locator(':scope > .about-section')
        .evaluateAll((nodes) => nodes.map((node) => node.id)),
    )
    .toEqual(['team', 'history', 'contact', 'social']);
  const links = content.getByRole('navigation', { name: 'On this page' }).getByRole('link');
  await expect(links).toHaveText([
    'Our community team',
    'Our story',
    'Visit & contact',
    'Stay connected',
  ]);
  await links.filter({ hasText: 'Our community team' }).click();
  await expect(page).toHaveURL(/\/about#team$/);
  await expect(page.locator('#team')).toBeFocused();
  await expect(page.locator('#team details')).toHaveAttribute('open', '');
  await page.goto('/social-media?from=shared#facebook');
  await expect(page).toHaveURL(/\/about\?from=shared#facebook$/);
  await expect(page.locator('#facebook')).toBeFocused();
  await expect(page.locator('#facebook')).toHaveAttribute('href', 'https://facebook.com/JICMasjid');
  await page.goto('/financial-history');
  await expect(page.getByRole('heading', { name: 'Page unavailable', exact: true })).toBeVisible();
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('About retains moved visible sections and keeps additional pages as configured links', async ({
  page,
}) => {
  const state = await fixture(page, {
    content: {
      'page-section:/team': '/services',
      'page-visibility:/financial-history': 'false',
      site_navigation: JSON.stringify({
        labels: { '/contact': 'Visit us', '/team': 'Centre people' },
        children: {
          '/about': [
            '/contact',
            '/pages/community-story',
            '/about/history',
            '/about',
            '/social-media',
          ],
        },
      }),
    },
    addedPages: [{ slug: 'community-story', title: 'Community story', placement: '/about' }],
  });
  await page.goto('/about');
  const content = page.locator('.about-combined');
  await expect
    .poll(() =>
      content
        .locator(':scope > .about-section')
        .evaluateAll((nodes) => nodes.map((node) => node.id)),
    )
    .toEqual(['contact', 'history', 'social', 'team']);
  const links = content.getByRole('navigation', { name: 'On this page' }).getByRole('link');
  await expect(links).toHaveText([
    'Visit us',
    'Community story',
    'Our story',
    'Stay connected',
    'Centre people',
  ]);
  await expect(links.filter({ hasText: 'Community story' })).toHaveAttribute(
    'href',
    '/pages/community-story',
  );
  await expect(content.getByRole('link', { name: 'Meet our founder members' })).toHaveCount(0);
  await page.goto('/team?preview=1#team');
  await expect(page).toHaveURL('/team?preview=1#team');
  await expect(page.locator('#team')).toBeVisible();
  expect(state.errors).toEqual([]);
  expect(state.writes).toEqual([]);
});
