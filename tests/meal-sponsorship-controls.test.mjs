import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';
import { ramadanDay, ramadanOpen, canSponsorDay } from '../src/features/ramadan/model.js';
import { isPageVisible, isPageEnabled } from '../src/lib/pageVisibility.js';
import { saveSiteVisibility } from '../src/lib/siteVisibility.js';

test('meal sponsorship switches enforce availability without losing bookings', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  try {
    await db.exec(
      "create table page_content(id uuid primary key default gen_random_uuid(),content_key text unique not null,content_value text not null,content_type text default 'text',updated_at timestamptz default now(),updated_by uuid);",
    );
    const files = await readdir(new URL('../supabase/migrations/', import.meta.url));
    for (const name of [
      '20260914152000_admin_schedule_and_service_forms.sql',
      '20261023085434_simple_calendar_workspaces.sql',
      files.find((name) => name.endsWith('_meal_sponsorship_controls.sql')),
    ])
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'),
      );
    const operations = await readFile(
      new URL('../supabase/migrations/20261017225316_community_operations.sql', import.meta.url),
      'utf8',
    );
    await db.exec(
      operations.slice(
        operations.indexOf('alter table public.profiles'),
        operations.indexOf('create table if not exists public.account_access_requests'),
      ),
    );
    await db.exec(
      `insert into profiles(id,display_name,permissions) values('${id(7)}','Hall staff','{events}'),('${id(8)}','Finance staff','{finance}'),('${id(9)}','Sponsorship staff','{fundraising}');`,
    );
    const options = (body) => rpc('save_ramadan_options', [JSON.stringify(body)]);
    const visibility = (path, visible, pageId = null) =>
      rpc('save_site_visibility', [path, visible, pageId]);
    let seasonId;
    const body = {
      request_key: id(100),
      kind: 'iftar',
      dates: ['2027-02-09'],
      sponsor_name: 'Private Sponsor',
      phone: '07123456789',
      email: 'private@example.test',
      amount_pence: 20000,
      show_name: false,
      consent: true,
    };
    const submit = (changes = {}) =>
      as(
        null,
        () =>
          rpc('submit_ramadan_request', [
            JSON.stringify({ ...body, season_id: seasonId, ...changes }),
            'a'.repeat(64),
          ]),
        'service_role',
      );
    const days = (kind, dates, enabled) =>
      rpc('save_ramadan_days', [seasonId, kind, `{${dates.join(',')}}`, enabled]);
    const setup = {
      title: 'Meal sponsorships',
      start_date: '2027-02-09',
      day_count: 30,
      suhoor_target_pence: 10000,
      published: true,
    };
    await t.test(
      'staff can set meal targets and old setup requests preserve Suhoor details',
      async () => {
        seasonId = await as(id(8), () => rpc('save_ramadan_season', [JSON.stringify(setup)]));
        await as(id(8), () =>
          rpc('save_ramadan_season', [
            JSON.stringify({ ...setup, id: seasonId, suhoor_target_pence: undefined }),
          ]),
        );
        assert.equal((await rpc('ramadan_calendar_public')).season.suhoor_target_pence, 10000);
      },
    );
    await t.test(
      'page visibility protects core pages and preserves added-page content',
      async () => {
        await assert.rejects(
          as(id(5), () => visibility('/services', false)),
          /access required/,
        );
        await assert.rejects(
          as(id(9), () => visibility('/services', false)),
          /access required/,
        );
        await assert.rejects(
          as(id(6), () => visibility('/', false)),
          /public page/,
        );
        await assert.rejects(
          as(id(6), () => visibility('/privacy', false)),
          /public page/,
        );
        assert.equal(await as(id(6), () => visibility('/services', false)), false);
        assert.equal(
          (
            await db.query(
              "select content_value from page_content where content_key='page-visibility:/services'",
            )
          ).rows[0].content_value,
          'false',
        );
        await db.query(
          'insert into site_pages(id,slug,title,body,created_by,placement) values($1,$2,$3,$4,$5,$6)',
          [id(70), 'test-page', 'Test page', 'Keep these details', id(1), '/education'],
        );
        assert.equal(await as(id(6), () => visibility('/pages/test-page', false, id(70))), false);
        assert.equal(
          (await db.query('select body from site_pages where id=$1', [id(70)])).rows[0].body,
          'Keep these details',
        );
      },
    );
    await t.test(
      'meal and placement switches save atomically and share page-editor visibility',
      async () => {
        await assert.rejects(
          as(id(5), () => options({ iftar_enabled: false })),
          /access required/,
        );
        await assert.rejects(
          as(id(6), () => options({ iftar_enabled: false })),
          /access required/,
        );
        await as(id(9), () =>
          options({
            iftar_enabled: false,
            home_enabled: true,
            home_layout: 'days',
            tv_enabled: false,
          }),
        );
        let data = await as(null, () => rpc('ramadan_calendar_public'), 'anon');
        assert.equal(data.settings.iftar_enabled, false);
        assert.equal(data.settings.suhoor_enabled, true);
        assert.equal(data.settings.home_layout, 'days');
        assert.equal(data.settings.tv_enabled, false);
        await assert.rejects(submit(), /bookings are closed/);
        await assert.rejects(
          as(id(9), () => options({ home_layout: 'arbitrary-css' })),
          /check constraint/,
        );
        await as(id(6), () => visibility('/ramadan/iftar', true));
        assert.equal((await rpc('ramadan_calendar_public')).settings.iftar_enabled, true);
        await as(id(6), () => visibility('/ramadan', false));
        await assert.rejects(submit(), /bookings are closed/);
        await as(id(9), () => options({ tv_enabled: true }));
        data = await rpc('ramadan_calendar_public');
        assert.equal(data.settings.website_enabled, false);
        assert.equal(data.settings.tv_enabled, true);
        await as(id(9), () => visibility('/ramadan', true));
      },
    );
    let receipt;
    await t.test(
      'Iftar and Suhoor reserve independently and retries do not reserve twice',
      async () => {
        receipt = await submit();
        assert.deepEqual(await submit(), receipt);
        await assert.rejects(submit({ request_key: id(101) }), /already reserved/);
        await submit({ kind: 'suhoor', request_key: id(102) });
        assert.equal(
          (await db.query('select count(*)::int n from ramadan_sponsorships')).rows[0].n,
          2,
        );
        await assert.rejects(submit({ kind: 'suhoor', request_key: id(103) }), /already reserved/);
        const publicData = await rpc('ramadan_calendar_public');
        assert.ok(!JSON.stringify(publicData).includes('Private'));
        assert.ok(!JSON.stringify(publicData).includes('private@example'));
      },
    );
    await t.test(
      'closing days is per meal, blocks requests and preserves existing bookings',
      async () => {
        await assert.rejects(
          as(id(7), () => days('suhoor', ['2027-02-10'], false)),
          /access required/,
        );
        assert.equal(await as(id(9), () => days('suhoor', ['2027-02-09', '2027-02-10'], false)), 2);
        await assert.rejects(
          submit({ kind: 'suhoor', dates: ['2027-02-10'], request_key: id(104) }),
          /day.*closed/,
        );
        await submit({ dates: ['2027-02-10'], request_key: id(105) });
        assert.deepEqual(await submit(), receipt);
        assert.equal(
          (await db.query("select count(*)::int n from ramadan_sponsorships where kind='suhoor'"))
            .rows[0].n,
          1,
        );
        await assert.rejects(
          as(id(9), () => days('suhoor', ['2027-04-01'], false)),
          /within this Ramadan/,
        );
        const publicData = await rpc('ramadan_calendar_public');
        assert.equal(ramadanDay(publicData, 'suhoor', '2027-02-10').status, 'closed');
        assert.equal(canSponsorDay(publicData, 'iftar', '2027-02-11'), true);
        assert.equal(canSponsorDay(publicData, 'iftar', '2027-02-10'), false);
        await as(id(9), () => days('suhoor', ['2027-02-10'], true));
        await submit({ kind: 'suhoor', dates: ['2027-02-10'], request_key: id(106) });
        await assert.rejects(
          as(null, () => db.query('select * from ramadan_day_settings'), 'anon'),
          /permission denied/,
        );
        await as(id(9), () => days('suhoor', ['2027-03-10'], false));
        await as(id(9), () =>
          rpc('save_ramadan_season', [JSON.stringify({ ...setup, id: seasonId, day_count: 29 })]),
        );
        assert.equal(
          (
            await db.query(
              "select count(*)::int n from ramadan_day_settings where day_date='2027-03-10'",
            )
          ).rows[0].n,
          0,
        );
      },
    );
  } finally {
    await db.close();
  }
});

test('page switches distinguish a page setting from the hidden Ramadan parent', () => {
  const values = { 'page-visibility:/ramadan': 'false' },
    get = (key, fallback) => values[key] ?? fallback;
  assert.equal(isPageEnabled(get, '/ramadan/iftar'), true);
  assert.equal(isPageVisible(get, '/ramadan/iftar'), false);
  assert.equal(isPageVisible(get, '/services'), true);
  assert.equal(ramadanOpen({ settings: { suhoor_enabled: false } }, 'suhoor'), false);
});
test('saving an Off switch accepts a confirmed false result and rejects failed writes', async () => {
  const client = { rpc: async () => ({ data: false, error: null }) };
  assert.equal(await saveSiteVisibility(client, { path: '/services' }, false), false);
  await assert.rejects(
    saveSiteVisibility(
      { rpc: async () => ({ data: null, error: null }) },
      { path: '/services' },
      false,
    ),
    /not saved/,
  );
});
