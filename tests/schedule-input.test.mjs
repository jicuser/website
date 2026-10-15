import test from 'node:test';
import assert from 'node:assert/strict';
import { courseInput, hallInput, saveScheduleRecord } from '../src/lib/scheduleInput.js';

test('schedule inputs use an explicit field allowlist and validate dates, lengths and times', () => {
  const course = {
    title: ' Class ',
    day_of_week: '2',
    start_time: '09:00',
    end_time: '10:00',
    active: true,
    planner_visible: true,
    id: 'forged',
    created_at: 'forged',
    owner: true,
  };
  assert.deepEqual(Object.keys(courseInput(course)), [
    'title',
    'day_of_week',
    'start_time',
    'end_time',
    'location',
    'active',
    'planner_visible',
  ]);
  assert.equal(courseInput(course).title, 'Class');
  for (const fields of [
    { day_of_week: 9 },
    { start_time: '25:00' },
    { end_time: '08:00' },
    { title: 'x'.repeat(161) },
    { location: 'x'.repeat(241) },
  ])
    assert.throws(() => courseInput({ ...course, ...fields }));
  assert.deepEqual(
    hallInput({ booking_date: '2026-10-16', status: 'pending', email: 'private@example.com' }),
    { booking_date: '2026-10-16', status: 'pending', start_time: null, end_time: null },
  );
  for (const date of ['2026-02-31', '2026-00-10', '<script>', undefined])
    assert.throws(() => hallInput({ booking_date: date, status: 'booked' }));
  assert.throws(() => hallInput({ booking_date: '2026-10-16', status: 'invented' }));
});

test('a write is confirmed only after the server returns the saved row', async () => {
  let result = { data: null, error: null };
  const client = {
    from(table) {
      assert.equal(table, 'hall_bookings');
      const chain = {
        update(payload) {
          assert.equal(payload.status, 'pending');
          return chain;
        },
        eq(key, id) {
          assert.equal(key, 'id');
          assert.equal(id, 'row');
          return chain;
        },
        select(columns) {
          assert.equal(columns, 'id');
          return chain;
        },
        single() {
          return result;
        },
      };
      return chain;
    },
  };
  const input = { booking_date: '2026-10-16', status: 'pending' };
  await assert.rejects(
    () => saveScheduleRecord(client, 'hall_bookings', 'row', input),
    /not saved/,
  );
  result = { data: { id: 'row' }, error: { message: 'denied' } };
  await assert.rejects(
    () => saveScheduleRecord(client, 'hall_bookings', 'row', input),
    /not saved/,
  );
  result = { data: { id: 'row' }, error: null };
  assert.equal(await saveScheduleRecord(client, 'hall_bookings', 'row', input), 'row');
  await assert.rejects(
    () => saveScheduleRecord(client, 'profiles', 'row', input),
    /Unknown schedule/,
  );
});
