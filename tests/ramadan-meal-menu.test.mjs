import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';
import { ramadanDay, canSponsorDay } from '../src/features/ramadan/model.js';

test('calendar offers include the published menu and close incomplete packages', () => {
  const data = {
    day_settings: [
      {
        kind: 'iftar',
        day_date: '2027-02-09',
        enabled: true,
        dishes: [{ name: 'Rice', cost_pence: 10000 }],
        price_pence: 15000,
        people_fed: 50,
        offer_version: 1,
      },
    ],
  };
  assert.equal(ramadanDay(data, 'iftar', '2027-02-09').people_fed, 50);
  assert.equal(canSponsorDay(data, 'iftar', '2027-02-09'), true);
  data.day_settings[0].people_fed = null;
  assert.equal(canSponsorDay(data, 'iftar', '2027-02-09'), false);
});

test('meal menus protect prices, booking snapshots, permissions and revisions', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  try {
    await db.exec(
      "create table page_content(content_key text unique not null,content_value text not null,content_type text default 'text',updated_at timestamptz default now(),updated_by uuid);",
    );
    const files = await readdir(new URL('../supabase/migrations/', import.meta.url));
    for (const name of [
      '20260914152000_admin_schedule_and_service_forms.sql',
      '20261023085434_simple_calendar_workspaces.sql',
      '20261023132323_meal_sponsorship_controls.sql',
      ...files.filter((name) => name.endsWith('_ramadan_meal_menus.sql')),
    ])
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'),
      );
    const season = await as(id(1), () =>
      rpc('save_ramadan_season', [
        JSON.stringify({
          title: 'Test season',
          start_date: '2027-02-09',
          day_count: 30,
          published: true,
        }),
      ]),
    );
    const menu = {
      season_id: season,
      day_date: '2027-02-09',
      kind: 'iftar',
      expected_version: 0,
      enabled: true,
      menu_title: 'Community Iftar',
      dishes: [
        { name: 'Rice', cost_pence: 10000 },
        { name: 'Curry', cost_pence: 5000 },
      ],
      price_pence: 15000,
      people_fed: 50,
      menu_notes: 'Vegetarian option available',
    };
    const save = (changes = {}, user = id(1)) =>
      as(user, () => rpc('save_ramadan_meal', [JSON.stringify({ ...menu, ...changes })]));
    const body = {
      season_id: season,
      kind: 'iftar',
      dates: ['2027-02-09'],
      request_key: id(80),
      sponsor_name: 'Private sponsor',
      phone: '07000000000',
      email: '',
      amount_pence: 15000,
      consent: true,
      offer_versions: { '2027-02-09': 1 },
    };
    const submit = (changes = {}) =>
      as(
        null,
        () =>
          rpc('submit_ramadan_request', [JSON.stringify({ ...body, ...changes }), 'a'.repeat(64)]),
        'service_role',
      );
    await t.test(
      'staff save a priced menu that public users can read without private data',
      async () => {
        const saved = await save();
        assert.equal(saved.offer_version, 1);
        const calendar = await as(null, () => rpc('ramadan_calendar_public'), 'anon');
        assert.equal(calendar.day_settings[0].price_pence, 15000);
        assert.deepEqual(calendar.day_settings[0].dishes, menu.dishes);
        assert.equal(calendar.day_settings[0].people_fed, 50);
      },
    );
    await t.test('unrelated accounts cannot save or read staff data', async () => {
      await assert.rejects(save({ expected_version: 1 }, id(5)), /access required/);
      await assert.rejects(
        as(null, () => db.query('select * from ramadan_day_settings'), 'anon'),
        /permission denied/,
      );
    });
    await t.test('unreviewed or stale prices cannot be booked', async () => {
      await assert.rejects(submit({ amount_pence: 1 }), /Meal details changed/);
      await assert.rejects(submit({ offer_versions: {} }), /Meal details changed/);
      await assert.rejects(submit({ offer_versions: { '2027-02-09': 0 } }), /Meal details changed/);
    });
    await t.test('booking captures the offer and a retry cannot reserve it twice', async () => {
      const receipt = await submit();
      assert.deepEqual(await submit(), receipt);
      const row = (await db.query('select * from ramadan_sponsorships')).rows[0];
      assert.equal(row.amount_pence, 15000);
      assert.equal(row.offer_snapshot.people_fed, 50);
      assert.deepEqual(row.offer_snapshot.dishes, menu.dishes);
      await assert.rejects(submit({ request_key: id(81) }), /already reserved/);
    });
    await t.test('changing a menu and closing a day keep the existing booking intact', async () => {
      await save({ expected_version: 1, price_pence: 18000, enabled: false });
      const row = (await db.query('select * from ramadan_sponsorships')).rows[0];
      assert.equal(row.amount_pence, 15000);
      assert.equal(row.offer_snapshot.price_pence, 15000);
      assert.equal((await rpc('ramadan_calendar_public')).day_settings[0].enabled, false);
      await assert.rejects(save({ expected_version: 1 }), /changed.*refresh/i);
    });
    await t.test('open offers require actual dishes, price and servings', async () => {
      for (const change of [
        { dishes: [] },
        { people_fed: 0 },
        { price_pence: null },
        { price_pence: -1 },
      ])
        await assert.rejects(
          save({ day_date: '2027-02-10', ...change }),
          /meal|price|people|dish/i,
        );
      await assert.rejects(save({ day_date: '2027-04-01' }), /within this Ramadan/);
      await assert.rejects(save({ kind: 'daily' }), /meal/i);
    });
    await t.test(
      'Suhoor stays independent and public output excludes sponsor contacts',
      async () => {
        await save({ kind: 'suhoor', price_pence: 10000 });
        await submit({ kind: 'suhoor', amount_pence: 10000, request_key: id(82) });
        const publicData = JSON.stringify(
          await as(null, () => rpc('ramadan_calendar_public'), 'anon'),
        );
        assert.ok(!publicData.includes('Private sponsor'));
        assert.ok(!publicData.includes('07000000000'));
      },
    );
  } finally {
    await db.close();
  }
});
