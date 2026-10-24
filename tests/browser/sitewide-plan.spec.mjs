import { test, expect } from '@playwright/test';
import { DEFAULT_SITE_DESIGN } from '../../src/lib/siteDesign.js';
const actor = {
  id: '10000000-0000-4000-8000-000000000001',
  display_name: 'Editor',
  is_owner: false,
  is_active: true,
  permissions: ['content'],
  staff_kinds: [],
};
async function fixture(page, { admin = false, content = {} } = {}) {
  const state = {
    content,
    errors: [],
    writes: [],
    settings: { draft: DEFAULT_SITE_DESIGN, published: DEFAULT_SITE_DESIGN, revision: 0 },
    fail: false,
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
      const exp = Math.floor(Date.now() / 1000) + 3600,
        enc = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
      data = {
        user: {
          ...actor,
          email: 'editor@example.invalid',
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
    else if (path.endsWith('/website_design')) data = state.settings;
    else if (path.endsWith('/rpc/save_website_design')) {
      if (state.fail)
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Connection interrupted. Try again.' }),
        });
      state.writes.push(body);
      state.settings.draft = body.p_design;
      state.settings.revision++;
      if (body.p_publish) {
        state.settings.published = body.p_design;
        state.content.site_design = JSON.stringify(body.p_design);
      }
      data = state.settings.revision;
    } else if (path.endsWith('/rpc/save_website_page')) {
      state.writes.push(body);
      state.content[`page:${body.p_path}`] = body.p_content;
      data = null;
    } else if (path.endsWith('/page_content'))
      data = url.searchParams.has('content_key')
        ? state.content[url.searchParams.get('content_key').replace(/^eq\./, '')]
          ? {
              content_value:
                state.content[url.searchParams.get('content_key').replace(/^eq\./, '')],
            }
          : null
        : Object.entries(state.content).map(([content_key, content_value]) => ({
            content_key,
            content_value,
          }));
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  if (admin) {
    await page.goto('/admin/login');
    await page.getByLabel('Email address').fill('editor@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill('Local test password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('.admin-toolbar')).toBeVisible();
  }
  return state;
}
for (const width of [320, 390, 430, 768, 1280])
  test(`Home, Hub and guidance fit ${width}px`, async ({ page }, info) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width, height: 844 });
    const state = await fixture(page);
    await page.goto('/');
    await expect(page.locator('.jic-home-shortcuts a')).toHaveCount(6);
    await expect(page.locator('.whats-on-row')).toHaveCount(3);
    await expect(page.locator('.service-explorer--compact')).toHaveCount(0);
    await expect(page.locator('.jic-home-content .jic-programme-card')).toHaveCount(0);
    expect(
      await page.locator('.jic-premium-home').evaluate((n) => n.getBoundingClientRect().height),
    ).toBeLessThan(2400);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    if (width === 390)
      await page.screenshot({ path: info.outputPath('home-390.png'), fullPage: true });
    await page.goto('/hub');
    await expect(page).toHaveURL('/services');
    await expect(page.locator('.service-explorer-card')).toHaveCount(8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    if (width === 390 || width === 1280)
      await page.screenshot({ path: info.outputPath(`hub-${width}.png`), fullPage: true });
    await page
      .locator('.service-explorer-grid')
      .getByRole('link', { name: 'Skills & careers', exact: true })
      .click();
    await page.getByRole('button', { name: 'My CV', exact: true }).click();
    await page.getByRole('button', { name: 'Starting my first CV', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Build a first CV', exact: true }),
    ).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    if (width === 390)
      await page.screenshot({ path: info.outputPath('career-guidance-390.png'), fullPage: true });
    expect(state.errors).toEqual([]);
    expect(state.writes).toEqual([]);
  });
