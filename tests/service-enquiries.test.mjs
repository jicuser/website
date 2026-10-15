import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';
import {
  SERVICE_ENQUIRIES,
  serviceEnquiryForPath,
  hallDateStatus,
  hallMonthRange,
  hallFormPrefill,
} from '../src/lib/serviceEnquiries.js';

test('each service has one named enquiry and canonical source page', () => {
  assert.equal(new Set(SERVICE_ENQUIRIES.map((form) => form.slug)).size, 4);
  assert.equal(serviceEnquiryForPath('/services/nikah').slug, 'nikah-enquiry');
  assert.equal(serviceEnquiryForPath('/funerals/contact-support').slug, 'funeral-enquiry');
  assert.equal(serviceEnquiryForPath('/unknown'), null);
});

test('hall dates are unknown until explicitly published; part-day slots do not claim full-day availability', () => {
  assert.equal(hallDateStatus([], '2026-10-15'), 'unknown');
  assert.equal(
    hallDateStatus([{ booking_date: '2026-10-15', status: 'available' }], '2026-10-15'),
    'available',
  );
  assert.equal(
    hallDateStatus(
      [{ booking_date: '2026-10-15', status: 'booked', start_time: '10:00', end_time: '12:00' }],
      '2026-10-15',
    ),
    'partial',
  );
  assert.equal(
    hallDateStatus([{ booking_date: '2026-10-15', status: 'closed' }], '2026-10-15'),
    'closed',
  );
  assert.deepEqual(hallMonthRange(2026, 9), { first: '2026-10-01', last: '2026-10-31' });
});

test('booking prefill accepts only a real date on the hall form', () => {
  assert.deepEqual(hallFormPrefill('hall-booking', '?date=2026-10-16'), {
    preferred_date: '2026-10-16',
  });
  for (const value of ['2026-02-31', '<script>', '2026-1-1'])
    assert.deepEqual(hallFormPrefill('hall-booking', `?date=${value}`), {});
  assert.deepEqual(hallFormPrefill('nikah-enquiry', '?date=2026-10-16'), {});
});

test('service release publishes actual forms, keeps responses private and preserves existing form edits', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  t.after(() => db.close());
  const sql = await readFile(
    new URL('../supabase/migrations/20261015003000_service_enquiries.sql', import.meta.url),
    'utf8',
  );
  await db.exec(sql);
  for (const { slug } of SERVICE_ENQUIRIES) {
    const form = await as(null, () => rpc('get_public_form', [slug]), 'anon');
    assert.equal(form.slug, slug);
    assert.ok(form.schema.fields.some((field) => field.id === 'email' && field.required));
    assert.ok(!form.schema.fields.some((field) => field.type === 'file'));
    const answers = {
      name: 'Test enquiry',
      email: 'enquiry@example.org',
      message: 'Local automated test',
    };
    if (slug === 'hall-booking')
      Object.assign(answers, { preferred_date: '2026-10-16', event_type: 'Community event' });
    const receipt = await as(
      null,
      () =>
        rpc('submit_custom_form', [
          slug,
          1,
          JSON.stringify(answers),
          'a'.repeat(64),
          id(100 + SERVICE_ENQUIRIES.findIndex((entry) => entry.slug === slug)),
          null,
          '[]',
        ]),
      'service_role',
    );
    assert.ok(receipt);
  }
  await as(
    null,
    () => assert.rejects(() => db.query('select * from form_submissions'), /permission denied/),
    'anon',
  );
  await as(id(5), () =>
    assert.rejects(
      () => db.query("insert into hall_bookings(booking_date) values('2026-10-16')"),
      /row-level security/,
    ),
  );
  await as(id(1), () =>
    db.query("insert into hall_bookings(booking_date,status) values('2026-10-16','closed')"),
  );
  const publicRows = await as(
    null,
    () => db.query('select booking_date,status from hall_bookings'),
    'anon',
  );
  assert.equal(publicRows.rows.length, 1);
  await as(
    null,
    () => assert.rejects(() => db.query('select * from course_schedule'), /permission denied/),
    'anon',
  );
  await as(id(5), async () => {
    assert.equal((await db.query('select * from course_schedule')).rows.length, 0);
    assert.equal(
      (await db.query("update hall_bookings set status='available' returning id")).rows.length,
      0,
    );
    assert.equal((await db.query('delete from hall_bookings returning id')).rows.length, 0);
  });
  await as(id(1), () =>
    assert.rejects(
      () => db.query('update hall_bookings set created_at=now()'),
      /permission denied/,
    ),
  );
  await as(id(1), () =>
    assert.rejects(
      () =>
        db.query(
          "insert into hall_bookings(booking_date,start_time,end_time) values('2026-10-16','12:00','11:00')",
        ),
      /check constraint/,
    ),
  );
  await db.exec(
    "update custom_forms set enabled=false,title='Staff edited title' where slug='nikah-enquiry'",
  );
  await db.exec(sql);
  const existing = (
    await db.query("select title,enabled from custom_forms where slug='nikah-enquiry'")
  ).rows[0];
  assert.deepEqual(existing, { title: 'Staff edited title', enabled: false });
  assert.equal((await db.query('select count(*)::int n from course_schedule')).rows[0].n, 0);
});
