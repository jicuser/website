import { test, expect } from '@playwright/test';
import { DEFAULT_TV_SETTINGS } from '../../supabase/functions/_shared/tv.js';
test.use({ screenshot: 'off' });

const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const actor = {
  id: id(1),
  display_name: 'Centre owner',
  is_owner: true,
  is_active: true,
  permissions: [],
  staff_kinds: [],
};
const initialForm = {
  id: id(2),
  slug: 'volunteer-registration',
  title: 'Volunteer registration',
  description: 'Help the community.',
  schema: { fields: [{ id: 'name', label: 'Your name', type: 'text', required: true }] },
  published_version: 1,
  enabled: true,
  task_title: 'Reply to form response',
  due_hours: 48,
  updated_at: '2026-10-23T10:00:00Z',
};
const season = {
  id: id(3),
  title: 'Ramadan sponsorships',
  start_date: '2027-02-09',
  day_count: 30,
  published: true,
};

async function fixture(page, { radio = false } = {}) {
  const state = {
    writes: [],
    errors: [],
    draft: structuredClone(initialForm),
    published: structuredClone(initialForm),
    season: { ...season },
    daySettings: [],
  };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.addInitScript((online) => {
    sessionStorage.setItem('jic-salawat-shown', '1');
    window.__radioOnline = online;
    window.__playCalls = 0;
    HTMLMediaElement.prototype.load = function () {
      if (this.muted && this.hasAttribute('src'))
        queueMicrotask(() => this.dispatchEvent(new Event('loadeddata')));
    };
    HTMLMediaElement.prototype.play = function () {
      window.__playCalls++;
      this.dispatchEvent(new Event('playing'));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      this.dispatchEvent(new Event('pause'));
    };
  }, radio);
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/status-json.xsl', async (route) => {
    const online = await page.evaluate(() => window.__radioOnline);
    await route.fulfill({
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        icestats: {
          source: online
            ? {
                listenurl: 'https://jicmosque.radioca.st/live',
                server_type: 'audio/mpeg',
                audio_info: 'bitrate=128',
                listeners: 0,
                title: 'JIC broadcast',
              }
            : [
                {
                  listenurl: 'https://jicmosque.radioca.st/autodj',
                  server_type: 'audio/mpeg',
                  audio_info: 'bitrate=128',
                  title: 'NOT LIVE - NOT LIVE [13vv]',
                },
                { listenurl: 'https://jicmosque.radioca.st/live', listeners: 0 },
                { listenurl: 'https://jicmosque.radioca.st/stream', listeners: 0 },
              ],
        },
      }),
    });
  });
  await page.route('**/preview-api/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    const body = req.method() === 'POST' ? req.postDataJSON() : {};
    let data = [];
    if (path.includes('/auth/v1/token')) {
      const expires = Math.floor(Date.now() / 1000) + 3600;
      const enc = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
      data = {
        user: {
          ...actor,
          email: 'owner@example.invalid',
          role: 'authenticated',
          aud: 'authenticated',
          user_metadata: {},
          app_metadata: {},
        },
        access_token: `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: actor.id, exp: expires })}.test`,
        refresh_token: 'test-only',
        expires_in: 3600,
        expires_at: expires,
        token_type: 'bearer',
      };
    } else if (path.endsWith('/rpc/get_my_profile')) data = actor;
    else if (path.endsWith('/rpc/get_public_form'))
      data = { ...state.published, version: state.published.published_version };
    else if (path.endsWith('/rpc/admin_forms_overview'))
      data = [
        {
          ...state.draft,
          can_manage: true,
          new_count: 0,
          done_count: 0,
          open_actions: 0,
          people: [
            {
              user_id: actor.id,
              display_name: actor.display_name,
              role: 'responsible',
              active: true,
            },
          ],
          pages: [],
        },
      ];
    else if (path.endsWith('/rpc/custom_form_members')) data = [actor];
    else if (path.endsWith('/custom_forms'))
      data = req.headers().accept?.includes('object') ? state.draft : [state.draft];
    else if (path.endsWith('/custom_form_staff'))
      data = [{ user_id: actor.id, role: 'responsible' }];
    else if (path.endsWith('/rpc/save_form_workflow')) {
      state.writes.push({ action: body.p_publish ? 'publish-form' : 'save-form', ...body });
      state.draft = { ...state.draft, ...body.p_form, updated_at: '2026-10-23T11:00:00Z' };
      if (body.p_publish) {
        state.draft.published_version++;
        state.published = structuredClone(state.draft);
      }
      data = { form: state.draft, page: null };
    } else if (path.endsWith('/rpc/ramadan_calendar_public'))
      data = {
        season: state.season,
        settings: {
          website_enabled: true,
          iftar_enabled: true,
          suhoor_enabled: true,
          daily_enabled: true,
        },
        days: [{ kind: 'iftar', day_date: '2027-02-28', confirmed: 0, pending: 1, names: [] }],
        day_settings: [{ kind: 'iftar', day_date: '2027-03-01', enabled: false }],
      };
    else if (path.endsWith('/functions/v1/ramadan-request')) {
      state.writes.push(body);
      data = { reference: 'RAM-TEST' };
    } else if (path.endsWith('/ramadan_seasons')) data = [state.season];
    else if (path.endsWith('/ramadan_day_settings')) data = state.daySettings;
    else if (path.endsWith('/ramadan_settings'))
      data = {
        website_enabled: true,
        iftar_enabled: true,
        suhoor_enabled: true,
        daily_enabled: true,
        home_enabled: false,
        home_layout: 'card',
        tv_enabled: true,
      };
    else if (path.endsWith('/rpc/save_ramadan_days')) {
      state.writes.push(body);
      data = body.p_dates.length;
    } else if (path.endsWith('/rpc/save_ramadan_season')) {
      state.writes.push(body);
      state.season = { ...state.season, ...body.p_body };
      data = state.season.id;
    } else if (path.endsWith('/functions/v1/tv-control')) {
      if (!['admin', 'status', 'public'].includes(body.action)) state.writes.push(body);
      data = {
        settings: structuredClone(DEFAULT_TV_SETTINGS),
        updated_at: '2026-10-23T10:00:00Z',
        presentation: null,
        templates: [],
        inputs: [],
        devices: [],
        relayConfigured: false,
      };
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  const login = async () => {
    await page.goto('/admin/login');
    await page.getByLabel('Email address').fill('owner@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill('Local test password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('.admin-toolbar')).toBeVisible();
  };
  return { state, login };
}

test('a published form offers staff editing and preserves live questions until publication', async ({
  page,
}) => {
  const { state, login } = await fixture(page);
  await page.goto('/forms/volunteer-registration');
  await expect(page.getByLabel('Your name')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Staff form controls' })).toHaveCount(0);
  await login();
  await page.goto('/forms/volunteer-registration');
  await page.getByRole('link', { name: 'Edit this form', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Edit form', exact: true })).toBeVisible();
  await page.getByText('Form address & availability', { exact: true }).click();
  await expect(page.getByLabel('Form address', { exact: true })).toHaveAttribute('readonly', '');
  await page.locator('.custom-question > summary').first().click();
  await page.getByLabel('Question label', { exact: true }).fill('Full name');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit form & assignments' })).toBeVisible();
  expect(state.published.schema.fields[0].label).toBe('Your name');
  expect(state.draft.schema.fields[0].label).toBe('Full name');
  await page.getByRole('button', { name: 'Edit form & assignments' }).click();
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit form & assignments' })).toBeVisible();
  await page.goto('/forms/volunteer-registration');
  await expect(page.getByLabel('Full name')).toBeVisible();
  expect(state.published.published_version).toBe(2);
  expect(state.writes.filter((row) => row.action === 'publish-form')).toHaveLength(1);
  expect(state.errors).toEqual([]);
});

test('form creation provides templates, automatic addresses, optional titles and useful previews', async ({
  page,
}) => {
  const { state, login } = await fixture(page);
  await login();
  await page.goto('/admin?section=forms');
  await page.getByRole('button', { name: 'New form', exact: true }).click();
  await page.getByRole('button', { name: 'Registration', exact: true }).click();
  await page.getByLabel('Form title', { exact: true }).fill('Friday Volunteers');
  await page.getByText('Form address & availability', { exact: true }).click();
  await expect(page.getByLabel('Form address', { exact: true })).toHaveValue('friday-volunteers');
  await page.getByRole('button', { name: '+ Name title', exact: true }).click();
  await page.getByRole('button', { name: 'Preview questions', exact: true }).click();
  const preview = page.locator('.workspace-card.workspace-form');
  await expect(preview.getByLabel('Title', { exact: true })).toBeVisible();
  await expect(preview.getByLabel('Phone number', { exact: true })).toHaveAttribute(
    'placeholder',
    /\+44/,
  );
  await expect(page.locator('.custom-question .workspace-field').first()).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('Ramadan table selects a range across UK months and skips reserved or closed meals', async ({
  page,
}) => {
  const { state } = await fixture(page);
  await page.goto('/ramadan/iftar');
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await page.getByText('Choose a date range', { exact: true }).click();
  const range = page.getByRole('group', { name: 'Sponsorship date range' });
  await range.getByLabel('From', { exact: true }).selectOption('2027-02-27');
  await range.getByLabel('To', { exact: true }).selectOption('2027-03-03');
  await range.getByRole('button', { name: 'Select these days' }).click();
  const table = page.getByRole('region', { name: 'Ramadan sponsorship table' });
  await expect(table.getByText('19 Ramadan', { exact: true })).toBeVisible();
  await expect(table.getByText('3 March 2027', { exact: true })).toBeVisible();
  await expect(
    table.getByRole('button', { name: 'Select 20 Ramadan, 28 February 2027' }),
  ).toBeDisabled();
  await page.getByLabel('Your name', { exact: true }).fill('Meal sponsor');
  await page.getByLabel('Phone or email', { exact: true }).fill('sponsor@example.invalid');
  await page.getByRole('button', { name: 'Request sponsorship', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Booking request received' })).toBeVisible();
  expect(state.writes[0].dates).toEqual(['2027-02-27', '2027-03-02', '2027-03-03']);
  expect(state.errors).toEqual([]);
});

test('Ramadan without a season keeps one overview notice and a useful direct meal page', async ({
  page,
}) => {
  const { state } = await fixture(page);
  state.season = null;
  await page.goto('/ramadan');
  const notice = page.locator('.ramadan-timetable-notice');
  await expect(
    notice.getByRole('heading', { name: 'Ramadan timetable coming soon' }),
  ).toBeVisible();
  await expect(notice.getByRole('heading', { name: 'Meal bookings coming soon' })).toBeVisible();
  await expect(page.locator('.sponsorship-page > .booking-panel')).toHaveCount(1);
  await page.goto('/ramadan/iftar');
  await expect(page.getByRole('heading', { name: 'Meal bookings coming soon' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ramadan timetable coming soon' })).toHaveCount(0);
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('Ramadan staff table opens and closes a date range and accepts a 29-day end date', async ({
  page,
}) => {
  const { state, login } = await fixture(page);
  await login();
  await page.goto('/admin?section=ramadan');
  const range = page.getByRole('group', { name: 'Sponsorship date range' });
  await expect(page.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Table', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByText('Date range & availability', { exact: true }).click();
  await range.getByLabel('From', { exact: true }).selectOption('2027-02-27');
  await range.getByLabel('To', { exact: true }).selectOption('2027-03-02');
  await page.getByRole('button', { name: 'Close this range', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('4 days closed.');
  expect(state.writes.at(-1)).toMatchObject({
    p_enabled: false,
    p_dates: ['2027-02-27', '2027-02-28', '2027-03-01', '2027-03-02'],
  });
  await page.getByRole('button', { name: 'Setup', exact: true }).click();
  await page.getByLabel('Last UK date', { exact: true }).fill('2027-03-09');
  await page.getByRole('button', { name: 'Save setup', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Sponsorship setup saved.');
  expect(state.writes.at(-1).p_body.day_count).toBe(29);
  expect(state.errors).toEqual([]);
});

test('live radio notice follows availability, persists dismissal and starts audio only on Listen', async ({
  page,
}) => {
  const { state } = await fixture(page, { radio: true });
  await page.goto('/');
  const notice = page.getByRole('status', { name: 'Live radio', exact: true });
  await expect(notice).toBeVisible();
  expect(await page.evaluate(() => window.__playCalls)).toBe(0);
  await page.evaluate(() => {
    window.__radioOnline = false;
    window.dispatchEvent(new Event('online'));
  });
  await expect(notice).toHaveCount(0);
  await page.evaluate(() => {
    window.__radioOnline = true;
    window.dispatchEvent(new Event('online'));
  });
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: 'Dismiss live radio notice' }).click();
  await page.reload();
  await expect(notice).toHaveCount(0);
  await page.evaluate(() => {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key.startsWith('jic-radio-notice:')) sessionStorage.removeItem(key);
    }
  });
  await page.reload();
  await notice.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(notice).toHaveCount(0);
  expect(await page.evaluate(() => window.__playCalls)).toBe(1);
  expect(state.errors).toEqual([]);
});

test('TV starts with one task and one primary action per supported screen without writing changes', async ({
  page,
}) => {
  const { state, login } = await fixture(page);
  await login();
  await page.goto('/admin?section=tv');
  await expect(
    page.getByRole('button', { name: 'Edit automatic display', exact: true }),
  ).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Quick present', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Live presentation Camera/ }).click();
  await expect(page.getByRole('button', { name: 'Quick present', exact: true })).toHaveCount(3);
  await expect(page.getByText('Shoe Area', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Automatic displays Timetable/ }).click();
  await page.getByRole('button', { name: 'Edit automatic display', exact: true }).last().click();
  await expect(page.getByRole('tab', { name: 'Design', exact: true })).toBeVisible();
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('public metadata changes with navigation and keeps one canonical without search parameters', async ({
  page,
}) => {
  const { state } = await fixture(page);
  await page.goto('/services/hall-booking?date=2027-03-01');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /hall availability/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://www.jicmasjid.org/services/hall-booking',
  );
  await page.goto('/ramadan');
  await expect(page.getByRole('heading', { name: 'Ramadan timetable coming soon' })).toBeVisible();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Ramadan | Jamatia Islamic Centre',
  );
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  await page.goto('/admin/login');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  expect(state.errors).toEqual([]);
});

test('Birmingham prayer metadata identifies the mosque after rendering and stays out of the portal', async ({
  page,
}) => {
  const { state } = await fixture(page);
  await page.goto('/prayer-times');
  await expect(page).toHaveTitle('Birmingham Prayer Times & Salah | JIC Woodlands Road Masjid');
  await expect(page.locator('.jic-prayer-title')).toContainText(
    'Woodlands Road Masjid, Sparkhill, Birmingham, West Midlands',
  );
  await expect
    .poll(async () =>
      page.locator('head script[type="application/ld+json"]').evaluateAll((nodes) => {
        const records = nodes.map((node) => JSON.parse(node.textContent));
        const mosque = records.find((item) => item['@type'] === 'Mosque');
        const prayer = records.find((item) => item['@type'] === 'WebPage');
        return !!mosque && prayer?.about?.['@id'] === mosque['@id'];
      }),
    )
    .toBe(true);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await page.goto('/portal');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('head script[type="application/ld+json"]')).toHaveCount(0);
  expect(state.errors).toEqual([]);
});