test('guided answers stay in memory and changing direction drops the previous branch', async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto('/services/skills-careers/');
  await expect(page.getByRole('button', { name: 'My CV', exact: true })).toBeVisible();
  const storage = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  await page.getByRole('button', { name: 'My CV', exact: true }).click();
  await page.getByRole('button', { name: 'Updating a CV', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Make your CV fit the role' })).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'An interview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prepare a few clear examples' })).toBeVisible();
  await expect(page.getByText('Make your CV fit the role')).toHaveCount(0);
  await expect(page).toHaveURL('/services/skills-careers/');
  expect(
    await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } })),
  ).toEqual(storage);
  expect(state.writes).toEqual([]);
  await page.goto('/services/support');
  await expect(page.getByRole('complementary', { name: 'Urgent help' })).toBeVisible();
  await page.getByRole('button', { name: 'A family or bereavement matter' }).click();
  await page.getByRole('button', { name: 'Safety or abuse concerns' }).click();
  await expect(page.getByRole('heading', { name: 'Find specialist help' })).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
});
test('Hub filters survive visiting a service and using Back', async ({ page }) => {
  await fixture(page);
  await page.goto('/services');
  await page.getByRole('searchbox', { name: 'Search services' }).fill('cv');
  await expect(page.locator('.service-explorer-card')).toHaveCount(1);
  await page.locator('.service-explorer-card').click();
  await expect(page).toHaveURL('/services/skills-careers');
  await page.goBack();
  await expect(page.getByRole('searchbox', { name: 'Search services' })).toHaveValue('cv');
  await expect(page.locator('.service-explorer-card')).toHaveCount(1);
});
test('appearance previews, private drafts, publication, scope and failed saves agree', async ({
  page,
}) => {
  test.setTimeout(45000);
  const state = await fixture(page, { admin: true });
  await page.goto('/admin?section=appearance');
  const panel = page.locator('.website-appearance');
  await panel.getByRole('combobox', { name: 'Colour palette', exact: true }).selectOption('forest');
  const preview = page.frameLocator('iframe[title="Website appearance preview"]');
  await expect(preview.locator('.jic-public-route')).toHaveAttribute('data-palette', 'forest');
  expect(state.writes).toEqual([]);
  await panel.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(panel.getByText('Draft saved. The live website is unchanged.')).toBeVisible();
  expect(state.content.site_design).toBeUndefined();
  await panel.getByRole('combobox', { name: 'Edit scope', exact: true }).selectOption('/services');
  await panel.getByRole('combobox', { name: 'Colour palette', exact: true }).selectOption('slate');
  await panel.getByRole('combobox', { name: 'Overview layout', exact: true }).selectOption('list');
  await expect(preview.locator('.jic-public-route')).toHaveAttribute('data-content-layout', 'list');
  state.fail = true;
  await panel.getByRole('button', { name: 'Publish changes', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('Connection interrupted');
  await expect(panel.getByRole('combobox', { name: 'Colour palette', exact: true })).toHaveValue(
    'slate',
  );
  expect(state.content.site_design).toBeUndefined();
  state.fail = false;
  await panel.getByRole('button', { name: 'Publish changes', exact: true }).click();
  await expect(panel.getByText('Published to the website.', { exact: true })).toBeVisible();
  await page.goto('/services');
  await expect(page.locator('.jic-public-route')).toHaveAttribute('data-palette', 'slate');
  await page.goto('/worship');
  await expect(page.locator('.jic-public-route')).toHaveAttribute('data-palette', 'forest');
  expect(state.errors).toEqual([]);
});
test('guided editor previews a valid branch and rejects a loop without writing', async ({
  page,
}) => {
  test.setTimeout(45000);
  const state = await fixture(page, { admin: true });
  await page.goto('/admin?section=content&page=%2Fservices%2Fskills-careers');
  await page.getByText('Guided next steps · questions & results', { exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Step title', exact: true })
    .fill('Choose your next task');
  await page.getByRole('button', { name: 'Live preview', exact: true }).click();
  const preview = page.frameLocator('iframe[title="Skills & careers website preview"]');
  await expect(preview.getByRole('heading', { name: 'Choose your next task' })).toBeVisible();
  await preview.getByRole('button', { name: 'My CV', exact: true }).click();
  await expect(preview.getByRole('heading', { name: 'Where are you with your CV?' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit page', exact: true }).click();
  await page
    .locator('#staff-content')
    .getByRole('button', { name: 'Save page', exact: true })
    .click();
  await expect(page.getByText('Saved to the website.', { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
  await page.getByRole('combobox', { name: 'Selected step', exact: true }).selectOption('cv-stage');
  await page.getByRole('combobox', { name: 'Go to', exact: true }).first().selectOption('task');
  await expect(page.getByRole('alert')).toContainText('loops back');
  await page
    .locator('#staff-content')
    .getByRole('button', { name: 'Save page', exact: true })
    .click();
  expect(state.writes).toHaveLength(1);
  expect(state.errors).toEqual([]);
});
