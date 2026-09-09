import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImage } from '../src/lib/images.js';
import { parseTimetable, prayerFields } from '../src/lib/timetable.js';

test('picture uploads match the live storage MIME and size limits', () => {
  for (const [type, extension] of [['image/jpeg','jpg'],['image/png','png'],['image/webp','webp']]) {
    assert.equal(validateImage({type,size:100}), extension);
  }
  for (const file of [{type:'image/heic',size:100},{type:'image/svg+xml',size:100},{type:'image/jpeg',size:0},{type:'image/jpeg',size:8388609}]) {
    assert.throws(() => validateImage(file), /JPG, PNG or WebP/);
  }
});
const header = ['date', ...prayerFields.map(([key]) => key)].join(',');
const row = date => [date,...prayerFields.map(() => '13:30')].join(',');
test('timetable accepts UK dates and rejects invalid dates and duplicate rows', () => {
  assert.equal(parseTimetable(header+'\n'+row('10/09/2026'))[0].d_date,'2026-09-10');
  assert.throws(() => parseTimetable(header+'\n'+row('2026-02-30')), /real date/);
  assert.throws(() => parseTimetable(header+'\n'+row('2026-09-10')+'\n'+row('2026-09-10')), /Duplicate date/);
});
test('timetable rejects missing columns and invalid prayer times', () => {
  assert.throws(() => parseTimetable('date,fajr_begins\n2026-09-10,04:00'), /Missing columns/);
  assert.throws(() => parseTimetable(header+'\n'+row('2026-09-10').replace('13:30','25:00')), /24-hour time/);
});
