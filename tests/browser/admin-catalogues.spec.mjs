import { test, expect } from '@playwright/test';

test.use({ screenshot: 'off', timezoneId: 'Europe/London' });

async function openCatalogue(page, section, { notices = [], livestreamFails = false } = {}) {
  const writes = [];
  const actor = {
    id: '10000000-0000-4000-8000-000000000001',
    display_name: 'Centre owner',
    is_owner: true,
    is_active: true,
    permissions: [],
    staff_kinds: [],
  };
  await page.route('**/preview-api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let data = [];
    if (url.pathname.includes('/auth/v1/token')) {
      const expires = Math.floor(Date.now() / 1000) + 3600;
      const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
      data = {
        user: {
          id: actor.id,
          email: 'staff@example.invalid',
          role: 'authenticated',
          aud: 'authenticated',
          user_metadata: {},
          app_metadata: {},
        },
        access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: actor.id, exp: expires })}.test`,
        refresh_token: 'local-test-only',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: expires,
      };
    } else if (url.pathname.endsWith('/rpc/get_my_profile')) data = actor;
    else if (url.pathname.endsWith('/announcements')) {
      if (request.method() === 'PATCH') {
        const payload = request.postDataJSON();
        const id = url.searchParams.get('id');
        writes.push({ method: 'PATCH', id, payload });
        const row = notices.find((notice) => `eq.${notice.id}` === id);
        if (row) Object.assign(row, payload);
      } else if (request.method() === 'POST') {
        writes.push({ method: 'POST', payload: request.postDataJSON() });
      }
      data = notices;
    } else if (url.pathname.endsWith('/livestream_settings')) {
      if (request.method() === 'GET' && livestreamFails)
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Settings could not be read.' }),
        });
      if (request.method() === 'PATCH')
        writes.push({ method: 'PATCH', payload: request.postDataJSON() });
      data = {
        id: 1,
        enabled: false,
        provider: 'youtube',
        title: 'JIC Live',
        stream_url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
        scheduled_at: null,
      };
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/admin/login');
  await page.locator('input[type="email"]').fill('staff@example.invalid');
  await page.locator('input[type="password"]').fill('Local testing passphrase');
  await page.locator('form button[type="submit"], form > button').first().click();
  await expect(page.locator('.admin-toolbar')).toBeVisible();
  await page.goto(`/admin?section=${section}`);
  await expect(page.locator('.admin-toolbar')).toBeVisible();
  return writes;
}

test('editing a saved notice updates its ID and preserves an unchanged repeated-hour schedule', async ({
  page,
}) => {
  const writes = await openCatalogue(page, 'announcements', {
    notices: [
      {
        id: 'notice-1',
        title: 'Community notice',
        body: 'Original message.',
        kind: 'info',
        published: true,
        starts_at: '2026-10-25T01:30:00Z',
        expires_at: null,
        created_at: '2026-10-23T12:00:00Z',
      },
    ],
  });
  await expect(page.getByRole('button', { name: 'New notice', exact: true })).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit Community notice', exact: true }).click();
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Updated message.');
  await page.locator('form').getByRole('button', { name: 'Save notice', exact: true }).click();
  await expect(page.getByText('Updated message.', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({
    method: 'PATCH',
    id: 'eq.notice-1',
    payload: { body: 'Updated message.', starts_at: '2026-10-25T01:30:00Z', published: true },
  });
  await expect(page.getByLabel('Title', { exact: true })).toHaveCount(0);
});

test('event creation opens from the catalogue and cancel protects changed fields', async ({
  page,
}) => {
  const writes = await openCatalogue(page, 'events');
  await expect(page.getByLabel('Title', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'New event', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Unsaved event');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Unsaved event');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveCount(0);
  expect(writes).toEqual([]);
});

test('a failed livestream read cannot overwrite saved settings with default values', async ({
  page,
}) => {
  const writes = await openCatalogue(page, 'livestream', { livestreamFails: true });
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save livestream', exact: true })).toBeDisabled();
  expect(writes).toEqual([]);
});

test('livestream rejects insecure and credential-bearing URLs before updating settings', async ({
  page,
}) => {
  const writes = await openCatalogue(page, 'livestream');
  const save = page.locator('form').getByRole('button', { name: 'Save livestream', exact: true });
  for (const value of [
    'http://www.youtube.com/watch?v=5qap5aO4i9A',
    'https://staff:password@www.youtube.com/watch?v=5qap5aO4i9A',
  ]) {
    await page.getByLabel('Stream URL', { exact: true }).fill(value);
    await save.click();
    await expect(page.getByRole('alert')).toContainText('HTTPS');
  }
  expect(writes).toEqual([]);
  await page.getByLabel('Stream URL', { exact: true }).fill('');
  await page.getByLabel('Show livestream', { exact: true }).check();
  await save.click();
  await expect(page.getByRole('alert')).toContainText('stream URL');
  expect(writes).toEqual([]);
});

test('livestream placement can be dragged, selected and saved with notification preferences', async ({
  page,
}) => {
  const writes = await openCatalogue(page, 'livestream');
  await page
    .getByRole('combobox', { name: 'Home page position', exact: true })
    .selectOption('after-events');
  await page.getByLabel('Show a website notification', { exact: true }).check();
  const preview = page.getByLabel('Website placement preview', { exact: true });
  const card = preview.getByRole('button', { name: 'Drag notice to choose its position' });
  await card.scrollIntoViewIfNeeded();
  const area = await preview.boundingBox();
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(area.x + 25, area.y + 25, { steps: 5 });
  await page.mouse.up();
  await expect(
    page.getByRole('combobox', { name: 'Notification position', exact: true }),
  ).toHaveValue('top-left');
  await page.locator('form').getByRole('button', { name: 'Save livestream', exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].payload.display_settings).toEqual({
    placement: 'after-events',
    notification: true,
    position: 'top-left',
  });
});
