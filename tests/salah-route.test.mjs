import test from 'node:test';
import assert from 'node:assert/strict';
import { isSalahRoute } from '../src/lib/salahRoute.js';

test('Salah owns its timetable controls on daily, monthly, Jummah and alert routes', () => {
  for (const path of [
    '/prayer-times',
    '/prayer-times/monthly',
    '/prayer-times/jummah',
    '/prayer-times/reminders',
  ]) {
    assert.equal(isSalahRoute(path), true);
    assert.equal(isSalahRoute(`${path}/`), true);
  }
  for (const path of ['/', '/services', '/prayer-timesheet', '/worship/prayer-guide']) {
    assert.equal(isSalahRoute(path), false);
  }
});
