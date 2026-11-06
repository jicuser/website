import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('Salah device privacy, ownership, timing and delivery leases', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  // Vault and network/scheduler primitives are isolated fixtures. The production
  // migration's tables, grants, RPCs and timetable SQL execute unchanged.
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema private;create schema vault;create schema extensions;create schema cron;create schema net;
    create table vault.secrets(id uuid primary key default gen_random_uuid(),name text unique,decrypted_secret text);
    create view vault.decrypted_secrets as select * from vault.secrets;
    create function vault.create_secret(value text,name text,description text) returns uuid language plpgsql as $$ declare result uuid;begin insert into vault.secrets(name,decrypted_secret) values(name,value) returning id into result;return result;end;$$;
    create function extensions.gen_random_bytes(n integer) returns bytea language sql as $$select decode(repeat('ab',n),'hex')$$;
    create function cron.schedule(name text,schedule text,command text) returns bigint language sql as $$select 1::bigint$$;
    create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language sql as $$select 1::bigint$$;
    grant usage on schema public,vault,extensions to service_role;
    grant all on vault.secrets to service_role;grant select on vault.decrypted_secrets to service_role;
    create table prayer_times(d_date date primary key,fajr_begins time,fajr_jamah time,zuhr_begins time,zuhr_jamah time,asr_begins time,asr_jamah time,maghrib_begins time,maghrib_jamah time,isha_begins time,isha_jamah time);
    grant select on prayer_times to service_role;
    insert into prayer_times values('2026-10-14','06:14','06:45','12:59','13:45','16:22','17:15','18:18','18:18','19:29','20:15'),('2026-10-25','05:19','06:15','11:57','13:00','15:01','15:45','16:55','16:55','18:40','19:30');`);
  const sql = (
    await readFile(
      new URL('../supabase/migrations/20261015001000_salah_reminders.sql', import.meta.url),
      'utf8',
    )
  ).replace(/^create extension if not exists (pg_cron|pg_net);$/gm, '');
  await db.exec(sql);
  await db.exec(`
    create function private.has_permission(value text) returns boolean language sql as $$select coalesce(current_setting('test.prayer_permission',true),'')='yes'$$;
    grant usage on schema private to authenticated;
    create table public.page_content(content_key text primary key,content_value text,content_type text,page text);
    alter table public.page_content enable row level security;
    create policy content_read on public.page_content for select using(true);
    grant select on public.page_content to service_role,authenticated;
    grant insert,update on public.page_content to authenticated;
    grant update on public.prayer_times to authenticated;
    alter table public.prayer_times add jummah_1_start time, add jummah_1_jamah time, add jummah_2_begins time, add jummah_2_jamah time;
    grant select on public.prayer_times to authenticated;
    insert into page_content values('jummah_settings','{"jummah_1_start":null,"jummah_1_jamah":"12:35","jummah_2_begins":null,"jummah_2_jamah":"13:30"}','json','prayer-times');
    insert into prayer_times(d_date,zuhr_begins,zuhr_jamah,jummah_1_jamah,jummah_2_jamah) values('2026-11-06','11:56','13:00','12:35','13:30');
  `);
  await db.exec(
    await readFile(
      new URL(
        '../supabase/migrations/20261106090854_connect_friday_jummah_times.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const call = async (name, args = [], role = 'service_role') => {
    await db.exec(`set role ${role}`);
    try {
      return (
        await db.query(
          `select public.${name}(${args.map((_, index) => `$${index + 1}`).join(',')}) result`,
          args,
        )
      ).rows[0].result;
    } finally {
      await db.exec('reset role');
    }
  };
  const id = '10000000-0000-4000-8000-000000000001',
    proof = 'a'.repeat(64);
  const sub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test',
    keys: { p256dh: 'test', auth: 'test' },
  };
  const prefs = {
    start: true,
    jamaah: true,
    startMinutes: 10,
    jamaahMinutes: 10,
    prayers: ['maghrib'],
  };
  await t.test(
    'anonymous and authenticated clients cannot read private devices or call service RPCs',
    async () => {
      for (const role of ['anon', 'authenticated']) {
        await assert.rejects(call('salah_reminder_runtime', [], role), /permission denied/);
        await db.exec(`set role ${role}`);
        try {
          await assert.rejects(
            db.query('select * from private.salah_reminder_devices'),
            /permission denied/,
          );
        } finally {
          await db.exec('reset role');
        }
      }
    },
  );
  let saved = await call('salah_reminder_device', ['save', id, proof, sub, prefs, null]);
  await t.test('only the device proof can inspect, modify or remove its settings', async () => {
    assert.equal(saved.active, true);
    assert.equal(Object.hasOwn(saved, 'subscription'), false);
    for (const action of ['status', 'remove', 'save'])
      await assert.rejects(
        call('salah_reminder_device', [action, id, 'b'.repeat(64), sub, prefs, saved.updated_at]),
        /Device access/,
      );
    await assert.rejects(
      call('salah_reminder_device', ['save', id, proof, sub, prefs, null]),
      /settings changed/,
    );
  });
  await db.exec('update private.salah_reminder_runtime set enabled=true');
  await t.test(
    'summer UK time is converted correctly and both notification types get one lease each',
    async () => {
      const early = await call('salah_reminder_claim', ['2026-10-14T17:07:00Z']);
      assert.equal(early.length, 0);
      const jobs = await call('salah_reminder_claim', ['2026-10-14T17:08:00Z']);
      assert.equal(jobs.length, 2);
      assert.ok(
        jobs.every((job) => Date.parse(job.event_at) === Date.parse('2026-10-14T17:18:00Z')),
      );
      assert.equal((await call('salah_reminder_claim', ['2026-10-14T17:08:30Z'])).length, 0);
      await call('salah_reminder_finish', [
        jobs.map(({ id, lease }) => ({ id, lease })),
        'sent',
        null,
      ]);
      assert.equal((await call('salah_reminder_claim', ['2026-10-14T17:09:00Z'])).length, 0);
    },
  );
  await t.test(
    'winter time after the DST change uses the uploaded clock time without a one-hour error',
    async () => {
      assert.equal((await call('salah_reminder_claim', ['2026-10-25T15:45:00Z'])).length, 0);
      const jobs = await call('salah_reminder_claim', ['2026-10-25T16:45:00Z']);
      assert.equal(jobs.length, 2);
      assert.ok(
        jobs.every((job) => Date.parse(job.event_at) === Date.parse('2026-10-25T16:55:00Z')),
      );
    },
  );
  await t.test(
    'failed transport retries have new leases, and stale acknowledgements cannot overwrite them',
    async () => {
      const jobs = await call('salah_reminder_claim', ['2026-10-25T16:46:31Z']);
      assert.equal(jobs.length, 2);
      const old = jobs.map((job) => ({ ...job, lease: '20000000-0000-4000-8000-000000000002' }));
      await call('salah_reminder_finish', [old, 'sent', null]);
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from private.salah_reminder_deliveries where status='leased'",
          )
        ).rows[0].n,
        2,
      );
      await call('salah_reminder_finish', [
        jobs.map(({ id, lease }) => ({ id, lease })),
        'pending',
        null,
      ]);
    },
  );
  await t.test(
    'late catch-up does not notify after the prayer or replay old receipts',
    async () => {
      assert.equal((await call('salah_reminder_claim', ['2026-10-25T17:00:00Z'])).length, 0);
    },
  );
  await t.test('zero-minute reminders allow the scheduler a short run-time grace', async () => {
    const zero = { ...prefs, startMinutes: 0, jamaahMinutes: 0 };
    saved = await call('salah_reminder_device', ['save', id, proof, sub, zero, saved.updated_at]);
    await db.exec('delete from private.salah_reminder_deliveries');
    const jobs = await call('salah_reminder_claim', ['2026-10-14T17:18:02Z']);
    assert.equal(jobs.length, 2);
    assert.equal((await call('salah_reminder_claim', ['2026-10-14T17:20:01Z'])).length, 0);
  });
  await t.test(
    'Friday alerts use two Jummah sessions and never the ordinary Dhuhr congregation',
    async () => {
      saved = await call('salah_reminder_device', [
        'save',
        id,
        proof,
        sub,
        { ...prefs, prayers: ['dhuhr'] },
        saved.updated_at,
      ]);
      await db.exec('delete from private.salah_reminder_deliveries');
      const first = await call('salah_reminder_claim', ['2026-11-06T12:25:00Z']);
      assert.equal(first.length, 1);
      assert.equal(first[0].prayer, 'jummah_1');
      await call('salah_reminder_finish', [
        first.map(({ id, lease }) => ({ id, lease })),
        'sent',
        null,
      ]);
      assert.equal((await call('salah_reminder_claim', ['2026-11-06T12:50:00Z'])).length, 0);
      const second = await call('salah_reminder_claim', ['2026-11-06T13:20:00Z']);
      assert.equal(second.length, 1);
      assert.equal(second[0].prayer, 'jummah_2');
    },
  );
  await t.test('a date override or edited weekly time invalidates pending old alerts', async () => {
    await db.exec(
      "update private.salah_reminder_deliveries set status='pending'; update prayer_times set jummah_2_jamah='13:45' where d_date='2026-11-06'",
    );
    assert.equal((await call('salah_reminder_claim', ['2026-11-06T13:20:30Z'])).length, 0);
    const updated = await call('salah_reminder_claim', ['2026-11-06T13:35:00Z']);
    assert.equal(updated.length, 1);
    assert.equal(Date.parse(updated[0].event_at), Date.parse('2026-11-06T13:45:00Z'));
  });
  await t.test(
    'weekly save is permission checked, atomic and preserves distinct exceptions and history',
    async () => {
      const old = {
        jummah_1_start: null,
        jummah_1_jamah: '12:35',
        jummah_2_begins: null,
        jummah_2_jamah: '13:30',
      };
      const next = { ...old, jummah_1_jamah: '12:45', jummah_2_jamah: '13:45' };
      await assert.rejects(call('save_jummah_settings', [next, old], 'anon'), /permission denied/);
      await assert.rejects(
        call('save_jummah_settings', [next, old], 'authenticated'),
        /permission required/,
      );
      await db.exec(
        "set test.prayer_permission='yes'; insert into prayer_times(d_date,zuhr_begins,zuhr_jamah,jummah_1_jamah,jummah_2_jamah) values('2099-01-02','11:56','13:00','12:35','13:30'),('2099-01-09','11:56','13:00','12:50','14:00'),('2020-01-03','11:56','13:00','12:35','13:30')",
      );
      assert.deepEqual(await call('save_jummah_settings', [next, old], 'authenticated'), next);
      const records = (
        await db.query(
          "select d_date::text,jummah_1_jamah::text from prayer_times where d_date in ('2099-01-02','2099-01-09','2020-01-03') order by d_date",
        )
      ).rows;
      assert.equal(records[0].jummah_1_jamah, '12:35:00');
      assert.equal(records[1].jummah_1_jamah, null);
      assert.equal(records[2].jummah_1_jamah, '12:50:00');
      const events = (
        await db.query(
          "select prayer,event_at::text from private.salah_reminder_events('2099-01-02') where kind='jamaah'",
        )
      ).rows;
      assert.equal(events.length, 2);
      assert.match(events[0].event_at, /12:45/);
      assert.match(events[1].event_at, /13:45/);
      await assert.rejects(
        call('save_jummah_settings', [old, old], 'authenticated'),
        /changed in another editor/,
      );
      await assert.rejects(
        call('save_jummah_settings', [{ ...next, jummah_2_jamah: '12:00' }, next], 'authenticated'),
        /second after the first/,
      );
      await db.exec("set test.prayer_permission='no'");
    },
  );
  await t.test('turn-off deletes preferences and delivery receipts together', async () => {
    await call('salah_reminder_device', ['remove', id, proof]);
    assert.equal(
      (await db.query('select count(*)::int n from private.salah_reminder_devices')).rows[0].n,
      0,
    );
    assert.equal(
      (await db.query('select count(*)::int n from private.salah_reminder_deliveries')).rows[0].n,
      0,
    );
  });
});
