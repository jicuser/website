import { test, expect } from '@playwright/test';

test('portal password and email-link modes use one form and never create an account', async ({ page }) => {
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
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid credentials' }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: request.url().includes('/auth/v1/settings') ? '{"external":{"google":false}}' : '[]' });
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
  await expect(page.getByRole('status').filter({ hasText: 'If this email has an eligible account' })).toBeVisible();
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
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});
