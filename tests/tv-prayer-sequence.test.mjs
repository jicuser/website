import test from 'node:test';
import assert from 'node:assert/strict';
import { tvPrayerSequence, prayerMinutes, tvSpecialNotice } from '../src/lib/tvPrayerSequence.js';
import {
  DEFAULT_TV_SETTINGS,
  validateSettings,
  isTvStaff,
} from '../supabase/functions/_shared/tv.js';
const times = {
  d_date: '2026-09-12',
  jamaah_fajr: '6:00 AM',
  jamaah_dhuhr: '1:45 PM',
  jamaah_asr: '6:00 PM',
  jamaah_maghrib: '7:35 PM',
  jamaah_isha: '9:15 PM',
};
const run = (local, options = {}, data = times, jummah = [], room = 'mens-main') =>
  tvPrayerSequence(new Date(`2026-09-12T${local}+01:00`), data, jummah, options, room);
test('Jamaah notice, five-minute dhikr delay and twenty-minute return have exact boundaries', () => {
  assert.equal(run('17:59:59'), null);
  assert.equal(run('18:00:00').phase, 'jamaah');
  assert.equal(run('18:04:59').phase, 'jamaah');
  assert.equal(run('18:05:00').phase, 'dhikr');
  assert.equal(run('18:19:59').phase, 'dhikr');
  assert.equal(run('18:20:00'), null);
});
test('Maghrib uses ten minutes and never treats the prayer beginning as Jamaah', () => {
  assert.equal(run('19:44:59').phase, 'jamaah');
  assert.equal(run('19:45:00').phase, 'dhikr');
  assert.equal(run('19:55:00'), null);
  assert.equal(run('18:00:00', {}, { ...times, jamaah_asr: '—', asr: '6:00 PM' }), null);
});
test('class mode, shoe-area and stale timetables suppress automatic notices', () => {
  assert.equal(run('18:05:00', { class_until: '2026-09-12T17:10:00Z' }), null);
  assert.equal(run('18:10:00', { class_until: '2026-09-12T17:10:00Z' }).phase, 'dhikr');
  assert.equal(run('18:05:00', { prayer_enabled: false }), null);
  assert.equal(run('18:05:00', {}, times, [], 'shoe-area'), null);
  assert.equal(run('18:05:00', {}, { ...times, d_date: '2026-09-11' }), null);
});
test('Friday uses both Jummah congregations and ignores the normal Dhuhr slot', () => {
  const friday = { ...times, d_date: '2026-09-11' };
  const jummah = [
    { name: 'First Jummah', prayer: '1:30 PM' },
    { name: 'Second Jummah', prayer: '2:30 PM' },
  ];
  const now = (h) => tvPrayerSequence(new Date(`2026-09-11T${h}+01:00`), friday, jummah);
  assert.equal(now('13:30:00').name, 'First Jummah');
  assert.equal(now('13:45:00').phase, 'dhikr');
  assert.equal(now('13:50:00'), null);
  assert.equal(now('14:30:00').name, 'Second Jummah');
});
test('London winter time and invalid clock values are handled', () => {
  assert.equal(
    tvPrayerSequence(new Date('2026-12-12T18:00:00Z'), { ...times, d_date: '2026-12-12' }).name,
    'Asr',
  );
  for (const value of ['25:00', '12:65', '0:30 PM', '—']) assert.equal(prayerMinutes(value), null);
  assert.equal(prayerMinutes('12:00 AM'), 0);
  assert.equal(prayerMinutes('12:00 PM'), 720);
});
test('shoe-area settings cannot enable live feeds and TV operators require active profiles', () => {
  const settings = validateSettings(
    { ...DEFAULT_TV_SETTINGS, mode: 'camera', camera_url: 'https://camera.local/live.m3u8' },
    'shoe-area',
  );
  assert.equal(settings.mode, 'posters');
  assert.equal(settings.camera_url, '');
  assert.equal(settings.prayer_enabled, false);
  assert.equal(isTvStaff({ role: 'tv_operator', is_active: true }), true);
  assert.equal(isTvStaff({ role: 'tv_operator', is_active: false }), false);
  assert.throws(() => validateSettings({ ...DEFAULT_TV_SETTINGS, class_until: 'invalid' }));
  assert.throws(() =>
    validateSettings({
      ...DEFAULT_TV_SETTINGS,
      class_until: new Date(Date.now() + 9 * 3600000).toISOString(),
    }),
  );
});

