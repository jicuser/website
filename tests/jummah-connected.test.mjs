import test from 'node:test';
import assert from 'node:assert/strict';
import { prayerPublication } from '../src/lib/prayerPublication.js';
import { resolveJummah, parseJummahSettings } from '../src/lib/jummahSchedule.js';
import { prayerDisplayState } from '../src/lib/prayerDisplayState.js';
import { nextCongregation } from '../src/lib/nextCongregation.js';
import { buildMonthlyTimetable } from '../src/lib/monthlyTimetable.js';
import {
  notificationGroups,
  reminderNotification,
} from '../supabase/functions/salah-reminders/validation.mjs';
const date = '2026-11-06';
const row = {
  d_date: date,
  fajr_begins: '05:39',
  fajr_jamah: '06:30',
  sunrise: '07:13',
  zuhr_begins: '11:56',
  zuhr_jamah: '13:00',
  asr_begins: '14:39',
  asr_jamah: '15:15',
};
const weekly = { jummah_1_jamah: '12:35', jummah_2_jamah: '13:30' };
const publication = (settings = weekly, record = row) =>
  prayerPublication(
    {
      daily: { data: record },
      monthly: { data: [record] },
      fridayRow: { data: record },
      settings: { data: { content_value: JSON.stringify(settings) } },
    },
    date,
  );

test('all public consumers share the same dated Friday sessions and no ordinary Dhuhr Jamaat', () => {
  for (const settings of [weekly, { jummah_1_jamah: '12:45', jummah_2_jamah: '13:45' }]) {
    const data = publication(settings);
    assert.equal(data.todaysTimes.jamaah_dhuhr, null);
    assert.equal(data.todaysTimes.jummah_1_jamah, settings.jummah_1_jamah);
    assert.equal(data.monthlyPrayerTimes[0].jummah_2_jamah, settings.jummah_2_jamah);
    assert.equal(data.jummahTimes[0].prayer, settings.jummah_1_jamah);
    const morning = prayerDisplayState(data, new Date(`${date}T08:36:00Z`));
    assert.equal(morning.target.name, 'Jummah 1');
    assert.equal(morning.target.time, settings.jummah_1_jamah);
    const later = prayerDisplayState(data, new Date(`${date}T13:05:00Z`));
    assert.equal(later.target.name, 'Jummah 2');
    assert.equal(later.target.time, settings.jummah_2_jamah);
    assert.equal(
      nextCongregation(data.todaysTimes, data.jummahTimes, new Date(`${date}T13:05:00Z`)).time,
      settings.jummah_2_jamah,
    );
  }
});
test('dated exceptions win across the snapshot while the weekly export baseline stays independent', () => {
  const data = publication(weekly, { ...row, jummah_1_jamah: '12:50', jummah_2_jamah: '14:00' });
  assert.equal(data.jummahTimes[0].prayer, '12:50');
  assert.equal(data.weeklyJummahTimes[0].prayer, '12:35');
  assert.equal(data.monthlyPrayerTimes[0].jummah_2_jamah, '14:00');
});
test('missing, invalid or empty settings never invent Jummah or khutbah times', () => {
  for (const settings of ['bad JSON', null, '{}']) {
    const parsed = parseJummahSettings(settings);
    assert.equal(resolveJummah(null, parsed)[0].prayer, null);
  }
  assert.equal(resolveJummah(null, weekly)[0].khutbah, null);
  assert.equal(
    resolveJummah({ jummah_1_jamah: '12:20' }, { ...weekly, jummah_1_start: '12:30' })[0].khutbah,
    null,
  );
  assert.equal(
    nextCongregation(
      { d_date: date, jamaah_dhuhr: '13:00', jamaah_asr: '15:15' },
      [],
      new Date(`${date}T12:00:00Z`),
    ).name,
    'Asr',
  );
});
test('monthly table and print renderer suppress Friday Dhuhr Jamaat and reset Saturday ditto', () => {
  const data = publication();
  const table = buildMonthlyTimetable([
    ...data.monthlyPrayerTimes,
    { ...row, d_date: '2026-11-07' },
  ]);
  assert.equal(table.rows[0].cells.find((c) => c.key === 'zuhr_jamah').display, 'Jummah');
  assert.deepEqual(table.rows[0].jummah, ['12:35 PM', '1:30 PM']);
  assert.equal(table.rows[1].cells.find((c) => c.key === 'zuhr_jamah').repeated, false);
});
test('historical blank Fridays do not borrow the current weekly setting', () => {
  const data = prayerPublication(
    {
      monthly: { data: [{ ...row, d_date: '2026-10-30' }] },
      settings: { data: { content_value: JSON.stringify(weekly) } },
    },
    date,
  );
  assert.equal(data.monthlyPrayerTimes[0].jummah_1_jamah, null);
});
test('alerts name each Friday session and retain separate receipts', () => {
  const jobs = [1, 2].map((n) => ({
    device_id: 'device',
    prayer: `jummah_${n}`,
    kind: 'jamaah',
    id: String(n),
    lease: String(n),
    event_at: `${date}T13:30:00Z`,
    scheduled_at: `${date}T13:20:00Z`,
  }));
  const groups = notificationGroups(jobs);
  assert.equal(groups.length, 2);
  assert.match(reminderNotification(groups[0], new Date(`${date}T13:20:00Z`)).title, /1st Jummah/);
  assert.match(reminderNotification(groups[1], new Date(`${date}T13:20:00Z`)).title, /2nd Jummah/);
});
