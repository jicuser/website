import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { december2026TimetableDesign as approved } from '../src/data/december2026TimetableDesign.js';
import {
  approvedTimetableAssets,
  saveTimetableDesign,
  timetableDesignDraft,
  timetableDesignPayload,
} from '../src/lib/timetableDesign.js';
import { timetablePresentation } from '../src/lib/timetablePresentation.js';

const rows = () =>
  Object.entries(approved.printCells).map(([d_date, cells]) => {
    const row = {
      d_date,
      ...Object.fromEntries(
        Object.entries(cells).map(([key, cell]) => [
          key === 'zawal' ? 'zawwal_start' : key,
          cell.value,
        ]),
      ),
    };
    return {
      ...row,
      maghrib_jamah: row.maghrib_begins,
      jummah_1_jamah: '12:35',
      jummah_2_jamah: '13:30',
    };
  });
const reorder = (value) =>
  value && typeof value === 'object'
    ? Object.fromEntries(
        Object.keys(value)
          .sort()
          .reverse()
          .map((key) => [key, reorder(value[key])]),
      )
    : value;

test('approved December downloads survive JSONB key reordering and preserve every printed blank/ditto', () => {
  const design = reorder(approved);
  const values = rows();
  assert.equal(
    approvedTimetableAssets(values, design)['monthly-timetable'].pdf,
    '/downloads/december-2026/timetable.pdf',
  );
  const table = timetablePresentation(values, design);
  for (const row of table.rows) {
    for (const [key, cell] of Object.entries(approved.printCells[row.isoDate]))
      assert.equal(
        row.cells.find((entry) => entry.key === key).display,
        cell.display,
        `${row.isoDate} ${key}`,
      );
    assert.equal(
      row.cells.find((entry) => entry.key === 'hijri').display,
      approved.hijriDates[row.isoDate],
    );
  }
});

test('a changed prayer value invalidates static downloads and the entire original ditto chain', () => {
  const values = rows();
  values[0].zuhr_begins = '12:03';
  assert.equal(approvedTimetableAssets(values, approved), null);
  const table = timetablePresentation(values, approved);
  assert.equal(table.rows[0].cells.find((cell) => cell.key === 'zuhr_begins').display, '12:03');
  assert.equal(table.rows[1].cells.find((cell) => cell.key === 'zuhr_begins').display, '12:02');
  assert.equal(table.rows[1].cells.find((cell) => cell.key === 'fajr_jamah').display, '"');
  assert.equal(approvedTimetableAssets(rows(), { ...approved, notice: 'Confirmed change' }), null);
  const changedFriday = rows();
  changedFriday[3].jummah_2_jamah = '14:00';
  assert.equal(approvedTimetableAssets(changedFriday, approved), null);
  const changedZawal = rows();
  changedZawal[0].zawwal_end = '11:58';
  assert.equal(approvedTimetableAssets(changedZawal, approved), null);
  assert.equal(
    timetablePresentation(changedZawal, approved).rows[0].cells.find((cell) => cell.key === 'zawal')
      .display,
    '11:52 – 11:58',
  );
});

test('month design saves use the loaded revision and reject an unconfirmed receipt', async () => {
  const draft = timetableDesignDraft({ design: approved, revision: 7, published: true });
  let request;
  const client = {
    rpc: async (name, payload) => {
      request = { name, payload };
      return {
        data: { month: payload.p_month, design: payload.p_design, published: true, revision: 8 },
      };
    },
  };
  const saved = await saveTimetableDesign(client, '2026-12', draft);
  assert.equal(request.name, 'save_prayer_timetable_month');
  assert.equal(request.payload.p_expected_revision, 7);
  assert.equal(saved.revision, 8);
  await assert.rejects(
    saveTimetableDesign(
      { rpc: async () => ({ data: { month: '2026-12-01', revision: 7 } }) },
      '2026-12',
      draft,
    ),
    /could not be confirmed/,
  );
  assert.throws(
    () =>
      timetableDesignPayload('2026-12', {
        ...draft,
        design: { ...approved, noticeDate: '2027-01-01' },
      }),
    /notice date/,
  );
});

test('saved month design enforces public/published access, editor permission and stale revision protection', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema private;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function private.has_permission(required text) returns boolean language sql stable as $$select current_setting('request.jwt.claim.sub',true)='00000000-0000-4000-8000-000000000001' and required='prayer_times'$$;
      grant usage on schema public,auth,private to anon,authenticated,service_role;`);
    await db.exec(
      await readFile(
        new URL('../supabase/migrations/20261125213002_prayer_timetable_months.sql', import.meta.url),
        'utf8',
      ),
    );
    const as = async (role, user, fn) => {
      await db.exec(
        `set role ${role}; select set_config('request.jwt.claim.sub','${user}',false);`,
      );
      try {
        return await fn();
      } finally {
        await db.exec('reset role');
      }
    };
    const save = (published, revision) =>
      db.query('select public.save_prayer_timetable_month($1,$2::jsonb,$3,$4) saved', [
        '2027-01-01',
        JSON.stringify({ notice: 'A confirmed notice' }),
        published,
        revision,
      ]);
    await as('anon', '', async () => {
      assert.equal(
        (await db.query('select month from public.prayer_timetable_months')).rows.length,
        1,
      );
      await assert.rejects(save(true, 0), /permission denied/);
    });
    await as('authenticated', '00000000-0000-4000-8000-000000000002', async () => {
      await assert.rejects(save(true, 0), /permission required/);
      await assert.rejects(
        db.query(
          "insert into public.prayer_timetable_months(month,design,published) values('2027-02-01','{}',true)",
        ),
        /permission denied/,
      );
    });
    await as('authenticated', '00000000-0000-4000-8000-000000000001', async () => {
      assert.equal((await save(false, 0)).rows[0].saved.revision, 1);
      await assert.rejects(
        db.query("update public.prayer_timetable_months set design='{}' where month='2027-01-01'"),
        /permission denied/,
      );
      await assert.rejects(save(true, 0), /another editor/);
    });
    await as('anon', '', async () =>
      assert.equal(
        (
          await db.query(
            "select month from public.prayer_timetable_months where month='2027-01-01'",
          )
        ).rows.length,
        0,
      ),
    );
    await as('authenticated', '00000000-0000-4000-8000-000000000001', async () =>
      assert.equal((await save(true, 1)).rows[0].saved.revision, 2),
    );
    await as('anon', '', async () =>
      assert.equal(
        (
          await db.query(
            "select month from public.prayer_timetable_months where month='2027-01-01'",
          )
        ).rows.length,
        1,
      ),
    );
    assert.equal(
      (
        await db.query(
          "select prosecdef from pg_proc join pg_namespace n on n.oid=pronamespace where proname='save_prayer_timetable_month' and n.nspname='public'",
        )
      ).rows[0].prosecdef,
      false,
    );
  } finally {
    await db.close();
  }
});
