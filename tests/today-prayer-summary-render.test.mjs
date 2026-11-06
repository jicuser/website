import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as next from '../src/lib/nextCongregation.js';
import { PrayerClock } from './helpers/prayerClock.mjs';
import { JummahJamaat } from './helpers/jummahJamaat.mjs';
const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(
  readFileSync(new URL('../src/components/home/TodayPrayerSummary.jsx', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  },
).outputText;
const row = {
  d_date: '2026-11-06',
  fajr: '05:39',
  jamaah_fajr: '06:30',
  dhuhr: '11:56',
  jamaah_dhuhr: '13:00',
  asr: '14:39',
  jamaah_asr: '15:15',
  maghrib: '16:32',
  jamaah_maghrib: '16:32',
  isha: '18:19',
  jamaah_isha: '19:30',
};
function render(overrides = {}) {
  const mod = { exports: {} };
  const dependencies = {
    react: React,
    'lucide-react': require('lucide-react'),
    'react-router-dom': {
      Link: ({ to, children, ...props }) =>
        React.createElement('a', { ...props, href: to }, children),
    },
    '@/lib/nextCongregation': next,
    '@/components/PrayerClock': PrayerClock,
    '@/components/JummahJamaat': JummahJamaat,
    '@/context/PrayerTimesContext': {
      usePublicPrayerTimes: () => ({
        todaysTimes: row,
        jummahTimes: [{ prayer: '12:35' }, { prayer: '13:30' }],
        currentDate: new Date('2026-11-06T12:50:00Z'),
        ...overrides,
      }),
    },
  };
  new Function('require', 'module', 'exports', compiled)(
    (name) => {
      assert.ok(name in dependencies, `Unresolved ${name}`);
      return dependencies[name];
    },
    mod,
    mod.exports,
  );
  return renderToStaticMarkup(React.createElement(mod.exports.default));
}
const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
test('Friday dock exposes both labelled sessions at Dhuhr with a working Jummah link', () => {
  const html = render();
  assert.match(text(html), /Jummah Jamaat 1st 12:35 PM 2nd 1:30 PM/);
  assert.match(text(html), /11:56 AM/);
  assert.doesNotMatch(text(html), /1:00 PM/);
  assert.match(html, /href="\/prayer-times\/jummah"/);
  assert.match(html, /data-upcoming="true"><small class="jic-jummah-ordinal">2nd/);
  assert.equal((html.match(/<table /g) || []).length, 1);
  assert.doesNotMatch(html, /<a[^>]*>[^]*?<a[^>]*>[^]*?<\/a>[^]*?<\/a>/);
});
test('edited published sessions replace both displayed times without hardcoded values', () => {
  const html = render({ jummahTimes: [{ prayer: '12:45' }, { prayer: '14:00' }] });
  assert.match(text(html), /1st 12:45 PM 2nd 2:00 PM/);
  assert.doesNotMatch(text(html), /12:35|1:30/);
});
test('a missing first session does not rename the second or fall back to Dhuhr Jamaat', () => {
  const html = render({ jummahTimes: [{ number: 2, prayer: '13:30' }] });
  assert.match(text(html), /1st — 2nd 1:30 PM/);
  assert.match(html, /1st not published/);
  assert.doesNotMatch(text(html), /1:00 PM/);
});
test('ordinary weekdays retain Dhuhr Jamaat and no Friday placeholder', () => {
  const html = render({
    currentDate: new Date('2026-11-07T10:00:00Z'),
    todaysTimes: { ...row, d_date: '2026-11-07' },
  });
  assert.match(text(html), /1:00 PM/);
  assert.doesNotMatch(html, /jic-jummah-jamaat/);
});
test('no publication displays an explicit empty state instead of a table', () => {
  const html = render({ todaysTimes: null });
  assert.match(text(html), /Today’s timetable is unavailable/);
  assert.doesNotMatch(html, /<table/);
});