test('seasonal notices are limited to hall screens and yield to class mode', () => {
  const now = new Date('2026-09-12T12:00:00Z');
  assert.equal(tvSpecialNotice(now, { notice_mode: 'taraweeh' }, 'mens-main'), 'taraweeh');
  assert.equal(tvSpecialNotice(now, { notice_mode: 'jummah' }, 'shoe-area'), null);
  assert.equal(
    tvSpecialNotice(now, { notice_mode: 'jummah', class_until: '2026-09-12T13:00:00Z' }),
    null,
  );
  assert.equal(tvSpecialNotice(now, { notice_mode: 'unknown' }), null);
  assert.equal(validateSettings({ notice_mode: 'taraweeh' }, 'shoe-area').notice_mode, 'off');
});
test('notice settings reject malformed and oversized input without evaluating text', () => {
  for (const input of [
    { notice_mode: 'html' },
    { taraweeh_dua: [] },
    { jummah_notice: 'x'.repeat(1201) },
    { class_until: 12 },
  ])
    assert.throws(() => validateSettings(input));
  const text = "<script>alert(1)</script>'; DROP TABLE profiles; --";
  assert.equal(validateSettings({ jummah_notice: text }).jummah_notice, text);
});

import { ramadanScene, fastingTimes } from '../src/lib/tvPrayerSequence.js';
import { tvScene } from '../supabase/functions/_shared/tv.js';
test('Class and Speech expire exactly; only Class suspends prayer notices', () => {
  const end = '2026-09-12T18:00:00Z';
  for (const scene_mode of ['class', 'speech']) {
    assert.equal(tvScene({ scene_mode, class_until: end }, Date.parse(end) - 1), scene_mode);
    assert.equal(tvScene({ scene_mode, class_until: end }, Date.parse(end)), 'normal');
  }
  assert.equal(run('18:05:00', { scene_mode: 'speech', class_until: end }).phase, 'dhikr');
  assert.equal(run('18:05:00', { scene_mode: 'class', class_until: end }), null);
  assert.equal(tvScene({ scene_mode: 'ramadan' }), 'ramadan');
  assert.throws(() => validateSettings({ scene_mode: 'random' }));
  assert.throws(() => validateSettings({ event_title: 'x'.repeat(121) }));
});
test('Ramadan du‘a starts after Isha dhikr and lasts twenty minutes', () => {
  const at = (time) => ramadanScene(new Date(`2026-09-12T${time}+01:00`), times);
  assert.equal(at('21:34:59'), 'fasting');
  assert.equal(at('21:35:00'), 'taraweeh');
  assert.equal(at('21:54:59'), 'taraweeh');
  assert.equal(at('21:55:00'), 'fasting');
  assert.equal(ramadanScene(new Date('2026-09-13T12:00:00Z'), times), null);
  assert.equal(ramadanScene(new Date('2026-09-12T12:00:00Z'), times, 'shoe-area'), null);
});
test('fasting times move to the next date after iftar, including month boundaries', () => {
  const today = { d_date: '2026-09-30', fajr: '5:30 AM', maghrib: '6:40 PM' };
  const tomorrow = { d_date: '2026-10-01', fajr: '5:32 AM', maghrib: '6:38 PM' };
  const at = (time, next = tomorrow) =>
    fastingTimes(new Date(`2026-09-30T${time}+01:00`), today, next);
  assert.equal(at('18:39:59').d_date, today.d_date);
  assert.equal(at('18:40:00').d_date, tomorrow.d_date);
  assert.equal(at('23:59:59').fajr, '5:32 AM');
  assert.equal(at('20:00:00', null), null);
  assert.equal(at('20:00:00', today), null);
  assert.equal(fastingTimes(new Date('2026-10-01T12:00:00Z'), today, tomorrow), null);
});
