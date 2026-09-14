import { test, expect } from '@playwright/test';

const user = { id: '00000000-0000-4000-8000-000000000091', email: 'student@example.org' };

async function setup(page, { signedIn = false, onRequest = () => {} } = {}) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(
    ({ signedIn, user }) => {
      sessionStorage.setItem('jic-salawat-shown', '1');
      if (signedIn)
        sessionStorage.setItem(
          'sb-127-auth-token',
          JSON.stringify({
            access_token: 'preview-jwt',
            refresh_token: 'preview-refresh',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user,
          }),
        );
    },
    { signedIn, user },
  );
  await page.route('**/preview-api/**', async (route) => {
    onRequest(route.request());
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/user')
      ? user
      : path.endsWith('/get_my_profile')
        ? { ...user, display_name: 'Student', is_active: true, is_owner: false, permissions: [] }
        : path.endsWith('/recover')
          ? {}
          : [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return errors;
}

test('password recovery requests the setup return path and displays a generic confirmation', async ({
  page,
}) => {
  const requests = [];
  const errors = await setup(page, {
    onRequest: (request) => {
      if (new URL(request.url()).pathname.endsWith('/recover')) requests.push(request);
    },
  });
  await page.goto('/account/recovery');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText('If an account matches that email address');
  expect(requests).toHaveLength(1);
  expect(requests[0].postDataJSON().email).toBe(user.email);
  expect(new URL(requests[0].url()).searchParams.get('redirect_to')).toBe(
    'http://127.0.0.1:4319/admin/setup',
  );
  expect(errors).toEqual([]);
});

test('a student who sets a password is sent to the member portal', async ({ page }) => {
  const errors = await setup(page, { signedIn: true });
  await page.goto('/admin/setup');
  await page.getByLabel('New password', { exact: true }).fill('a long student passphrase');
  await page.getByLabel('Confirm password', { exact: true }).fill('a long student passphrase');
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Continue to your portal' })).toHaveAttribute(
    'href',
    '/portal',
  );
  expect(errors).toEqual([]);
});

test('a disabled workspace never requests the sermon archive table', async ({ page }) => {
  test.skip(process.env.VITE_ENABLE_WORKSPACE === 'true', 'Run with the workspace disabled.');
  const requests = [];
  const errors = await setup(page, { onRequest: (request) => requests.push(request.url()) });
  await page.goto('/talks');
  await expect(
    page.getByText('The recordings and reading archive is being prepared.'),
  ).toBeVisible();
  expect(requests.some((url) => url.includes('/sermon_publications'))).toBe(false);
  expect(errors).toEqual([]);
});
