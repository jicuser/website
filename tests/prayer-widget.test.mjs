import test from 'node:test';
import assert from 'node:assert/strict';
import { prayerFixture, prayerMarkup } from './helpers/prayer-widget-fixture.mjs';

test('every timetable style preserves six prayers, jamaah times and both Friday prayers', () => {
  for (const style of ['horizontal', 'vertical', 'compact', 'clock-table']) {
    const markup = prayerMarkup(style);
    for (const name of ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'First Jummah', 'Second Jummah']) {
      assert.match(markup, new RegExp(name), `${style} must include ${name}`);
    }
    for (const time of ['6:14 AM', '6:45 AM', '7:31 AM', '12:59 PM', '1:45 PM', '4:22 PM', '5:15 PM', '6:18 PM', '7:29 PM', '8:15 PM', '1:30 PM', '2:30 PM']) {
      assert.ok(markup.includes(time), `${style} must include ${time}`);
    }
    assert.equal((markup.match(/aria-current="time"/g) || []).length, 1);
  }
});

test('vertical table keeps the start and jamaah values in separate columns', () => {
  const markup = prayerMarkup('vertical');
  assert.match(markup, /Salah<\/span><span>Start<\/span><span>Jama‘ah<\/span>/);
  assert.equal((markup.match(/class="scene-prayer-table-row/g) || []).length, 6);
  assert.doesNotMatch(prayerMarkup('compact'), /lang="ar"/);
  assert.match(markup, /lang="ar"/);
});

test('a timetable without Friday data does not reserve an empty Friday row', () => {
  const markup = prayerMarkup('vertical', { prayers: { ...prayerFixture, jummahTimes: [] } });
  assert.doesNotMatch(markup, /scene-jummah-row|has-jummah/);
});

test('clock-table uses twelve-hour London time in summer and winter', () => {
  assert.match(prayerMarkup('clock-table'), /04:10 pm/);
  assert.match(prayerMarkup('clock-table', { now: new Date('2026-12-14T15:10:00Z') }), /03:10 pm/);
});
