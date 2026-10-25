import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';

test('hall and Ramadan workspaces keep public calendars separate from private records', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  try {
    const migrations = await readdir(new URL('../supabase/migrations/', import.meta.url));
    for (const name of [
      '20260914152000_admin_schedule_and_service_forms.sql',
      '20261015003000_service_enquiries.sql',
      '20261023085434_simple_calendar_workspaces.sql',
      ...migrations.filter((name) => name.endsWith('_hall_booking_rpc_writes.sql')),
    ]) {
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'),
      );
    }
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
      `insert into profiles(id,display_name,permissions) values('${id(7)}','Hall staff','{events}'),('${id(8)}','Finance staff','{finance}'),('${id(9)}','Fundraising staff','{fundraising}')`,
    );
    const hall = (
      dates,
      status = 'booked',
      start = null,
      end = null,
      details = null,
      bookingId = null,
    ) =>
      rpc('save_hall_calendar', [
        `{${dates.join(',')}}`,
        status,
        start,
        end,
        details && JSON.stringify(details),
        bookingId,
      ]);
    await t.test(
      'staff select multiple dates, retain private details, and cannot double-book confirmed times',
      async () => {
        assert.equal(
          await as(id(7), () =>
            hall(['2027-02-09', '2027-02-10'], 'booked', null, null, {
              event_title: 'Private celebration',
              contact_name: 'Private contact',
              contact_phone: '07123456789',
              notes: 'Private note',
            }),
          ),
          2,
        );
        assert.equal((await db.query('select * from hall_booking_details')).rows.length, 2);
        await assert.rejects(
          as(id(7), () => hall(['2027-02-09'], 'booked', '10:00', '12:00')),
          /already a booking/,
        );
        await as(id(7), () => hall(['2027-02-11'], 'booked', '10:00', '12:00'));
        await assert.rejects(
          as(id(7), () => hall(['2027-02-11'], 'booked', '11:00', '13:00')),
          /already a booking/,
        );
        assert.equal(await as(id(7), () => hall(['2027-02-11'], 'booked', '12:00', '13:00')), 1);
        await assert.rejects(
          as(id(7), () => hall(['2027-02-12'], 'available', '10:00', null)),
          /start and finish/,
        );
      },
    );
    await t.test(
      'public sees dates and colours while unrelated accounts cannot read notes or save days',
      async () => {
        const publicRows = await as(null, () => db.query('select * from hall_bookings'), 'anon');
        assert.equal(publicRows.rows.length, 4);
        assert.ok(!JSON.stringify(publicRows.rows).includes('Private'));
        await assert.rejects(
          as(null, () => db.query('select * from hall_booking_details'), 'anon'),
          /permission denied/,
        );
        assert.equal(
          (await as(id(5), () => db.query('select * from hall_booking_details'))).rows.length,
          0,
        );
        await assert.rejects(
          as(id(5), () => hall(['2027-02-12'])),
          /access required/,
        );
        const result = await as(id(5), () =>
          db.query("update hall_calendar_settings set booked='#112233' returning id"),
        );
        assert.equal(result.rows.length, 0);
        assert.equal(
          (
            await as(id(7), () =>
              db.query("update hall_calendar_settings set booked='#112233' returning id"),
            )
          ).rows.length,
          1,
        );
      },
    );
    await t.test(
      'booking writes cannot bypass overlap checks through direct table mutations',
      async () => {
        await as(id(7), () =>
          hall(['2027-03-15'], 'booked', '10:00', '12:00', {
            contact_name: 'Retained contact',
          }),
        );
        const booking = (
          await db.query("select id from hall_bookings where booking_date='2027-03-15'")
        ).rows[0].id;

        await assert.rejects(
          as(id(7), () =>
            db.exec(
              "insert into hall_bookings(booking_date,start_time,end_time,status) values('2027-03-15','11:00','13:00','booked')",
            ),
          ),
          /permission denied/,
        );
        await assert.rejects(
          as(id(7), () =>
            db.query("update hall_bookings set start_time='11:00',end_time='13:00' where id=$1", [
              booking,
            ]),
          ),
          /permission denied/,
        );
        await assert.rejects(
          as(id(7), () => hall(['2027-03-15'], 'booked', '11:00', '13:00')),
          /already a booking/,
        );
        assert.equal(
          await as(id(7), () => hall(['2027-03-15'], 'booked', '09:00', '11:00', null, booking)),
          1,
        );
        assert.equal(
          (
            await as(id(7), () =>
              db.query('select contact_name from hall_booking_details where booking_id=$1', [
                booking,
              ]),
            )
          ).rows[0].contact_name,
          'Retained contact',
        );
        assert.equal(
          (
            await as(id(7), () =>
              db.query('delete from hall_bookings where id=$1 returning id', [booking]),
            )
          ).rows[0].id,
          booking,
        );
        assert.equal(
          (await db.query('select * from hall_booking_details where booking_id=$1', [booking])).rows
            .length,
          0,
        );
      },
    );
    let seasonId, requestId;
    const season = {
      title: 'Test Ramadan',
      start_date: '2027-02-09',
      day_count: 30,
      iftar_target_pence: 20000,
      daily_target_pence: 0,
      published: true,
    };
    const body = {
      request_key: id(100),
      kind: 'iftar',
      dates: ['2027-02-09', '2027-02-10'],
      sponsor_name: 'Private Sponsor',
      phone: '07123456789',
      email: 'private@example.test',
      amount_pence: 20000,
      show_name: false,
      consent: true,
    };
    const submit = (changes = {}, source = 'a'.repeat(64)) =>
      rpc('submit_ramadan_request', [
        JSON.stringify({ ...body, season_id: seasonId, ...changes }),
        source,
      ]);
    await t.test('only finance or fundraising staff set up and publish Ramadan dates', async () => {
      await assert.rejects(
        as(id(5), () => rpc('save_ramadan_season', [JSON.stringify(season)])),
        /access required/,
      );
      seasonId = await as(id(8), () => rpc('save_ramadan_season', [JSON.stringify(season)]));
      assert.ok(seasonId);
      assert.equal(
        (await as(null, () => rpc('ramadan_calendar_public'), 'anon')).season.id,
        seasonId,
      );
    });
    await t.test(
      'requests are idempotent, pending, and accepted only through the service endpoint',
      async () => {
        await assert.rejects(
          as(null, () => submit(), 'anon'),
          /permission denied/,
        );
        const first = await as(
          null,
          () => submit({ status: 'confirmed', paid: true }),
          'service_role',
        );
        assert.match(first.reference, /^RAM-/);
        assert.deepEqual(await as(null, () => submit(), 'service_role'), first);
        const rows = (
          await db.query('select *,day_date::text as day_date from ramadan_sponsorships')
        ).rows;
        assert.equal(rows.length, 2);
        assert.ok(
          rows.every((row) => row.status === 'pending' && !row.paid && row.public_name === ''),
        );
        requestId = rows.find((row) => row.day_date === '2027-02-09').id;
        await assert.rejects(
          as(null, () => submit({ request_key: id(101), dates: ['2027-04-01'] }), 'service_role'),
          /Calendar dates changed/,
        );
        const publicData = await as(null, () => rpc('ramadan_calendar_public'), 'anon');
        assert.equal(publicData.days.length, 2);
        assert.ok(!JSON.stringify(publicData).includes('Private'));
        await assert.rejects(
          as(null, () => db.query('select * from ramadan_sponsorships'), 'anon'),
          /permission denied/,
        );
        assert.equal(
          (await as(id(5), () => db.query('select * from ramadan_sponsorships'))).rows.length,
          0,
        );
      },
    );
    const confirmed = {
      id: null,
      season_id: null,
      day_date: '2027-02-09',
      kind: 'iftar',
      sponsor_name: 'Private Sponsor',
      phone: '07123456789',
      email: 'private@example.test',
      public_name: 'Approved family name',
      amount_pence: 20000,
      status: 'confirmed',
      paid: true,
      notes: 'Private staff note',
    };
    await t.test(
      'confirmation protects Iftar dates and publishes only approved names',
      async () => {
        confirmed.id = requestId;
        confirmed.season_id = seasonId;
        await assert.rejects(
          as(id(7), () => rpc('save_ramadan_sponsorship', [JSON.stringify(confirmed)])),
          /access required/,
        );
        await as(id(9), () => rpc('save_ramadan_sponsorship', [JSON.stringify(confirmed)]));
        await assert.rejects(
          as(id(8), () =>
            rpc('save_ramadan_sponsorship', [JSON.stringify({ ...confirmed, id: null })]),
          ),
          /already has a confirmed sponsor/,
        );
        await assert.rejects(
          as(null, () => submit({ request_key: id(102), dates: ['2027-02-09'] }), 'service_role'),
          /already sponsored/,
        );
        const publicData = await as(null, () => rpc('ramadan_calendar_public'), 'anon');
        const day = publicData.days.find((row) => row.day_date === '2027-02-09');
        assert.deepEqual(day.names, ['Approved family name']);
        assert.equal(day.received_pence, 20000);
        assert.ok(!JSON.stringify(publicData).includes('Private'));
        await assert.rejects(
          as(id(8), () =>
            rpc('save_ramadan_season', [
              JSON.stringify({ ...season, id: seasonId, start_date: '2027-02-10' }),
            ]),
          ),
          /exclude existing sponsorships/,
        );
      },
    );
    await t.test('Daily Giving allows shared days and rate limits new requests', async () => {
      for (let n = 0; n < 10; n++)
        await as(
          null,
          () =>
            submit(
              { request_key: id(200 + n), kind: 'daily', dates: ['2027-02-09'], amount_pence: 500 },
              'b'.repeat(64),
            ),
          'service_role',
        );
      await assert.rejects(
        as(
          null,
          () =>
            submit(
              { request_key: id(211), kind: 'daily', dates: ['2027-02-09'], amount_pence: 500 },
              'b'.repeat(64),
            ),
          'service_role',
        ),
        /request_rate_limit/,
      );
      assert.equal(
        (await db.query("select count(*)::int as n from ramadan_sponsorships where kind='daily'"))
          .rows[0].n,
        10,
      );
      await assert.rejects(
        as(
          null,
          () => submit({ request_key: id(212), kind: 'daily', amount_pence: 0 }),
          'service_role',
        ),
        /invalid_request/,
      );
    });
  } finally {
    await db.close();
  }
});
