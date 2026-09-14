import { test, expect } from '@playwright/test';

const owner = {
  id: '10000000-0000-4000-8000-000000000001', display_name: 'Centre owner',
  is_owner: true, is_active: true, permissions: [], staff_kinds: [],
};
const member = {
  id: '10000000-0000-4000-8000-000000000002', display_name: 'Test staff',
  is_owner: false, is_active: false, permissions: [], staff_kinds: [],
};

// Intercept external data only. The application router, Auth provider and editors run unchanged.
async function openAdmin(page, { actor = owner, section = 'posters', deletionFails = false } = {}) {
  const errors = [], writes = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    return route.continue();
  });
  await page.route('**/preview-api/**', async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    let data = [];
    if (url.pathname.includes('/auth/v1/token')) {
      const expires = Math.floor(Date.now() / 1000) + 3600;
      const user = { id: actor.id, email: 'staff@example.invalid', role: 'authenticated',
        aud: 'authenticated', user_metadata: {}, app_metadata: {} };
      const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      data = { user, access_token: `${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:actor.id,exp:expires})}.test`,
        refresh_token: 'local-test-only', token_type: 'bearer', expires_in: 3600, expires_at: expires };
    } else if (url.pathname.endsWith('/rpc/get_my_profile')) data = actor;
    else if (url.pathname.endsWith('/profiles')) data = [actor, member];
    else if (url.pathname.endsWith('/functions/v1/manage-user')) {
      const body = route.request().postDataJSON();
      writes.push(body);
      if (deletionFails && body.action === 'delete') return route.fulfill({
        status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'Account has retained records.' }),
      });
      data = { ok: true };
    } else if (url.pathname.endsWith('/page_content') && method !== 'GET') {
      const body = route.request().postDataJSON();
      writes.push(body);
      data = [{ content_key: body.content_key }];
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
  return { errors, writes };
}

for (const width of [390, 1280]) {
  test(`poster editing and section navigation remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const evidence = await openAdmin(page);
    const cards = page.locator('.admin-poster-picker button');
    await expect(cards.first()).toBeVisible();
    const geometry = await cards.evaluateAll(elements => elements.filter(e => e.querySelector('img')).map(e => {
      const image = e.querySelector('img').getBoundingClientRect();
      const title = e.querySelector('span').getBoundingClientRect();
      return { below: title.top >= image.bottom - 1, width: title.width };
    }));
    expect(geometry.length).toBeGreaterThan(0);
    expect(geometry.every(card => card.below && card.width > 70)).toBe(true);
    const selector = page.locator('.admin-toolbar .admin-mobile-section select');
    await expect(page.locator('.admin-mobile-section')).toHaveCount(1);
    if (width < 801) {
      await expect(selector).toBeVisible();
      await page.evaluate(() => scrollTo(0, 800));
      const box = await selector.boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThan(900);
    } else {
      await expect(selector).toBeHidden();
      await expect(page.getByRole('navigation', { name: 'Admin sections' })).toBeVisible();
    }
    await cards.first().click();
    await expect(page.getByLabel('Poster name', { exact: true })).toBeVisible();
    const top = await page.locator('.scene-properties').evaluate(el => ({
      editor: el.getBoundingClientRect().top,
      toolbar: document.querySelector('.admin-toolbar').getBoundingClientRect().bottom,
    }));
    expect(top.editor).toBeGreaterThanOrEqual(top.toolbar - 1);
    await page.getByLabel('Poster name', { exact: true }).fill('Updated test poster');
    expect(evidence.writes).toHaveLength(0);
    await page.getByRole('button', { name: 'Publish posters', exact: true }).click();
    await expect.poll(() => evidence.writes.length).toBe(1);
    if (width < 801) await selector.selectOption('announcements');
    else await page.getByRole('navigation', { name: 'Admin sections' })
      .getByRole('button', { name: 'Announcements', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Announcements', exact: true })).toBeVisible();
    expect(evidence.errors).toEqual([]);
  });
}

test('only owners can see deletion controls and confirmation cannot be skipped', async ({ page }) => {
  const evidence = await openAdmin(page, { section: 'users' });
  const account = page.locator('.admin-staff-access details').filter({ hasText: 'Test staff' });
  await account.locator('summary').click();
  await account.getByRole('button', { name: 'Delete account', exact: true }).click();
  await expect(account.getByRole('button', { name: 'Delete permanently', exact: true })).toBeDisabled();
  await account.getByLabel('Type DELETE to confirm').fill('DELETE');
  await account.getByRole('button', { name: 'Cancel deletion' }).click();
  expect(evidence.writes).toEqual([]);
  await account.getByRole('button', { name: 'Delete account', exact: true }).click();
  await account.getByLabel('Type DELETE to confirm').fill('DELETE');
  await account.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(account).toHaveCount(0);
  expect(evidence.writes).toEqual([{ action: 'delete', user_id: member.id, confirmation: 'DELETE' }]);
  expect(evidence.errors).toEqual([]);
});

test('failed deletion keeps the staff account and displays the server explanation', async ({ page }) => {
  const evidence = await openAdmin(page, { section: 'users', deletionFails: true });
  const account = page.locator('.admin-staff-access details').filter({ hasText: 'Test staff' });
  await account.locator('summary').click();
  await account.getByRole('button', { name: 'Delete account', exact: true }).click();
  await account.getByLabel('Type DELETE to confirm').fill('DELETE');
  await account.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(account).toHaveCount(1);
  await expect(account.getByRole('alert')).toHaveText('Account has retained records.');
  expect(evidence.errors).toEqual([]);
});

test('delegated staff managers do not receive the owner deletion control', async ({ page }) => {
  const actor = { ...owner, is_owner: false, permissions: ['users'] };
  const evidence = await openAdmin(page, { actor, section: 'users' });
  await expect(page.locator('.admin-staff-access details')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Delete account', exact: true })).toHaveCount(0);
  expect(evidence.writes).toEqual([]);
  expect(evidence.errors).toEqual([]);
});
