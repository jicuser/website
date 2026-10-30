import { test, expect } from '@playwright/test';
import { sitewideFixture } from './helpers/sitewideFixture.mjs';

function deferred() {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
}

async function contentFixture(page, options = {}) {
  const evidence = await sitewideFixture(page, { signedIn: true });
  const content = new Map([['whatsapp_community_url', 'https://chat.whatsapp.com/Original']]);
  await page.route('**/preview-api/rest/v1/page_content*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'GET') {
      const key = url.searchParams.get('content_key')?.replace(/^eq\./, '');
      if (key === 'whatsapp_community_url' && options.read) {
        options.read.started.resolve();
        await options.read.finish.promise;
      }
      if (key === 'whatsapp_community_url' && options.readFailures > 0) {
        options.readFailures -= 1;
        return route.fulfill({ status: 503, json: { message: 'Connection unavailable' } });
      }
      const rows = [...content]
        .filter(([contentKey]) => !key || key === contentKey)
        .map(([content_key, content_value]) => ({ content_key, content_value }));
      return route.fulfill({ json: rows });
    }
    if (options.emptySave) return route.fulfill({ json: [] });
    const body = request.postDataJSON();
    const rows = Array.isArray(body) ? body : [body];
    if (options.write) {
      options.write.started.resolve();
      await options.write.finish.promise;
    }
    for (const row of rows) content.set(row.content_key, row.content_value);
    return route.fulfill({ json: rows.map(({ content_key }) => ({ content_key })) });
  });
  return evidence;
}

async function openSettings(page) {
  await page.goto('/admin?section=content');
  await page.getByText('Website settings', { exact: true }).click();
}

for (const editor of ['WhatsApp', 'header', 'team', 'permissions', 'Community Hub']) {
  test(`${editor} local save keeps navigation and sign out blocked until it settles`, async ({
    page,
  }) => {
    const write = { started: deferred(), finish: deferred() };
    const evidence = await contentFixture(page, { write });
    if (editor === 'permissions') {
      await page.route('**/preview-api/rest/v1/profiles*', (route) =>
        route.fulfill({
          json: [
            {
              id: '10000000-0000-4000-8000-000000000002',
              display_name: 'Test staff',
              is_owner: false,
              is_active: true,
              permissions: [],
              staff_kinds: [],
            },
          ],
        }),
      );
      await page.route('**/preview-api/functions/v1/manage-user', async (route) => {
        if (route.request().postDataJSON().action === 'set_permissions') {
          write.started.resolve();
          await write.finish.promise;
        }
        return route.fulfill({ json: { ok: true, requests: [] } });
      });
      await page.goto('/admin?section=users');
      const access = page.locator('.admin-staff-access');
      await access.locator(':scope > details > summary').click();
      await access.getByText('Website & media', { exact: true }).click();
      await access.getByRole('checkbox', { name: 'Website pages, posters and text' }).check();
      await access.getByRole('button', { name: 'Save permissions', exact: true }).click();
    } else if (editor === 'Community Hub') {
      await page.goto('/admin?section=visibility');
      await page
        .getByRole('checkbox', { name: 'Show Janazah, Nikah and giving shortcuts' })
        .uncheck();
      await page.getByRole('button', { name: 'Save Hub', exact: true }).click();
    } else if (editor === 'team') {
      await page.route('**/preview-api/rest/v1/team_members*', async (route) => {
        if (route.request().method() === 'GET') return route.fulfill({ json: [] });
        write.started.resolve();
        await write.finish.promise;
        return route.fulfill({ json: [{ id: 'saved-team-member' }] });
      });
      await page.goto('/admin?section=team');
      await page.getByRole('button', { name: 'Add team member', exact: true }).click();
      await page.getByLabel('Name', { exact: true }).fill('New staff member');
      await page.getByRole('combobox', { name: 'Team section', exact: true }).selectOption('staff');
      await page.locator('form').getByRole('button', { name: 'Save team member' }).click();
    } else {
      await openSettings(page);
      if (editor === 'WhatsApp') {
        await expect(page.getByLabel('Community invite URL')).toHaveValue(
          'https://chat.whatsapp.com/Original',
        );
        await page.getByLabel('Community invite URL').fill('https://chat.whatsapp.com/Updated');
        await page.getByRole('button', { name: 'Save link', exact: true }).click();
      } else {
        await page.getByRole('button', { name: 'Add banner message', exact: true }).click();
        await page.getByRole('textbox', { name: 'Ticker text', exact: true }).fill('Centre update');
        await page
          .locator('#staff-content')
          .getByRole('button', { name: 'Save header content', exact: true })
          .click();
      }
    }
    await write.started.promise;
    try {
      await expect(page.getByRole('button', { name: 'View website', exact: true })).toBeDisabled();
      await expect(page.getByRole('combobox', { name: 'Go to admin area' })).toBeDisabled();
      await page.locator('.admin-account-menu > summary').click();
      await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeDisabled();
    } finally {
      write.finish.resolve();
    }
    await expect(page.getByRole('button', { name: 'View website', exact: true })).toBeEnabled();
    expect(evidence.errors).toEqual([]);
  });
}

