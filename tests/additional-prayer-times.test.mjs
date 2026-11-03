import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';

test('additional prayer times require staff approval and preserve published dates and edits', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  t.after(() => db.close());
  await db.exec(`create table prayer_times(d_date date primary key,sunrise time);
 insert into profiles(id,display_name,permissions) values('${id(7)}','Timetable editor','{prayer_times}');`);
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/20261103092000_additional_prayer_times.sql', import.meta.url),
      'utf8',
    ),
  );
  const printed = await readFile(
    new URL('../supabase/migrations/20261103205329_printed_zawal.sql', import.meta.url),
    'utf8',
  );
  // An empty installation gets the schema without manufacturing main timetable dates.
  await db.exec(printed);
  await db.exec("insert into prayer_times values ('2026-11-03', '07:00')");
  const save = (
    version = 0,
    published = false,
    start = '11:48',
    end = '12:02',
    source = 'Approved November timetable',
  ) =>
    rpc('save_prayer_day_details', ['2026-11-03', '16:30', start, end, source, published, version]);
  await t.test('unrelated or anonymous users cannot write', async () => {
    await as(id(5), () => assert.rejects(() => save(), /permission/));
    await as(null, () => assert.rejects(() => save(), /permission denied/), 'anon');
  });
  await t.test(
    'invalid date, end without start, missing source and unsupported clocks fail',
    async () => {
      await as(id(7), async () => {
        await assert.rejects(() => save(0, true, '12:02', '11:48'), /interval/);
        await assert.rejects(() => save(0, true, null, '12:02'), /interval/);
        await assert.rejects(() => save(0, true, '11:48', '12:02', ''), /source/);
        await assert.rejects(
          () =>
            rpc('save_prayer_day_details', ['2026-11-03', '24:00', null, null, 'Source', true, 0]),
          /clock/,
        );
        await assert.rejects(
          () =>
            rpc('save_prayer_day_details', ['2026-11-04', '16:30', null, null, 'Source', true, 0]),
          /timetable/,
        );
      });
    },
  );
  await t.test(
    'draft stays private, publication is explicit, stale writes reject atomically',
    async () => {
      const saved = await as(id(7), () => save());
      assert.equal(saved.revision, 1);
      await as(
        null,
        async () =>
          assert.equal((await db.query('select * from prayer_day_details')).rows.length, 0),
        'anon',
      );
      const published = await as(id(7), () => save(1, true));
      assert.equal(published.revision, 2);
      await as(
        null,
        async () => {
          const rows = (await db.query('select * from prayer_day_details')).rows;
          assert.equal(rows.length, 1);
          assert.equal(rows[0].sunset, '16:30:00');
          assert.equal('approved_by' in rows[0], false);
          await assert.rejects(
            () => db.query('select * from prayer_details_audit'),
            /permission denied/,
          );
        },
        'anon',
      );
      await as(id(7), () => assert.rejects(() => save(1, false), /changed/));
      assert.equal((await db.query('select revision from prayer_day_details')).rows[0].revision, 2);
      assert.equal((await db.query('select count(*) n from prayer_details_audit')).rows[0].n, 2);
    },
  );
  await t.test(
    'ordinary timetable replacement cannot erase extras; unpublishing retains history',
    async () => {
      await db.exec("update prayer_times set sunrise='07:02' where d_date='2026-11-03'");
      assert.equal(
        (await db.query('select sunset from prayer_day_details')).rows[0].sunset,
        '16:30:00',
      );
      await as(id(7), () => save(2, false));
      await as(
        null,
        async () =>
          assert.equal((await db.query('select * from prayer_day_details')).rows.length, 0),
        'anon',
      );
      assert.equal((await db.query('select count(*) n from prayer_details_audit')).rows[0].n, 3);
    },
  );
  await t.test('a single printed time can be saved, published and revised', async () => {
    const saved = await as(id(7), () => save(3, true, '11:46', null));
    assert.equal(saved.zawwal_start, '11:46:00');
    assert.equal(saved.zawwal_end, null);
    assert.equal(saved.revision, 4);
  });
});

test('November seed follows printed date spans, keeps sunrise and existing staff details', async (t) => {
  const { db, as } = await formsDatabase();
  t.after(() => db.close());
  await db.exec(`create table prayer_times(d_date date primary key,sunrise time);
    insert into prayer_times select d, '07:07'::time from generate_series(date '2026-10-31', date '2026-12-01', interval '1 day') d;`);
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/20261103092000_additional_prayer_times.sql', import.meta.url),
      'utf8',
    ),
  );
  await db.exec(
    "insert into prayer_day_details (d_date,sunset,source,revision) values ('2026-11-02','16:30','Staff draft',3)",
  );
  const migration = await readFile(
    new URL('../supabase/migrations/20261103205329_printed_zawal.sql', import.meta.url),
    'utf8',
  );
  await db.exec(migration);
  // Re-running the import alone preserves revisions and existing edits.
  await db.exec(migration.slice(migration.indexOf('do $november$')));
  const publicDays = await as(
    null,
    async () =>
      (
        await db.query(
          'select d_date::text as date, zawwal_start::text as zawal, zawwal_end, sunset, source, revision from prayer_day_details order by d_date',
        )
      ).rows,
    'anon',
  );
  const minutes = [
    46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 47, 47, 47, 47, 47, 47, 48, 48, 48, 48, 48, 49, 49, 49,
    50, 50, 50, 51, 51, 51,
  ];
  const expected = minutes
    .map((m, index) => [`2026-11-${String(index + 1).padStart(2, '0')}`, `11:${m}:00`])
    .filter(([date]) => date !== '2026-11-02');
  assert.deepEqual(
    publicDays.map((row) => [row.date, row.zawal]),
    expected,
  );
  assert.ok(
    publicDays.every(
      (row) =>
        row.sunset === null &&
        row.zawwal_end === null &&
        row.revision === 1 &&
        row.source.includes('printed November 2026'),
    ),
  );
  assert.deepEqual(
    (
      await db.query(
        "select source, revision, published, sunset::text from prayer_day_details where d_date='2026-11-02'",
      )
    ).rows[0],
    { source: 'Staff draft', revision: 3, published: false, sunset: '16:30:00' },
  );
  assert.equal(
    (await db.query("select count(*)::int as n from prayer_times where sunrise='07:07'")).rows[0].n,
    32,
  );
});
