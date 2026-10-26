import { test, expect } from '@playwright/test';

async function mockApi(page, { active = true, requestStatus = () => 200 } = {}) {
  const calls = [];
  const id = '00000000-0000-4000-8000-000000000072';
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    calls.push({ path, body: req.postData() ? req.postDataJSON() : null });
    let status = 200;
    let body = [];
    if (path.endsWith('/auth/v1/settings')) body = { external: { google: false } };
    if (path.endsWith('/auth/v1/otp')) body = {};
    if (path.endsWith('/auth/v1/token'))
      body = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        token_type: 'bearer',
        expires_in: 3600,
        user: { id, email: 'member@example.test' },
      };
    if (path.endsWith('/get_my_profile'))
      body = {
        id,
        display_name: 'Example member',
        is_active: active,
        is_owner: false,
        permissions: [],
        staff_kinds: [],
      };
    if (path.endsWith('/request-access')) {
      status = requestStatus();
      body =
        status === 503
          ? { error: 'Account requests are not open yet.', code: 'account_requests_disabled' }
          : status === 429
            ? { error: 'Too many requests. Please try again in an hour.' }
            : { ok: true };
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return calls;
}

test('the direct request URL honours the release flag before rendering a form', async ({
  page,
}, testInfo) => {
  const calls = await mockApi(page);
  await page.goto('/account/request');
  if (testInfo.project.name === 'enabled') {
    await expect(page.getByRole('heading', { name: 'Request portal access' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send account request' })).toBeVisible();
  } else {
    await expect(
      page.getByRole('heading', { name: 'Account requests are not open yet' }),
    ).toBeVisible();
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.locator('.human-check')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Contact the office' })).toHaveAttribute(
      'href',
      '/contact',
    );
    await page.getByRole('link', { name: 'Sign in or create an account' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in to your Portal' })).toBeVisible();
  }
  expect(calls.filter((call) => call.path.endsWith('/request-access'))).toHaveLength(0);
});

test('portal links use office contact while closed and preserve email when open', async ({
  page,
}, testInfo) => {
  await mockApi(page);
  await page.goto('/portal');
  await expect(page.getByRole('heading', { name: 'Sign in to your Portal' })).toBeVisible();
  await page.getByLabel('Email address', { exact: true }).fill('visitor@example.test');
  if (testInfo.project.name === 'enabled') {
    await page.getByRole('link', { name: 'Need access? Contact the office' }).click();
    await expect(page.getByLabel('Email address', { exact: true })).toHaveValue(
      'visitor@example.test',
    );
    await expect(page.getByRole('heading', { name: 'Request portal access' })).toBeVisible();
  } else {
    await expect(page.locator('a[href="/account/request"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Contact the office' })).toHaveAttribute(
      'href',
      '/contact',
    );
  }
});

test('email account creation remains separate and does not request staff or family privileges', async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto('/portal');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Your name', { exact: true }).fill('New Member');
  await page.getByLabel('Email address', { exact: true }).fill('new@example.test');
  await page.getByRole('button', { name: 'Email my account link' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Check your email to verify' }),
  ).toBeVisible();
  const otp = calls.filter((call) => call.path.endsWith('/auth/v1/otp'));
  expect(otp).toHaveLength(1);
  expect(otp[0].body.create_user).toBe(true);
  expect(otp[0].body.data).toEqual({ display_name: 'New Member' });
  expect(calls.filter((call) => call.path.endsWith('/request-access'))).toHaveLength(0);
});

test('inactive members keep an appropriate access-help link without gaining staff tools', async ({
  page,
}, testInfo) => {
  await mockApi(page, { active: false });
  await page.goto('/portal');
  await page.getByLabel('Email address', { exact: true }).fill('member@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Example password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Account access' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Staff home' })).toHaveCount(0);
  if (testInfo.project.name === 'enabled')
    await expect(page.getByRole('link', { name: 'Request access', exact: true })).toHaveAttribute(
      'href',
      '/account/request',
    );
  else {
    await expect(page.locator('a[href="/account/request"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Contact the office' })).toHaveAttribute(
      'href',
      '/contact',
    );
  }
});

test('an open frontend handles a closed server and rate limits without claiming success', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'enabled', 'The closed frontend never mounts the form.');
  let status = 503;
  const calls = await mockApi(page, { requestStatus: () => status });
  await page.goto('/account/request');
  await page.getByLabel('Your name', { exact: true }).fill('Visitor Name');
  await page.getByLabel('Email address', { exact: true }).fill('visitor@example.test');
  await page.getByLabel('How are you connected to JIC?').selectOption('teacher');
  await page.getByLabel('Teacher registers and progress tools').check();
  await page.getByLabel('I agree that JIC').check();
  await page.getByRole('button', { name: 'Send account request' }).click();
  await expect(page.getByRole('alert')).toHaveText('Account requests are not open yet.');
  await expect(page.getByRole('heading', { name: 'Request sent', exact: true })).toHaveCount(0);
  status = 429;
  await page.getByRole('button', { name: 'Send account request' }).click();
  await expect(page.getByRole('alert')).toContainText('Too many requests.');
  status = 200;
  await page.getByRole('button', { name: 'Send account request' }).click();
  await expect(page.getByRole('heading', { name: 'Request sent', exact: true })).toBeVisible();
  const requests = calls.filter((call) => call.path.endsWith('/request-access'));
  expect(requests).toHaveLength(3);
  expect(requests[2].body.requested_role).toBe('teacher');
  expect(requests[2].body.permissions).toBeUndefined();
  await expect(page.getByRole('link', { name: 'Staff home' })).toHaveCount(0);
});
