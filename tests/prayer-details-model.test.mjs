import test from 'node:test';
import assert from 'node:assert/strict';
import { detailsDraft, detailsPayload } from '../src/features/prayer-details/model.js';
test('extra-time drafts retain blank values, source and revision without invented clocks', () => {
  assert.deepEqual(detailsDraft(null), {
    sunset: '',
    zawwal_start: '',
    zawwal_end: '',
    source: '',
    published: false,
    revision: 0,
  });
  assert.equal(detailsDraft({ sunset: '16:32:00', revision: 4 }).sunset, '16:32');
  const f = {
    ...detailsDraft(null),
    sunset: '16:32',
    source: 'Approved timetable',
    published: true,
  };
  const payload = detailsPayload('2026-11-03', f);
  assert.equal(payload.p_zawwal_start, null);
  assert.equal(payload.p_expected_revision, 0);
  const single = detailsPayload('2026-11-03', { ...f, sunset: '', zawwal_start: '11:46' });
  assert.equal(single.p_zawwal_start, '11:46');
  assert.equal(single.p_zawwal_end, null);
  assert.equal(single.p_sunset, null);
  for (const patch of [
    { sunset: '24:00' },
    { sunset: '4:30' },
    { source: '' },
    { zawwal_end: '12:00' },
    { zawwal_start: '12:00', zawwal_end: '11:55' },
  ])
    assert.throws(() => detailsPayload('2026-11-03', { ...f, ...patch }));
  assert.throws(() => detailsPayload('2026-02-30', f));
});
