import { test, expect } from '@playwright/test';
import { DEFAULT_TV_SETTINGS } from '../../supabase/functions/_shared/tv.js';
import { DEFAULT_POSTERS } from '../../src/lib/posters.js';

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
    page.locator('.admin-tool-list').getByRole('button', { name: 'People & access', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Find an admin task' }).fill('');
  await page.screenshot({ path: testInfo.outputPath('admin-overview-mobile.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Go to admin area' }).selectOption('forms');
  await expect(page.getByRole('heading', { name: 'Forms', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Contact Us/ })).toBeVisible();
  expect(evidence.writes).toEqual([]);
  expect(evidence.errors).toEqual([]);
});

for (const width of [320, 390, 1280]) {
  test(`staff task groups and account controls stay clear in both themes at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const evidence = await openAdmin(page, { section: 'dashboard' });
    await page.getByRole('link', { name: 'Skip to staff tools' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#staff-content')).toBeFocused();
    const sizes = await page.locator('.admin-area-tiles').evaluate((grid) => ({
      columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      heights: [...grid.children].map((tile) => tile.getBoundingClientRect().height),
    }));
    expect(sizes.columns).toBe(width < 700 ? 2 : 4);
    expect(Math.max(...sizes.heights) - Math.min(...sizes.heights)).toBeLessThan(1);
    expect(Math.min(...sizes.heights)).toBeGreaterThanOrEqual(44);
    const websiteTile = page
      .locator('.admin-area-tiles')
      .getByRole('button', { name: 'Website content', exact: true });
    await websiteTile.click();
    await expect(page.locator('.admin-area-heading h3')).toBeFocused();
    await expect(
      page.locator('.admin-tool-list').getByRole('button', { name: 'Website menus', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'All tools', exact: true }).click();
    await expect(websiteTile).toBeFocused();
    await websiteTile.click();
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
    }
    expect(evidence.writes).toEqual([]);
    expect(evidence.errors).toEqual([]);
  });
}

test('account menu keeps the unsaved-change guard when opening a personal account', async ({
  page,
}) => {
  const evidence = await openAdmin(page, { section: 'announcements' });
  await page.getByRole('button', { name: 'New notice', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Unsaved notice');
  await page.locator('.admin-account-menu > summary').click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'My account', exact: true }).click();
  await expect(page).toHaveURL(/section=announcements/);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Unsaved notice');
  expect(evidence.writes).toEqual([]);
  expect(evidence.errors).toEqual([]);
});

test('safeguarding opens with a useful empty state and optional recording guidance', async ({
  page,
}) => {
  const evidence = await openAdmin(page, { section: 'safeguarding' });
  await expect(
    page.getByRole('heading', { name: 'Safeguarding reviews', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.ops-stats')).toHaveCount(0);
  const guidance = page.locator('.ops-recording-guidance');
  await expect(guidance).not.toHaveAttribute('open');
  await guidance.locator('summary').click();
  await expect(guidance).toContainText('no official expiry date');
  expect(
    await page
      .locator('.ops-admin')
      .evaluate(
        (node) =>
          getComputedStyle(node).getPropertyValue('--ops-ink').trim() ===
          getComputedStyle(node).getPropertyValue('--jic-text').trim(),
      ),
  ).toBe(true);
  expect(evidence.writes).toEqual([]);
  expect(evidence.errors).toEqual([]);
});

// Intercept external data only. The application router, Auth provider and editors run unchanged.
async function openAdmin(
  page,
  {
    actor = owner,
    section = 'posters',
    deletionFails = false,
    tvState = null,
    formRows = [],
    customForms = [],
    formTasks = [],
    sitePages = [],
    initialPosters,
  } = {},
) {
  const errors = [],
    writes = [],
    tvReads = [];
  const content = new Map(
    initialPosters ? [['programme_posters', JSON.stringify(initialPosters)]] : [],
  );
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
    else if (url.pathname.endsWith('/rpc/admin_forms_overview')) data = customForms;
    else if (url.pathname.endsWith('/rpc/search_form_submissions')) {
      const query = route.request().postDataJSON();
      const matching = formRows.filter(
        (row) =>
          (!query.p_kind || row.kind === query.p_kind) &&
          (!query.p_search ||
            JSON.stringify(row.payload).toLowerCase().includes(query.p_search.toLowerCase())),
      );
      const selected = matching.filter((row) => !query.p_status || row.status === query.p_status);
      data = {
        rows: selected.slice(query.p_offset, query.p_offset + query.p_limit),
        total: selected.length,
        new_count: matching.filter((row) => row.status === 'new').length,
        done_count: matching.filter((row) => row.status === 'done').length,
      };
    } else if (url.pathname.endsWith('/form_submissions') && method === 'PATCH') {
      const body = route.request().postDataJSON();
      const row = formRows.find((item) => `eq.${item.id}` === url.searchParams.get('id'));
      writes.push({ table: 'form_submissions', id: row?.id, ...body });
      if (row) Object.assign(row, body);
      data = { id: row?.id };
    } else if (url.pathname.endsWith('/rpc/list_site_pages')) {
      data = sitePages.filter((item) => item.published);
    } else if (url.pathname.endsWith('/rpc/get_site_page')) {
      const query = route.request().postDataJSON();
      data = sitePages.find((item) => item.slug === query.p_slug && item.published) || null;
    } else if (url.pathname.endsWith('/site_pages')) {
      data = sitePages;
    } else if (url.pathname.endsWith('/rpc/admin_form_tasks')) {
      data = {
        rows: formTasks,
        total: formTasks.length,
        open_count: formTasks.filter((task) => task.status !== 'done').length,
      };
    } else if (url.pathname.endsWith('/work_tasks') && method === 'PATCH') {
      const body = route.request().postDataJSON();
      writes.push({ table: 'work_tasks', ...body });
      const task = formTasks.find((item) => `eq.${item.id}` === url.searchParams.get('id'));
      if (task) Object.assign(task, body);
      data = { id: task?.id };
    } else if (url.pathname.endsWith('/profiles')) data = [actor, member];
    else if (url.pathname.endsWith('/functions/v1/tv-control') && tvState) {
      const body = route.request().postDataJSON();
      if (['admin', 'status'].includes(body.action)) tvReads.push(body.screenId);
      else writes.push(body);
      if (body.action === 'save-background')
        tvState = { ...tvState, settings: body.settings, updated_at: '2026-10-15T11:00:00Z' };
      data = { ...tvState, id: body.screenId };
    } else if (url.pathname.endsWith('/functions/v1/manage-user')) {
      const body = route.request().postDataJSON();
      if (body.action !== 'list_access_requests') writes.push(body);
      if (deletionFails && body.action === 'delete')
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Account has retained records.' }),
        });
      data = { ok: true };
    } else if (url.pathname.endsWith('/page_content') && method === 'GET') {
      data = [...content].map(([content_key, content_value]) => ({ content_key, content_value }));
    } else if (url.pathname.endsWith('/page_content') && method !== 'GET') {
      const body = route.request().postDataJSON();
      writes.push(body);
      content.set(body.content_key, body.content_value);
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

test('poster locations override a linked page listing and preserve screen settings', async ({
  page,
}) => {
  const linkedPage = {
    id: 'page-quran-circle',
    slug: 'quran-circle',
    title: 'Open Qur’an Circle details',
    source_poster_id: DEFAULT_POSTERS[0].id,
    placement: '/',
    published: true,
    registration: 'none',
    kind: 'page',
    body: 'Programme information stays available.',
  };
  const evidence = await openAdmin(page, { sitePages: [linkedPage] });
  await page.locator('.admin-poster-picker button').first().click();
  const locations = page.getByRole('group', { name: 'Website poster locations' });
  await expect(locations).toBeVisible();
  await expect(locations.getByLabel('What’s on (homepage)', { exact: true })).toBeChecked();
  await locations.getByLabel('What’s on (homepage)', { exact: true }).uncheck();
  await locations.getByLabel('Services', { exact: true }).check();
  expect(evidence.writes).toHaveLength(0);
  await page
    .locator('.admin-toolbar')
    .getByRole('button', { name: 'Publish posters', exact: true })
    .click();
  await expect.poll(() => evidence.writes.length).toBe(1);
  const saved = evidence.writes[0];
  expect(saved.content_key).toBe('programme_posters');
  const posters = JSON.parse(saved.content_value);
  expect(posters[0]).toEqual({
    ...DEFAULT_POSTERS[0],
    groups: ['education', 'worship', 'services'],
    website_locations: ['/education', '/worship', '/social-media', '/services'],
  });
  expect(posters.slice(1)).toEqual(DEFAULT_POSTERS.slice(1));
  expect(evidence.tvReads).toEqual([]);
  await page.goto('/');
  await expect(
    page
      .locator('.jic-programmes')
      .getByRole('heading', { name: 'Open Qur’an Circle', exact: true }),
  ).toHaveCount(0);
  await page.goto('/services');
  await expect(
    page
      .locator('.jic-programmes')
      .getByRole('heading', { name: 'Open Qur’an Circle', exact: true }),
  ).toBeVisible();
  await page.goto('/pages/quran-circle');
  await expect(page.getByRole('heading', { name: linkedPage.title, exact: true })).toBeVisible();
  expect(evidence.errors).toEqual([]);
});

for (const [label, website_locations, count] of [
  ['hidden', [], 0],
  ['selected', ['/social-media'], 5],
]) {
  test(`explicit poster locations keep social previews ${label}`, async ({ page }) => {
    const evidence = await openAdmin(page, {
      initialPosters: [{ ...DEFAULT_POSTERS[0], website_locations }],
    });
    await page.goto('/social-media');
    await expect(page.getByRole('heading', { name: 'Stay connected to JIC.' })).toBeVisible();
    await expect(page.locator('.ops-social-poster-link')).toHaveCount(count);
    expect(evidence.writes).toEqual([]);
    expect(evidence.errors).toEqual([]);
  });
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
    await page.getByText('Change layout', { exact: true }).click();
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
    const layout = page.getByRole('combobox', { name: 'When this layout appears', exact: true });
    await expect(layout).toBeVisible();
    await expect(layout).toHaveValue('standby');
    const readCount = evidence.tvReads.filter((screen) => screen === 'mens-main').length;
    // Automatic settings still poll the server after their initial load.
    await expect
      .poll(() => evidence.tvReads.filter((screen) => screen === 'mens-main').length, {
        timeout: 8000,
      })
      .toBeGreaterThan(readCount);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBe(draft);
    await page.getByRole('button', { name: 'Back to screens', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Choose a screen', exact: true })).toBeVisible();
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
      await expect(page.getByRole('button', { name: 'Staff home', exact: true })).toBeVisible();
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
      await page.getByRole('button', { name: 'Staff home', exact: true }).click();
      await page
        .locator('.admin-area-tiles')
        .getByRole('button', { name: 'Website content', exact: true })
        .click();
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
  await account.locator(':scope > summary').click();
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
  await account.locator(':scope > summary').click();
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
  await expect(page.locator('.admin-staff-access > details.admin-panel')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Delete account', exact: true })).toHaveCount(0);
  expect(evidence.writes).toEqual([]);
  expect(evidence.errors).toEqual([]);
});

test('one Forms workspace includes Contact Us with accurate totals and keeps existing records', async ({
  page,
}) => {
  const formRows = Array.from({ length: 9 }, (_, index) => ({
    id: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    kind: 'contact',
    status: 'new',
    payload: {
      name: `Visitor ${index}`,
      email: `visitor${index}@example.test`,
      message: `Enquiry ${index}`,
    },
    created_at: '2026-10-18T10:00:00Z',
  }));
  const original = structuredClone(formRows);
  const evidence = await openAdmin(page, {
    section: 'dashboard',
    formRows,
    customForms: [
      {
        id: '30000000-0000-4000-8000-000000000001',
        title: 'Course registration',
        slug: 'course-registration',
        new_count: 3,
        done_count: 0,
        open_actions: 0,
        people: [],
        enabled: true,
        published_version: 1,
      },
    ],
  });
  const attention = page.locator('.admin-attention-grid > button');
  await expect(attention).toHaveCount(1);
  await expect(attention.locator('strong')).toHaveText('12');
  await attention.click();
  const contact = page.locator('.content-form-card').filter({ hasText: 'Contact Us' });
  await expect(contact).toContainText('9 waiting');
  await expect(
    page.locator('.content-form-card').filter({ hasText: 'Course registration' }),
  ).toContainText('3 waiting');
  await contact.click();
  await expect(page).toHaveURL(/section=forms.*view=responses.*kind=contact/);
  await expect(
    page.getByRole('heading', { name: 'Contact Us responses', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Form', exact: true })).toHaveValue('contact');
  await expect(page.locator('.custom-response')).toHaveCount(9);
  await page.locator('.custom-response summary').first().click();
  await expect(page.getByRole('link', { name: 'Open email draft', exact: true })).toHaveAttribute(
    'href',
    /^mailto:visitor0%40example\.test/,
  );
  await page.getByRole('button', { name: 'Mark completed', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Completed 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Completed 1', exact: true }).click();
  await expect(page.locator('.custom-response')).toHaveCount(1);
  await page.locator('.custom-response summary').click();
  await page.getByRole('button', { name: 'Reopen', exact: true }).click();
  await page.getByRole('button', { name: 'Waiting 9', exact: true }).click();
  await expect(page.locator('.custom-response')).toHaveCount(9);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Form', exact: true })).toHaveValue('contact');
  await expect(page.locator('.custom-response')).toHaveCount(9);
  expect(formRows).toEqual(original);
  expect(evidence.writes).toEqual([
    { table: 'form_submissions', id: original[0].id, status: 'done' },
    { table: 'form_submissions', id: original[0].id, status: 'new' },
  ]);
  expect(evidence.errors).toEqual([]);
});

for (const [permission, kind, title] of [
  ['forms_contact', 'contact', 'Contact Us'],
  ['forms_madrassah', 'madrassah', 'Madrassah enquiry'],
]) {
  test(`${permission} retains access only to its existing built-in form`, async ({ page }) => {
    const actor = { ...owner, is_owner: false, permissions: [permission] };
    const evidence = await openAdmin(page, { actor, section: 'forms' });
    await expect(page.locator('.content-form-card')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'New form', exact: true })).toHaveCount(0);
    await page.locator('.content-form-card').click();
    const selector = page.getByRole('combobox', { name: 'Form', exact: true });
    await expect(selector).toHaveValue(kind);
    await expect(selector.locator('option')).toHaveText(['All forms', title]);
    if (kind === 'contact') {
      await page.goto('/admin?section=messages');
      await expect(page).toHaveURL(/section=forms.*view=responses.*kind=contact/);
      await expect(
        page.getByRole('heading', { name: 'Contact Us responses', exact: true }),
      ).toBeVisible();
    }
    expect(evidence.writes).toEqual([]);
    expect(evidence.errors).toEqual([]);
  });
}

for (const theme of ['dark', 'light']) {
  test(`forms inbox includes existing registrations and uses accurate totals in ${theme} mode`, async ({
    page,
  }, testInfo) => {
    const formRows = Array.from({ length: 4 }, (_, index) => ({
      id: `10000000-0000-4000-8000-00000000001${index}`,
      kind: 'madrassah',
      status: index === 3 ? 'done' : 'new',
      payload: { name: `Family ${index + 1}` },
      created_at: '2026-10-18T10:00:00Z',
    }));
    const evidence = await openAdmin(page, { section: 'forms', formRows });
    await page.locator('.admin-account-menu > summary').click();
    if ((await page.locator('html').getAttribute('data-theme')) !== theme) {
      await page.getByRole('button', { name: `Use ${theme} mode`, exact: true }).click();
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /Madrassah enquiry/ })).toContainText(
      '3 waiting',
    );
    await page
      .getByRole('navigation', { name: 'Forms workspace' })
      .getByRole('button', { name: 'Responses', exact: true })
      .click();
    await expect(page.getByRole('combobox', { name: 'Form', exact: true })).toHaveValue('');
    await expect(page.locator('.custom-response')).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'All 4', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Previous', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Completed 1', exact: true }).click();
    await expect(page.locator('.custom-response')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'All 4', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'All 4', exact: true }).click();
    await expect(page.locator('.custom-response')).toHaveCount(4);
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('missing');
    await expect(page.getByRole('heading', { name: 'No matching responses' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.locator('.custom-response')).toHaveCount(3);
    await expect(page.locator('.custom-inbox-tools')).not.toHaveAttribute('open');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: testInfo.outputPath(`forms-responses-${theme}.png`),
      fullPage: true,
    });
    await page
      .getByRole('navigation', { name: 'Forms workspace' })
      .getByRole('button', { name: 'Follow-ups', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: 'No follow-ups yet' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: 'View responses' }).click();
    await expect(page.locator('.custom-response')).toHaveCount(3);
    expect(evidence.writes).toEqual([]);
    expect(evidence.errors).toEqual([]);
  });
}

test('completing a follow-up only updates that task, leaving its response unchanged', async ({
  page,
}) => {
  const evidence = await openAdmin(page, {
    section: 'forms',
    formTasks: [
      {
        id: '10000000-0000-4000-8000-000000000050',
        title: 'Call the family',
        status: 'open',
        assignee_name: 'Centre owner',
        updated_at: '2026-10-18T10:00:00Z',
        due_at: null,
      },
    ],
  });
  await page
    .getByRole('navigation', { name: 'Forms workspace' })
    .getByRole('button', { name: 'Follow-ups', exact: true })
    .click();
  await page.getByRole('combobox', { name: 'Status for Call the family' }).selectOption('done');
  await expect(page.getByRole('heading', { name: 'Follow-ups · 0 waiting' })).toBeVisible();
  expect(evidence.writes).toEqual([{ table: 'work_tasks', status: 'done' }]);
  expect(evidence.errors).toEqual([]);
});

test('phone account menu survives a null-focus blur and light mode persists', async ({ page }) => {
  await openAdmin(page, { section: 'forms' });
  const menu = page.locator('.admin-account-menu');
  await menu.locator('summary').click();
  await page.getByRole('button', { name: 'Use dark mode', exact: true }).click();
  await menu.locator('summary').dispatchEvent('focusout', { relatedTarget: null });
  await expect(menu).toHaveAttribute('open');
  await page.getByRole('button', { name: 'Use light mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.admin-console')).toHaveCSS('background-color', 'rgb(240, 237, 228)');
  await page.reload();
  await expect(page.locator('.admin-console')).toHaveCSS('background-color', 'rgb(240, 237, 228)');
});

test('adding a volunteer previews exact access and sends only selected permissions', async ({
  page,
}, testInfo) => {
  const evidence = await openAdmin(page, { section: 'users' });
  await page.getByRole('button', { name: 'Add person', exact: true }).click();
  const form = page.locator('.admin-staff-invite-inline');
  await form.getByLabel('Name', { exact: true }).fill('Example volunteer');
  await form.getByLabel('Email', { exact: true }).fill('volunteer@example.invalid');
  await expect(form.locator('.admin-access-preview')).toContainText('Portal only');
  await form.getByRole('checkbox', { name: 'Volunteer', exact: true }).check();
  await expect(form.locator('.admin-access-preview')).toContainText('Portal only');
  await form
    .locator('.admin-permission-group > summary')
    .filter({ hasText: 'Prayer & screens' })
    .click();
  await form.getByRole('checkbox', { name: 'TV scenes and device inputs', exact: true }).check();
  await expect(form.locator('.admin-access-preview')).toHaveText('Staff areas: TV screens.');
  await page.screenshot({
    path: testInfo.outputPath('invite-volunteer-access.png'),
    fullPage: true,
  });
  await form.getByRole('button', { name: 'Send invitation', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Invitation sent');
  expect(evidence.writes).toEqual([
    {
      action: 'invite',
      email: 'volunteer@example.invalid',
      display_name: 'Example volunteer',
      permissions: ['tv'],
      staff_kinds: ['volunteer'],
    },
  ]);
  expect(evidence.errors).toEqual([]);
});

test('staff can reach password change from Account and save their own new password', async ({
  page,
}) => {
  const evidence = await openAdmin(page, { section: 'dashboard' });
  const updates = [];
  await page.route('**/preview-api/auth/v1/user', async (route) => {
    if (route.request().method() === 'PUT') updates.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ id: owner.id, email: 'staff@example.invalid' }),
    });
  });
  await page.locator('.admin-account-menu > summary').click();
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Change password', exact: true })).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill('Local-test-passphrase-2030');
  await page.getByLabel('Confirm password', { exact: true }).fill('Local-test-passphrase-2030');
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Your password is saved.');
  expect(updates).toEqual([{ password: 'Local-test-passphrase-2030' }]);
  expect(evidence.errors).toEqual([]);
});

for (const [role, actor, tool] of [
  [
    'TV volunteer',
    {
      ...owner,
      display_name: 'Example volunteer',
      is_owner: false,
      permissions: ['tv'],
      staff_kinds: ['volunteer'],
    },
    'TV screens',
  ],
  [
    'assigned form reviewer',
    {
      ...owner,
      display_name: 'Example reviewer',
      is_owner: false,
      permissions: [],
      has_assigned_forms: true,
    },
    'Forms',
  ],
]) {
  test(`${role} starts at staff home with only their assigned tools`, async ({
    page,
  }, testInfo) => {
    const evidence = await openAdmin(page, { actor, section: 'dashboard' });
    await page.goto('/admin');
    await expect(page.locator('.admin-welcome .admin-eyebrow')).toHaveText('Staff home');
    await expect(
      page.locator('.admin-tool-list').getByRole('button', { name: tool, exact: true }),
    ).toBeVisible();
    await expect(page.locator('.admin-tool-list button')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'People & access', exact: true })).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath(`staff-home-${role.replaceAll(' ', '-')}.png`),
      fullPage: true,
    });
    await page.locator('.admin-tool-list').getByRole('button', { name: tool, exact: true }).click();
    await page.getByRole('button', { name: 'Staff home', exact: true }).click();
    await expect(page.locator('.admin-welcome')).toBeVisible();
    await page.goto('/admin?section=users');
    await expect(page.locator('.admin-welcome')).toBeVisible();
    await expect(page.locator('.admin-staff-access')).toHaveCount(0);
    expect(evidence.writes).toEqual([]);
    expect(evidence.errors).toEqual([]);
  });
}

test('centre owner can move between staff home and their personal portal home', async ({
  page,
}, testInfo) => {
  const evidence = await openAdmin(page, { section: 'dashboard' });
  await expect(page.locator('.admin-welcome h1')).toHaveText('Welcome, Centre owner');
  await page.screenshot({ path: testInfo.outputPath('owner-home.png'), fullPage: true });
  await page.getByRole('link', { name: 'My portal', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Portal home', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/portal$/);
  await page.getByRole('link', { name: 'Staff home', exact: true }).click();
  await expect(page.locator('.admin-welcome')).toBeVisible();
  expect(evidence.writes).toEqual([]);
  expect(evidence.errors).toEqual([]);
});
