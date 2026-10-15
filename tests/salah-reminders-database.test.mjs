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
