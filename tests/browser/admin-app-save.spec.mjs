import { test, expect } from '@playwright/test';
import { sitewideFixture } from './helpers/sitewideFixture.mjs';

function deferred() {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
}

test('app content local publish blocks navigation and sign out until both writes finish', async ({
  page,
}) => {
  const evidence = await sitewideFixture(page, { signedIn: true });
  const writes = new Map(
    ['mobile_branding', 'reading_library'].map((key) => [
      key,
      { started: deferred(), finish: deferred() },
    ]),
  );
  await page.route('**/preview-api/rest/v1/page_content*', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: [] });
    const row = route.request().postDataJSON();
    const write = writes.get(row.content_key);
    write.started.resolve();
    await write.finish.promise;
    return route.fulfill({ json: [{ content_key: row.content_key }] });
  });
  await page.goto('/admin?section=app_content');
  await page.getByLabel('Home background', { exact: true }).fill('/new-home.png');
  await page
    .locator('#staff-content')
    .getByRole('button', { name: 'Publish app content', exact: true })
    .click();
  try {
    await page.locator('.admin-account-menu > summary').click();
    for (const write of writes.values()) {
      await write.started.promise;
      await expect(page.getByRole('button', { name: 'View website', exact: true })).toBeDisabled();
      await expect(page.getByRole('combobox', { name: 'Go to admin area' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeDisabled();
      write.finish.resolve();
    }
  } finally {
    for (const write of writes.values()) write.finish.resolve();
  }
  await expect(page.getByRole('button', { name: 'View website', exact: true })).toBeEnabled();
  await expect(page.getByText('Published app content.', { exact: true })).toBeVisible();
  expect(evidence.errors).toEqual([]);
});
