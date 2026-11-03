import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';

test('additional prayer times require staff approval and preserve published dates and edits', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  t.after(() => db.close());
  await db.exec(`create table prayer_times(d_date date primary key,sunrise time);
 insert into prayer_times values('2026-11-03','07:00');
 insert into profiles(id,display_name,permissions) values('${id(7)}','Timetable editor','{prayer_times}');`);
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/20261103092000_additional_prayer_times.sql', import.meta.url),
      'utf8',
    ),
  );
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
    'invalid date, incomplete interval, missing source and unsupported clocks fail',
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
});
