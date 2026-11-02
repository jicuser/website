import { test, expect } from '@playwright/test';

test.use({ screenshot: 'off' });
const userId = '10000000-0000-4000-8000-000000000001';
const formId = '10000000-0000-4000-8000-000000000010';

async function fixture(page) {
  const state = { writes: [], errors: [] };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.addInitScript((id) => {
    sessionStorage.setItem('jic-salawat-shown', '1');
    sessionStorage.setItem(
      'sb-127-auth-token',
      JSON.stringify({
        access_token: 'preview-token',
        refresh_token: 'test-refresh',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: { id, email: 'colleague@example.invalid' },
      }),
    );
  }, userId);
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', (route) => {
    const request = route.request(),
      name = new URL(request.url()).pathname.split('/').at(-1);
    let data = [];
    if (name === 'get_my_profile')
      data = {
        id: userId,
        display_name: 'Website editor',
        is_owner: true,
        is_active: true,
        permissions: [],
        staff_kinds: [],
      };
    else if (name === 'admin_forms_overview' || name === 'list_public_forms')
      data = [
        {
          id: formId,
          slug: 'course-interest',
          title: 'Course interest',
          enabled: true,
          published_version: 1,
          version: 1,
          schema: { private_marker: 'never-send-to-preview' },
        },
      ];
    else if (name === 'get_site_page') data = null;
    if (
      /^(save_|publish_|submit_)/.test(name) ||
      new URL(request.url()).pathname.includes('/functions/')
    )
      state.writes.push(name);
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return state;
}

test('an unsaved added page updates the actual website preview without a write or iframe reload', async ({
  page,
}) => {
  const state = await fixture(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin?section=content&view=add');
  await expect(page.getByLabel('Page title', { exact: true })).toBeVisible();
  const iframe = page.locator('iframe[title="Added page website preview"]');
  await expect(iframe).toHaveAttribute('src', '/pages/__draft?preview=1');
  const preview = page.frameLocator('iframe[title="Added page website preview"]');
  await expect(preview.getByRole('heading', { name: 'Untitled page', exact: true })).toBeVisible();
  const frame = page.frames().find((item) => item.url().includes('/pages/__draft?preview=1'));
  await frame.evaluate(() => {
    window.__previewDocumentMarker = 'same-document';
  });
  await page.getByLabel('Page title', { exact: true }).fill('Unsaved open evening');
  await page
    .getByRole('tablist', { name: 'Programme page steps' })
    .getByRole('tab', { name: 'Content', exact: true })
    .click();
  await page
    .getByLabel('Page details', { exact: true })
    .fill('A draft programme introduction before any save.');
  await page
    .getByRole('tablist', { name: 'Programme page steps' })
    .getByRole('tab', { name: 'Details', exact: true })
    .click();
  await page.getByLabel('When / schedule', { exact: true }).fill('Draft schedule information');
  await page
    .getByRole('tablist', { name: 'Programme page steps' })
    .getByRole('tab', { name: 'Content', exact: true })
    .click();
  await page.getByLabel('Page picture address', { exact: true }).fill('/jic-aerial-sunset.jpg');
  await page
    .getByRole('tablist', { name: 'Programme page steps' })
    .getByRole('tab', { name: 'Registration', exact: true })
    .click();
  await page.getByLabel('Registration', { exact: true }).selectOption('interest');
  await page.getByLabel('Linked form', { exact: true }).selectOption(formId);
  await expect(
    preview.getByRole('heading', { name: 'Unsaved open evening', exact: true }),
  ).toBeVisible();
  await expect(
    preview.getByText('A draft programme introduction before any save.', { exact: true }),
  ).toBeVisible();
  await expect(preview.getByRole('banner')).toBeVisible();
  await expect(
    preview.getByRole('img', { name: 'Unsaved open evening poster', exact: true }),
  ).toBeVisible();
  await expect(preview.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const registration = preview.getByRole('link', { name: 'Register interest', exact: true });
  await expect(registration).toHaveAttribute(
    'href',
    '/forms/course-interest?programme=unsaved-open-evening',
  );
  await registration.click();
  await expect(preview.getByRole('status').filter({ hasText: 'Preview link:' })).toBeVisible();
  expect(frame.url()).toContain('/pages/__draft?preview=1');
  const accepted = await frame.evaluate(() => window.__jicPagePreview.page);
  expect(accepted.form).toEqual({ slug: 'course-interest', open: true });
  expect(JSON.stringify(accepted)).not.toContain('never-send-to-preview');
  await page.getByRole('button', { name: 'Desktop preview', exact: true }).click();
  await expect.poll(() => frame.evaluate(() => innerWidth)).toBe(1200);
  await page.getByRole('button', { name: 'Mobile preview', exact: true }).click();
  await expect.poll(() => frame.evaluate(() => innerWidth)).toBeLessThanOrEqual(390);
  await page
    .getByRole('tablist', { name: 'Programme page steps' })
    .getByRole('tab', { name: 'Details', exact: true })
    .click();
  await page.getByLabel('Page title', { exact: true }).fill('Still an unsaved draft');
  await expect(
    preview.getByRole('heading', { name: 'Still an unsaved draft', exact: true }),
  ).toBeVisible();
  expect(await frame.evaluate(() => window.__previewDocumentMarker)).toBe('same-document');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Live preview', exact: true }).click();
  await expect(iframe).toBeVisible();
  await page.getByRole('button', { name: 'Edit page', exact: true }).click();
  await expect(page.getByLabel('Page title', { exact: true })).toBeVisible();
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('a standalone unpublished page ignores draft preview messages', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/pages/unpublished-page?preview=1');
  await expect(
    page.getByRole('heading', { name: 'This page is not available.', exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    window.postMessage(
      {
        type: 'jic-page-preview',
        path: '/pages/unpublished-page',
        page: { title: 'Unaccepted draft', body: 'Not public' },
        content: {},
        sections: null,
      },
      location.origin,
    ),
  );
  await expect(
    page.getByRole('heading', { name: 'This page is not available.', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Unaccepted draft', { exact: true })).toHaveCount(0);
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});
