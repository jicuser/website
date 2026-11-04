import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as state from '../src/lib/prayerDisplayState.js';
import * as view from '../src/lib/homePrayerView.js';
import * as sunrise from '../src/lib/sunriseStatus.js';
const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL('../src/components/home/HomePrayerCard.jsx', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;
const today = {
  d_date: '2026-11-03',
  fajr: '05:34',
  sunrise: '07:05',
  dhuhr: '11:56',
  asr: '14:44',
  maghrib: '16:37',
  isha: '18:24',
  jamaah_fajr: '06:15',
  jamaah_dhuhr: '13:00',
  jamaah_asr: '15:30',
  jamaah_maghrib: '16:37',
  jamaah_isha: '19:30',
};
function render(data = {}, clock = '2026-11-03T17:13:00Z', props = {}) {
  const mod = { exports: {} };
  const dependencies = {
    '@/lib/sunriseStatus': sunrise,
    './HomePrayerExtras': { __esModule: true, default: () => null },
    react: React,
    'lucide-react': require('lucide-react'),
    'react-router-dom': {
      Link: ({ to, children, ...props }) =>
        React.createElement('a', { ...props, href: to }, children),
    },
    '@/context/PrayerTimesContext': {
      usePublicPrayerTimes: () => ({
        todaysTimes: today,
        monthlyPrayerTimes: [],
        jummahTimes: [{ prayer: '12:35' }, { prayer: '13:30' }],
        ...data,
      }),
    },
    '@/hooks/useDisplayClock': { __esModule: true, default: () => new Date(clock) },
    '@/lib/timetable': { displayTime: (value) => value || '—' },
    '@/lib/prayerDisplayState': state,
    '@/lib/homePrayerView': view,
    '@/styles/jic-prayer-modern.css': {},
  };
  new Function('require', 'module', 'exports', compiled)(
    (name) => {
      assert.ok(name in dependencies, `Unresolved ${name}`);
      return dependencies[name];
    },
    mod,
    mod.exports,
  );
  return renderToStaticMarkup(React.createElement(mod.exports.default, props));
}
test('real component uses one semantic table, not five nested cards', () => {
  const html = render();
  assert.equal((html.match(/<table /g) || []).length, 1);
  assert.equal((html.match(/scope="row"/g) || []).length, 2);
  assert.doesNotMatch(html, /jic-prayer-browser-item/);
});
test('browser card keeps the current column distinct from the next event cell', () => {
  const html = render();
  assert.equal((html.match(/aria-current="time"/g) || []).length, 1);
  assert.equal((html.match(/data-current="true"/g) || []).length, 3);
  assert.match(html, /Currently .*Maghrib.* time/);
  assert.doesNotMatch(html, /is-next-jamaat/);
});
test('starts countdown includes both next beginning and congregation without repeated radio link', () => {
  const html = render();
  assert.match(html, /Begins in/);
  assert.match(html, /01:11:00/);
  assert.match(html, /Jamaat 19:30/);
  assert.doesNotMatch(html, /href="\/radio"/);
  assert.match(html, /href="\/prayer-times\/reminders"/);
});
test('after the start the same countdown changes to Jamaat', () => {
  const html = render({}, '2026-11-03T14:48:41Z');
  assert.match(html, /Jamaat in/);
  assert.match(html, /00:41:19/);
  assert.match(html, /Currently .*Asr.* time/);
});
test('native date picker replaces the overflowing month-long strip', () => {
  const html = render();
  assert.match(html, /type="date"/);
  assert.match(html, /aria-label="Previous day"/);
  assert.match(html, /aria-label="Next day"/);
  assert.doesNotMatch(html, /jic-prayer-day-strip/);
});
test('no published row displays no fabricated times or live clock', () => {
  const html = render({ todaysTimes: null, jummahTimes: [] });
  assert.match(html, /No published timetable for today/);
  assert.doesNotMatch(html, /<table |role="timer"/);
});
test('stale times and zero-length data do not create a current-prayer claim', () => {
  const html = render({ todaysTimes: { ...today, d_date: '2026-11-02' } });
  assert.doesNotMatch(html, /aria-current="time"|role="timer"/);
});
test('same-time Maghrib displays the Jamaat notice instead of a negative timer', () => {
  const html = render({}, '2026-11-03T16:37:00Z');
  assert.match(html, /Maghrib Jamaat time/);
  assert.doesNotMatch(html, /role="timer"/);
});
function renderedText(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

test('installed card separates current Isha from tomorrow Fajr without marking today’s Fajr next', () => {
  const html = render(
    { tomorrowsTimes: { ...today, d_date: '2026-11-04', fajr: '05:35' } },
    '2026-11-03T21:00:00Z',
    { compact: true },
  );
  const text = renderedText(html);
  assert.match(text, /Today’s Salah/);
  assert.match(text, /Currently Isha time/);
  assert.match(text, /Next up/);
  assert.match(text, /Fajr.*Tomorrow/);
  assert.match(text, /05:35/);
  assert.match(text, /05:34/);
  assert.match(text, /Starts in/);
  assert.equal((html.match(/data-current="true"/g) || []).length, 3);
  assert.doesNotMatch(html, /data-next="true"/);
});

test('installed card distinguishes the current prayer from its upcoming Jamaat', () => {
  const html = render({}, '2026-11-03T18:45:00Z', { compact: true });
  const text = renderedText(html);
  assert.match(text, /Currently Isha time/);
  assert.match(text, /Next up/);
  assert.match(text, /Isha Jamaat/);
  assert.match(text, /Jamaat in/);
  assert.equal((html.match(/aria-current="time"/g) || []).length, 1);
  assert.equal((html.match(/data-current="true"/g) || []).length, 3);
  const nextCells = [...html.matchAll(/<td\b[^>]*data-next="true"[^>]*>([\s\S]*?)<\/td>/g)];
  assert.equal(nextCells.length, 1);
  assert.match(renderedText(nextCells[0][1]), /19:30/);
  assert.match(render({}, '2026-11-03T16:37:00Z', { compact: true }), /Maghrib Jamaat time/);
});

test('installed card highlights only the next start cell while keeping the current prayer column', () => {
  const html = render({}, '2026-11-03T17:13:00Z', { compact: true });
  const text = renderedText(html);
  assert.match(text, /Currently Maghrib time/);
  assert.match(text, /Next up/);
  assert.match(text, /Isha/);
  assert.match(text, /Starts in/);
  assert.equal((html.match(/data-current="true"/g) || []).length, 3);
  const nextCells = [...html.matchAll(/<td\b[^>]*data-next="true"[^>]*>([\s\S]*?)<\/td>/g)];
  assert.equal(nextCells.length, 1);
  assert.match(renderedText(nextCells[0][1]), /18:24/);
});

for (const [clock, name, begins] of [
  ['2026-11-03T03:00:00Z', 'Fajr', '05:34'],
  ['2026-11-03T07:05:00Z', 'Dhuhr', '11:56'],
  ['2026-11-03T10:00:00Z', 'Dhuhr', '11:56'],
]) {
  test(`installed card has no current prayer claim at ${clock}`, () => {
    const html = render({}, clock, { compact: true });
    const text = renderedText(html);
    assert.match(text, /Next up/);
    assert.ok(text.includes(name));
    assert.ok(text.includes(begins));
    assert.doesNotMatch(text, /Currently .* time/);
    assert.doesNotMatch(html, /aria-current="time"|data-current="true"/);
    assert.equal((html.match(/data-next="true"/g) || []).length, 1);
  });
}

test('installed card with missing publication has no live prayer claim or timetable', () => {
  const html = render({ todaysTimes: null, jummahTimes: [] }, undefined, { compact: true });
  assert.doesNotMatch(renderedText(html), /Currently .* time/);
  assert.doesNotMatch(html, /<table |role="timer"|data-current="true"|data-next="true"/);
});

test('Friday second Jamaat does not mark the first session’s timetable cell next', () => {
  const html = render({ todaysTimes: { ...today, d_date: '2026-11-06' } }, '2026-11-06T12:50:00Z', {
    compact: true,
  });
  const text = renderedText(html);
  assert.match(text, /Next up/);
  assert.match(text, /Jummah 2 Jamaat/);
  assert.match(text, /13:30/);
  assert.match(text, /12:35/);
  assert.doesNotMatch(html, /data-next="true"/);
  assert.doesNotMatch(html, /data-wash="next"|, next up/);
});

test('installed card labels the sunrise buffer and clears the prohibition when it passes', () => {
  const active = renderedText(render({}, '2026-11-03T07:05:00Z', { compact: true }));
  assert.match(active, /Prohibited time · Shuroq/);
  assert.doesNotMatch(active, /Currently Fajr time/);
  const passed = renderedText(render({}, '2026-11-03T07:25:00Z', { compact: true }));
  assert.match(passed, /Shuroq period passed/);
  assert.doesNotMatch(passed, /Prohibited time/);
  assert.match(
    renderedText(render({}, '2026-11-03T12:00:00Z', { compact: true })),
    /Currently Dhuhr time/,
  );
});

for (const [clock, time] of [
  ['2026-11-03T17:13:00Z', '18:24'],
  ['2026-11-03T18:45:00Z', '19:30'],
]) {
  test(`browser card matches next highlighting to the correct start or Jamaat at ${clock}`, () => {
    const html = render({}, clock);
    const cells = [...html.matchAll(/<td\b[^>]*data-next="true"[^>]*>([\s\S]*?)<\/td>/g)];
    assert.equal(cells.length, 1);
    assert.ok(renderedText(cells[0][1]).includes(time));
    assert.equal((html.match(/aria-current="time"/g) || []).length, 1);
    assert.match(html, /data-next-prayer="true"/);
  });
}
test('browser card does not highlight today’s Fajr for tomorrow’s next event', () => {
  const html = render(
    { tomorrowsTimes: { ...today, d_date: '2026-11-04', fajr: '05:35' } },
    '2026-11-03T21:00:00Z',
  );
  assert.match(renderedText(html), /Currently Isha time/);
  assert.doesNotMatch(html, /data-next="true"|data-upcoming="true"/);
  assert.match(renderedText(html), /Next prayer · Tomorrow/);
  assert.doesNotMatch(html, /data-wash="next"/);
});
test('browser card shares active and passed Shuroq wording with the installed app', () => {
  assert.match(renderedText(render({}, '2026-11-03T07:10:00Z')), /Prohibited time · Shuroq/);
  assert.match(renderedText(render({}, '2026-11-03T07:25:00Z')), /Shuroq period passed/);
});