test('WhatsApp settings cannot be edited before the saved link finishes loading', async ({
  page,
}) => {
  const read = { started: deferred(), finish: deferred() };
  await contentFixture(page, { read });
  await openSettings(page);
  await read.started.promise;
  try {
    await expect(page.getByLabel('Community invite URL')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save link', exact: true })).toBeDisabled();
  } finally {
    read.finish.resolve();
  }
  await expect(page.getByLabel('Community invite URL')).toHaveValue(
    'https://chat.whatsapp.com/Original',
  );
  await expect(page.getByLabel('Community invite URL')).toBeEnabled();
});

test('WhatsApp save retains edits typed while its request is pending', async ({ page }) => {
  const write = { started: deferred(), finish: deferred() };
  const evidence = await contentFixture(page, { write });
  await openSettings(page);
  const input = page.getByLabel('Community invite URL');
  await expect(input).toHaveValue('https://chat.whatsapp.com/Original');
  await input.fill('https://chat.whatsapp.com/First');
  await page.getByRole('button', { name: 'Save link', exact: true }).click();
  await write.started.promise;
  await input.fill('https://chat.whatsapp.com/LaterDraft');
  write.finish.resolve();
  await expect(page.getByRole('button', { name: 'Save link', exact: true })).toBeEnabled();
  await expect(input).toHaveValue('https://chat.whatsapp.com/LaterDraft');
  await expect(page.locator('.admin-save-pending')).toBeVisible();
  expect(evidence.errors).toEqual([]);
});

test('WhatsApp load failure keeps editing blocked until a successful retry', async ({ page }) => {
  const evidence = await contentFixture(page, { readFailures: 1 });
  await openSettings(page);
  await expect(page.getByRole('alert')).toContainText('could not be loaded');
  await expect(page.getByLabel('Community invite URL')).toBeDisabled();
  await page.getByRole('button', { name: 'Retry link', exact: true }).click();
  await expect(page.getByLabel('Community invite URL')).toHaveValue(
    'https://chat.whatsapp.com/Original',
  );
  await expect(page.getByLabel('Community invite URL')).toBeEnabled();
  expect(evidence.errors).toEqual([]);
});

test('WhatsApp save keeps the draft when the database confirms no saved row', async ({ page }) => {
  await contentFixture(page, { emptySave: true });
  await openSettings(page);
  const input = page.getByLabel('Community invite URL');
  await expect(input).toHaveValue('https://chat.whatsapp.com/Original');
  await input.fill('https://chat.whatsapp.com/Unsaved');
  await page.getByRole('button', { name: 'Save link', exact: true }).click();
  await expect(page.getByText('The community link was not saved.', { exact: true })).toBeVisible();
  await expect(input).toHaveValue('https://chat.whatsapp.com/Unsaved');
  await expect(page.getByRole('button', { name: 'Save link', exact: true })).toBeEnabled();
  await expect(page.locator('.admin-save-pending')).toBeVisible();
});
