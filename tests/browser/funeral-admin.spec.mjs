import { test, expect } from '@playwright/test';

test('facility editing previews photos and visibility before publishing through the page editor', async ({
  page,
}) => {
  const writes = [],
    errors = [];
  let saved = null;
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    sessionStorage.setItem('jic-salawat-shown', '1');
    sessionStorage.setItem(
      'sb-127-auth-token',
      JSON.stringify({
        access_token: 'preview-token',
        refresh_token: 'test-refresh',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: { id: '10000000-0000-4000-8000-000000000001', email: 'editor@example.invalid' },
      }),
    );
  });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const name = url.pathname.split('/').at(-1);
    let data = [];
    if (name === 'get_my_profile')
      data = {
        id: '10000000-0000-4000-8000-000000000001',
        display_name: 'Website editor',
        is_owner: true,
        is_active: true,
        permissions: [],
        staff_kinds: [],
      };
    if (name === 'page_content') {
      if (request.method() === 'POST') {
        saved = request.postDataJSON();
        writes.push(saved);
        data = [{ content_key: saved.content_key }];
      } else if (!url.searchParams.has('content_key')) data = saved ? [saved] : [];
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/admin?section=content&page=%2Ffunerals');
  const editor = page.locator('.funeral-facilities-editor');
  await expect(
    editor.getByRole('heading', { name: 'Funeral facilities & transport' }),
  ).toBeVisible();
  const preview = page.frameLocator('iframe[title="Funeral Services website preview"]');
  await expect(preview.locator('.funeral-facility')).toHaveCount(6);
  await expect(
    preview.getByRole('heading', { name: 'Family & viewing room', exact: true }),
  ).toBeVisible();
  await editor.getByLabel('Card title', { exact: true }).fill('Collection vehicle');
  await editor.getByLabel('Photo URL', { exact: true }).fill('/jic-aerial-sunset.jpg');
  await editor.getByLabel('Photo description', { exact: true }).fill('Test collection photo');
  await expect(
    preview.getByRole('heading', { name: 'Collection vehicle', exact: true }),
  ).toBeVisible();
  await expect(preview.getByRole('img', { name: 'Test collection photo' })).toBeVisible();
  expect(writes).toEqual([]);
  await editor.getByRole('combobox', { name: 'Facility', exact: true }).selectOption('cold-room');
  await editor.getByLabel('Show on the website', { exact: true }).uncheck();
  await expect(preview.locator('.funeral-facility')).toHaveCount(5);
  await editor.getByRole('button', { name: 'Save facilities', exact: true }).click();
  await expect(editor.getByRole('status')).toHaveText('Facilities saved to the website.');
  expect(writes).toHaveLength(1);
  expect(writes[0].content_key).toBe('funeral_facilities');
  const content = JSON.parse(writes[0].content_value);
  expect(content.find((item) => item.id === 'ambulance').image).toBe('/jic-aerial-sunset.jpg');
  expect(content.find((item) => item.id === 'cold-room').visible).toBe(false);
  expect(errors).toEqual([]);
});
