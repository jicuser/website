import test from 'node:test';
import assert from 'node:assert/strict';
import { TV_BOARD_LAYOUTS, tvBoardLayout, withTvBoardLayout } from '../src/lib/tvBoardLayouts.js';
import {
  DEFAULT_TV_SETTINGS,
  validateSettings,
  publicSettings,
} from '../supabase/functions/_shared/tv.js';
import { overlaps } from '../supabase/functions/_shared/tv-scenes.js';
import { tvNextCongregation, countdownParts } from '../src/lib/tvCountdown.js';

test('all board layouts survive the existing server contract without replacing other scenes', () => {
  for (const orientation of ['landscape', 'portrait'])
    for (const { id } of TV_BOARD_LAYOUTS) {
      const settings = structuredClone(DEFAULT_TV_SETTINGS);
      settings.display_orientation = orientation;
      const original = structuredClone(settings);
      settings.display_layouts = withTvBoardLayout(settings, id);
      const scene = settings.display_layouts[orientation].standby;
      const roundtrip = publicSettings(validateSettings(settings)).display_layouts[orientation]
        .standby;
      assert.deepEqual(roundtrip, scene);
      assert.equal(scene.layers.filter((layer) => layer.type === 'times').length, 1);
      assert.equal(
        scene.layers.some((layer) => layer.type === 'poster'),
        ['classic', 'noticeboard'].includes(id),
      );
      if (['iftar', 'daily-giving'].includes(id))
        assert.equal(
          scene.layers.find((layer) => layer.type === 'ramadan').ramadan_kind,
          id === 'iftar' ? 'iftar' : 'daily',
        );
      for (const layer of scene.layers) {
        assert.ok(
          !scene.layers.some((other) => other !== layer && overlaps(layer, other)),
          `${id}: blocks have their own space`,
        );
      }
      for (const key of ['before', 'jamaah', 'dhikr', 'jummah', 'ramadan'])
        assert.deepEqual(
          settings.display_layouts[orientation][key],
          original.display_layouts[orientation][key],
        );
      const other = orientation === 'landscape' ? 'portrait' : 'landscape';
      assert.deepEqual(settings.display_layouts[other], original.display_layouts[other]);
      assert.deepEqual(settings.scenes, original.scenes);
      assert.deepEqual(settings.scheduled_scenes, original.scheduled_scenes);
    }
  assert.throws(() => tvBoardLayout('unknown'));
  assert.throws(() => tvBoardLayout('classic', 'square'));
});

const times = (day) => ({
  d_date: day,
  fajr: '06:15',
  jamaah_fajr: '06:45',
  dhuhr: '12:58',
  jamaah_dhuhr: '13:45',
  jamaah_asr: '17:15',
  jamaah_maghrib: '18:16',
  jamaah_isha: '20:15',
});
const at = (date, data) => tvNextCongregation(data, new Date(date));

test('board countdown targets jamaah after the prayer begins and updates to the second', () => {
  const next = at('2026-10-15T12:10:17Z', { todaysTimes: times('2026-10-15') });
  assert.equal(next.name, 'Dhuhr');
  assert.equal(next.seconds, 34 * 60 + 43);
  assert.deepEqual(countdownParts(next.seconds), ['00', '34', '43']);
  assert.equal(at('2026-10-15T12:45:00Z', { todaysTimes: times('2026-10-15') }).seconds, 0);
});

test('Friday uses the next published Jummah session instead of ordinary Dhuhr', () => {
  const data = {
    todaysTimes: times('2026-10-16'),
    jummahTimes: [
      { prayer: '13:30', khutbah: '13:15' },
      { prayer: '14:30', khutbah: '14:15' },
    ],
  };
  const next = at('2026-10-16T12:31:15Z', data);
  assert.equal(next.name, 'Jummah 2');
  assert.equal(next.key, 'jummah');
  assert.equal(next.seconds, 58 * 60 + 45);
});

test('after Isha the countdown needs a real tomorrow row, including at year end', () => {
  const data = { todaysTimes: times('2026-12-31'), tomorrowsTimes: times('2027-01-01') };
  assert.equal(at('2026-12-31T22:00:00Z', data).seconds, 8 * 3600 + 45 * 60);
  assert.equal(at('2026-12-31T22:00:00Z', data).tomorrow, true);
  delete data.tomorrowsTimes;
  assert.equal(at('2026-12-31T22:00:00Z', data), null);
  assert.equal(at('2027-01-01T08:00:00Z', data), null, 'stale data is never reused');
});

test('tomorrow countdown accounts for both British clock changes', () => {
  for (const [today, tomorrow, seconds] of [
    ['2026-10-24', '2026-10-25', 9 * 3600 + 45 * 60],
    ['2026-03-28', '2026-03-29', 7 * 3600 + 45 * 60],
  ]) {
    // 22:00 London on both dates; October is still BST, March is GMT.
    const now = `${today}T${today.includes('-10-') ? '21' : '22'}:00:00Z`;
    assert.equal(
      at(now, { todaysTimes: times(today), tomorrowsTimes: times(tomorrow) }).seconds,
      seconds,
    );
  }
});

test('invalid or missing records never generate a countdown', () => {
  assert.equal(at('invalid', {}), null);
  assert.equal(at('2026-10-15T12:00:00Z', {}), null);
  assert.equal(
    at('2026-10-15T12:00:00Z', { tomorrowsTimes: times('2026-10-16') }),
    null,
    'tomorrow alone does not establish the next congregation',
  );
  assert.equal(
    at('2026-10-15T12:00:00Z', {
      todaysTimes: times('2026-10-14'),
      tomorrowsTimes: times('2026-10-16'),
    }),
    null,
    'a stale today row does not skip straight to tomorrow',
  );
  assert.equal(
    at('2026-10-15T22:00:00Z', {
      todaysTimes: { d_date: '2026-10-15' },
      tomorrowsTimes: times('2026-10-16'),
    }),
    null,
    'an incomplete today row cannot establish that Isha passed',
  );
  assert.equal(
    at('2026-10-15T22:00:00Z', {
      todaysTimes: times('2026-10-15'),
      tomorrowsTimes: { ...times('2026-10-16'), jamaah_fajr: null },
    }),
    null,
    'a missing Fajr time does not skip to tomorrow’s Dhuhr',
  );
  assert.equal(
    at('2026-10-15T12:00:00Z', { todaysTimes: { d_date: '2026-10-15', jamaah_isha: '25:00' } }),
    null,
  );
  assert.deepEqual(countdownParts(-5), ['00', '00', '00']);
});
