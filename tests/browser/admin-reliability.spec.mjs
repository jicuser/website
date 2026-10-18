import { test, expect } from '@playwright/test';
import { DEFAULT_TV_SETTINGS } from '../../supabase/functions/_shared/tv.js';

const owner = {
  id: '10000000-0000-4000-8000-000000000001',
  display_name: 'Centre owner',
  is_owner: true,
  is_active: true,
  permissions: [],
  staff_kinds: [],
};
const member = {
  id: '10000000-0000-4000-8000-000000000002',
  display_name: 'Test staff',
  is_owner: false,
  is_active: false,
  permissions: [],
  staff_kinds: [],
};

test('admin overview searches available tasks and mobile switching opens the chosen area', async ({
  page,
}, testInfo) => {
  const evidence = await openAdmin(page, { section: 'dashboard' });
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Find an admin task' }).fill('prayer');
  await expect(
    page.locator('.admin-tool-list').getByRole('button', { name: 'Prayer times', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.admin-tool-list').getByRole('button', { name: 'Staff & access', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Find an admin task' }).fill('');
  await page.screenshot({ path: testInfo.outputPath('admin-overview-mobile.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Go to admin area' }).selectOption('messages');
  await expect(page.getByRole('heading', { name: 'Contact messages', exact: true })).toBeVisible();
  expect(evidence.writes).toEqual([]);
  expect(evidence.errors).toEqual([]);
});

for (const width of [390, 1280]) {
  test(`staff task groups and account controls stay clear in both themes at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const evidence = await openAdmin(page, { section: 'dashboard' });
    await expect(page.locator('.admin-tool-group[open]')).toHaveCount(0);
    await page.locator('.admin-tools summary').filter({ hasText: 'Website content' }).click();
    await page
      .locator('.admin-tool-list')
      .getByRole('button', { name: 'Notices', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: 'Notices', exact: true })).toBeVisible();
    if (width > 800) {
      await expect(
        page
          .getByRole('navigation', { name: 'Admin sections' })
          .getByRole('button', { name: 'Notices', exact: true }),
      ).toHaveAttribute('aria-current', 'page');
    }
    for (const theme of ['dark', 'light']) {
      await page.locator('.admin-account-menu > summary').click();
      await expect(page.getByRole('button', { name: 'My account', exact: true })).toBeVisible();
      await page.getByRole('button', { name: `Use ${theme} mode`, exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.keyboard.press('Escape');
      await expect(page.locator('.admin-account-menu')).not.toHaveAttribute('open');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: testInfo.outputPath(`staff-notices-${theme}-${width}.png`),
        fullPage: true,
      });
    }
    expect(evidence.writes).toEqual([]);
    expect(evidence.errors).toEqual([]);
  });
}

test('account menu keeps the unsaved-change guard when opening a personal account', async ({
  page,
}) => {
  const evidence = await openAdmin(page, { section: 'announcements' });
  await page.getByLabel('Title', { exact: true }).fill('Unsaved notice');
  await page.locator('.admin-account-menu > summary').click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'My account', exact: true }).click();
  await expect(page).toHaveURL(/section=announcements/);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Unsaved notice');
  expect(evidence.writes).toEqual([]);
  expect(evidence.errors).toEqual([]);
});

// Intercept external data only. The application router, Auth provider and editors run unchanged.
async function openAdmin(
  page,
  { actor = owner, section = 'posters', deletionFails = false, tvState = null } = {},
) {
  const errors = [],
    writes = [],
    tvReads = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('jic-salawat-shown', '1'));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    return route.continue();
  });
  await page.route('**/preview-api/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    let data = [];
    if (url.pathname.includes('/auth/v1/token')) {
      const expires = Math.floor(Date.now() / 1000) + 3600;
      const user = {
        id: actor.id,
        email: 'staff@example.invalid',
        role: 'authenticated',
        aud: 'authenticated',
        user_metadata: {},
        app_metadata: {},
      };
      const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
      data = {
        user,
        access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: actor.id, exp: expires })}.test`,
        refresh_token: 'local-test-only',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: expires,
      };
    } else if (url.pathname.endsWith('/rpc/get_my_profile')) data = actor;
    else if (url.pathname.endsWith('/profiles')) data = [actor, member];
    else if (url.pathname.endsWith('/functions/v1/tv-control') && tvState) {
      const body = route.request().postDataJSON();
      if (['admin', 'status'].includes(body.action)) tvReads.push(body.screenId);
      else writes.push(body);
      if (body.action === 'save-background')
        tvState = { ...tvState, settings: body.settings, updated_at: '2026-10-15T11:00:00Z' };
      data = { ...tvState, id: body.screenId };
    } else if (url.pathname.endsWith('/functions/v1/manage-user')) {
      const body = route.request().postDataJSON();
      writes.push(body);
      if (deletionFails && body.action === 'delete')
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Account has retained records.' }),
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
  return { errors, writes, tvReads };
}

for (const width of [390, 1280]) {
  test(`board picker previews, restores and explicitly saves at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const original = structuredClone(DEFAULT_TV_SETTINGS);
    const evidence = await openAdmin(page, {
      section: 'tv',
      tvState: {
        settings: original,
        updated_at: '2026-10-14T10:00:00Z',
        presentation: null,
        templates: [],
        inputs: [],
        devices: [],
        relayConfigured: false,
      },
    });
    await page.getByRole('button', { name: 'Edit automatic display', exact: true }).first().click();
    const picker = page.getByRole('region', { name: 'Choose a starting layout' });
    await picker.getByRole('button', { name: /^Countdown A large/ }).click();
    const cardContrast = await picker.evaluate((element) => {
      const root = document.documentElement;
      const originalTheme = root.getAttribute('data-theme');
      const luminance = (color) => {
        const channels = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const results = [];
      for (const theme of ['light', 'dark']) {
        root.setAttribute('data-theme', theme);
        for (const card of element.querySelectorAll('.tv-board-choices > button')) {
          const background = luminance(getComputedStyle(card).backgroundColor);
          for (const text of card.querySelectorAll('strong, strong + span')) {
            const foreground = luminance(getComputedStyle(text).color);
            results.push(
              (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05),
            );
          }
        }
      }
      if (originalTheme === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', originalTheme);
      return results;
    });
    expect(Math.min(...cardContrast)).toBeGreaterThanOrEqual(4.5);
    await expect(picker.locator('iframe')).toBeVisible();
    await expect(
      picker.frameLocator('iframe').locator('[data-board-layout="countdown"]'),
    ).toBeVisible();
    expect(evidence.writes).toEqual([]);
    await picker.getByRole('button', { name: 'After-prayer dhikr', exact: true }).click();
    await expect(picker.frameLocator('iframe').locator('.tv-dhikr')).toBeVisible();
    await picker.getByRole('button', { name: 'Everyday display', exact: true }).click();
    await page.screenshot({
      path: testInfo.outputPath(`board-picker-${width}.png`),
      fullPage: true,
    });
    await picker.getByRole('button', { name: 'Use Countdown', exact: true }).click();
    await expect(page.locator('.tv-layout-editor [data-board-layout="countdown"]')).toBeVisible();
    expect(evidence.writes).toEqual([]);
    await picker.getByRole('button', { name: 'Restore previous layout', exact: true }).click();
    await expect(page.locator('.tv-layout-editor [data-board-layout="countdown"]')).toHaveCount(0);
    await picker.getByRole('button', { name: /^Timetable & notices Prayer/ }).click();
    await picker.getByRole('button', { name: 'Use Timetable & notices', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page
      .locator('.tv-save-actions')
      .getByRole('button', { name: 'Save display settings', exact: true })
      .click();
    await expect.poll(() => evidence.writes.length).toBe(1);
    const save = evidence.writes[0];
    expect(save.action).toBe('save-background');
    expect(save.expectedUpdatedAt).toBe('2026-10-14T10:00:00Z');
    expect(save.settings.display_layouts.landscape.standby.id).toBe(
      'standby-board-classic-landscape',
    );
    expect(save.settings.display_layouts.portrait).toEqual(original.display_layouts.portrait);
    for (const preset of ['before', 'jamaah', 'dhikr', 'jummah', 'ramadan'])
      expect(save.settings.display_layouts.landscape[preset]).toEqual(
        original.display_layouts.landscape[preset],
      );
    expect(evidence.errors).toEqual([]);
  });
}

for (const existingDraft of [false, true]) {
  test(`automatic display keeps presentation storage untouched (${existingDraft ? 'existing draft' : 'no draft'})`, async ({
    page,
  }) => {
    const key = `jic-stream-workspace:${owner.id}:mens-main`;
    const settings = structuredClone(DEFAULT_TV_SETTINGS);
    settings.scene_mode = 'teaching';
    settings.scenes = [
      {
        id: 'lesson',
        name: 'Lesson',
        layers: [{ id: 'clock', type: 'clock', x: 0, y: 0, width: 100, height: 100 }],
      },
    ];
    settings.active_scene_id = 'lesson';
    const draft = existingDraft
      ? JSON.stringify({
          form: { ...settings, muted: false },
          baseline: settings,
          managedId: 'live-session',
          streamName: 'Unpublished lesson',
          stage: 3,
          revision: '2026-10-14T09:00:00Z',
        })
      : null;
    await page.addInitScript(
      ({ key, draft }) => {
        if (draft) sessionStorage.setItem(key, draft);
        else sessionStorage.removeItem(key);
      },
      { key, draft },
    );
    const evidence = await openAdmin(page, {
      section: 'tv',
      tvState: {
        settings,
        updated_at: '2026-10-14T10:00:00Z',
        presentation: { id: 'live-session' },
        templates: [],
        inputs: [],
        devices: [],
        relayConfigured: false,
      },
    });
    await page.getByRole('button', { name: 'Edit automatic display', exact: true }).first().click();
    const layout = page
      .getByRole('group', { name: 'Display sections', exact: true })
      .getByRole('button', { name: 'Everyday display', exact: true });
    await expect(layout).toBeVisible();
    await expect(layout).toHaveAttribute('aria-pressed', 'true');
    const readCount = evidence.tvReads.filter((screen) => screen === 'mens-main').length;
    // Automatic settings still poll the server after their initial load.
    await expect
      .poll(() => evidence.tvReads.filter((screen) => screen === 'mens-main').length, {
        timeout: 8000,
      })
      .toBeGreaterThan(readCount);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBe(draft);
    await page.getByRole('button', { name: 'Back to screens', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Current screens', exact: true })).toBeVisible();
    expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBe(draft);
    expect(evidence.writes).toEqual([]);
    expect(evidence.errors).toEqual([]);
  });
}

for (const width of [320, 390, 1280]) {
  test(`poster editing and section navigation remain usable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const evidence = await openAdmin(page);
    const cards = page.locator('.admin-poster-picker button');
    await expect(cards.first()).toBeVisible();
    const geometry = await cards.evaluateAll((elements) =>
      elements
        .filter((e) => e.querySelector('img'))
        .map((e) => {
          const image = e.querySelector('img').getBoundingClientRect();
          const title = e.querySelector('span').getBoundingClientRect();
          return { below: title.top >= image.bottom - 1, width: title.width };
        }),
    );
    expect(geometry.length).toBeGreaterThan(0);
    expect(geometry.every((card) => card.below && card.width > 70)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`posters-${width}.png`) });
    await expect(page.locator('.admin-mobile-section')).toHaveCount(1);
    if (width < 801) {
      await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
      await expect(page.getByRole('combobox', { name: 'Go to admin area' })).toHaveValue('posters');
      await expect(page.getByRole('button', { name: 'Overview', exact: true })).toBeVisible();
      await page.evaluate(() => scrollTo(0, 800));
      const box = await page.locator('.admin-mobile-section').boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThan(900);
    } else {
      await expect(page.locator('.admin-mobile-section')).toBeHidden();
      await expect(page.getByRole('navigation', { name: 'Admin sections' })).toBeVisible();
    }
    await cards.first().click();
    await page.getByRole('button', { name: 'Edit poster', exact: true }).click();
    await expect(page.getByLabel('Poster name', { exact: true })).toBeVisible();
    const top = await page.locator('.scene-properties').evaluate((el) => ({
      editor: el.getBoundingClientRect().top,
      toolbar: document.querySelector('.admin-toolbar').getBoundingClientRect().bottom,
    }));
    expect(top.editor).toBeGreaterThanOrEqual(top.toolbar - 1);
    await page.getByLabel('Poster name', { exact: true }).fill('Updated test poster');
    expect(evidence.writes).toHaveLength(0);
    // Exercise the sticky save action on phones and the editor action on desktop.
    const saveArea = page.locator(width < 801 ? '.admin-toolbar' : '.admin-main');
    await saveArea.getByRole('button', { name: 'Publish posters', exact: true }).click();
    await expect.poll(() => evidence.writes.length).toBe(1);
    await expect(page.locator('.admin-toolbar .admin-save-pending')).toHaveCount(0);
    if (width < 801) {
      await page.getByRole('button', { name: 'Overview', exact: true }).click();
      await page.locator('.admin-tools summary').filter({ hasText: 'Website content' }).click();
      await page.getByRole('button', { name: 'Notices', exact: true }).click();
    } else {
      await page
        .getByRole('navigation', { name: 'Admin sections' })
        .getByRole('button', { name: 'Notices', exact: true })
        .click();
    }
    await expect(page.getByRole('heading', { name: 'Notices', exact: true })).toBeVisible();
    expect(evidence.errors).toEqual([]);
  });
}

test('only owners can see deletion controls and confirmation cannot be skipped', async ({
  page,
}) => {
  const evidence = await openAdmin(page, { section: 'users' });
  const account = page.locator('.admin-staff-access details').filter({ hasText: 'Test staff' });
  await account.locator('summary').click();
  await account.getByRole('button', { name: 'Delete account', exact: true }).click();
  await expect(
    account.getByRole('button', { name: 'Delete permanently', exact: true }),
  ).toBeDisabled();
  await account.getByLabel('Type DELETE to confirm').fill('DELETE');
  await account.getByRole('button', { name: 'Cancel deletion' }).click();
  expect(evidence.writes).toEqual([]);
  await account.getByRole('button', { name: 'Delete account', exact: true }).click();
  await account.getByLabel('Type DELETE to confirm').fill('DELETE');
  await account.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(account).toHaveCount(0);
  expect(evidence.writes).toEqual([
    { action: 'delete', user_id: member.id, confirmation: 'DELETE' },
  ]);
  expect(evidence.errors).toEqual([]);
});

test('failed deletion keeps the staff account and displays the server explanation', async ({
  page,
}) => {
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
