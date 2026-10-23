import { test, expect } from '@playwright/test';
test.use({ screenshot: 'off' });

test('signing in from certificates returns to the selected certificate request', async ({
  page,
}) => {
  const account = '00000000-0000-4000-8000-000000000071';
  await page.route('**/preview-api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/auth/v1/token')
      ? {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          token_type: 'bearer',
          expires_in: 3600,
          user: { id: account, email: 'member@example.test' },
        }
      : path.endsWith('/get_my_profile')
        ? {
            id: account,
            is_active: true,
            is_owner: false,
            display_name: 'Example member',
            permissions: [],
          }
        : [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/portal?next=%2Faccount%2Fcertificates%3Frequest%3Dnikah');
  await page.getByLabel('Email address', { exact: true }).fill('member@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Example password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/account\/certificates\?request=nikah$/);
});

test('portal password and email-link modes use one form and never create an account', async ({
  page,
}) => {
  const otp = [];
  const password = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/preview-api/**', async (route) => {
    const request = route.request();
    if (request.url().includes('/auth/v1/otp')) {
      otp.push(request.postDataJSON());
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    } else if (request.url().includes('/auth/v1/token')) {
      password.push(request.postDataJSON());
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid credentials' }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: request.url().includes('/auth/v1/settings') ? '{"external":{"google":false}}' : '[]',
      });
    }
  });
  await page.goto('/portal');
  await expect(page.getByRole('heading', { name: 'Sign in to your Portal' })).toBeVisible();
  const form = page.getByRole('form', { name: 'Portal sign in' });
  await expect(form).toHaveCount(1);
  await expect(page.locator('form form')).toHaveCount(0);
  await page.getByLabel('Email address', { exact: true }).fill('parent@example.test');
  await page.getByRole('button', { name: 'Email sign-in link', exact: true }).click();
  await expect(page.locator('input[name="password"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'If this email has an eligible account' }),
  ).toBeVisible();
  expect(otp).toHaveLength(1);
  expect(otp[0].create_user).toBe(false);
  expect(otp[0].email).toBe('parent@example.test');
  expect(password).toHaveLength(0);
  await page.getByRole('button', { name: 'Password', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await form.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sign-in failed');
  expect(password).toHaveLength(1);
  expect(otp).toHaveLength(1);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
    false,
  );
});

for (const theme of ['light', 'dark']) {
  test(`member signs in to a personal home in ${theme} mode`, async ({ page }, testInfo) => {
    const id = '00000000-0000-4000-8000-000000000072';
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((theme) => localStorage.setItem('jic-theme', theme), theme);
    await page.route('**/preview-api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      const data = path.endsWith('/auth/v1/token')
        ? {
            access_token: 'test-token',
            refresh_token: 'test-refresh',
            token_type: 'bearer',
            expires_in: 3600,
            user: { id, email: 'member@example.test' },
          }
        : path.endsWith('/get_my_profile')
          ? {
              id,
              is_active: true,
              is_owner: false,
              display_name: 'Example member',
              permissions: [],
              staff_kinds: [],
            }
          : [];
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.goto('/portal');
    await page.getByLabel('Email address', { exact: true }).fill('member@example.test');
    await page.getByLabel('Password', { exact: true }).fill('Example password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Welcome, Example member' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Portal home', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByRole('link', { name: 'Staff home', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /My invoices/ })).toHaveAttribute(
      'href',
      '/account/invoices',
    );
    await expect(page.getByRole('link', { name: /My certificates/ })).toHaveAttribute(
      'href',
      '/account/certificates',
    );
    await expect(page.getByRole('link', { name: 'Change password', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: testInfo.outputPath(`member-home-${theme}.png`),
      fullPage: true,
    });
    await page.getByRole('link', { name: /My certificates/ }).click();
    await page.getByRole('link', { name: 'My account', exact: true }).click();
    await expect(page.getByRole('main', { name: 'Portal home', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

for (const width of [320, 390]) {
  test(`portal sign-in has compact ordered help and separate account creation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
    await page.route('**/*', (route) =>
      ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
        ? route.continue()
        : route.abort(),
    );
    await page.route('**/preview-api/**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: route.request().url().includes('/auth/v1/settings')
          ? '{"external":{"google":false}}'
          : '[]',
      }),
    );
    await page.goto('/portal');
    const signIn = page.locator('.portal-signin');
    const help = page.getByRole('complementary', { name: 'About your portal' });
    const bounds = await signIn.boundingBox();
    expect(bounds.height).toBeLessThan(670);
    expect((await help.boundingBox()).y).toBeGreaterThan(bounds.y + bounds.height);
    await expect(
      page.getByText('Family and learning records are not currently available here.'),
    ).toHaveCount(0);
    await expect(page.getByText(/Google sign-in is not connected/)).toHaveCount(0);
    const password = await page
      .getByRole('button', { name: 'Password', exact: true })
      .boundingBox();
    const emailLink = await page
      .getByRole('button', { name: 'Email sign-in link', exact: true })
      .boundingBox();
    expect(Math.abs(password.y - emailLink.y)).toBeLessThan(1);
    for (const theme of ['light', 'dark']) {
      await page.evaluate((mode) => {
        document.documentElement.dataset.theme = mode;
        document.documentElement.classList.toggle('dark', mode === 'dark');
      }, theme);
      await page.getByRole('button', { name: 'Create account', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Create your JIC account', exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel('Your name', { exact: true })).toBeVisible();
      await expect(page.locator('input[name="password"]')).toHaveCount(0);
      await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    expect(errors).toEqual([]);
  });
}
