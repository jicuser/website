import * as timetable from '../src/lib/timetable.js';
import { PrayerClock } from './helpers/prayerClock.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import * as router from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import * as state from '../src/lib/prayerDisplayState.js';
import * as view from '../src/lib/homePrayerView.js';
import * as sunrise from '../src/lib/sunriseStatus.js';
import * as workspace from '../src/lib/salahWorkspace.js';
import * as jummah from '../src/lib/jummahSchedule.js';

const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL('../src/components/sections/prayer-times/SalahDailyCard.jsx', import.meta.url),
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
const day = {
  d_date: '2026-11-04',
  fajr: '05:35',
  sunrise: '07:09',
  dhuhr: '11:56',
  asr: '14:43',
  maghrib: '16:35',
  isha: '18:22',
  jamaah_fajr: '06:15',
  jamaah_dhuhr: '13:00',
  jamaah_asr: '15:30',
  jamaah_maghrib: '16:35',
  jamaah_isha: '19:30',
};
function render(clock, props = {}) {
  const mod = { exports: {} };
  const dependencies = {
    '@/lib/timetable': timetable,
    '@/components/PrayerClock': PrayerClock,
    react: React,
    'react-router-dom': router,
    'lucide-react': require('lucide-react'),
    '@/components/home/HomePrayerExtras': () =>
      React.createElement('dl', { 'aria-label': 'Additional times' }),
    '@/lib/homePrayerView': view,
    '@/lib/prayerDisplayState': state,
    '@/lib/sunriseStatus': sunrise,
    '@/lib/salahWorkspace': workspace,
    '@/lib/jummahSchedule': jummah,
  };
  new Function('require', 'module', 'exports', compiled)(
    (name) => {
      assert.ok(name in dependencies, `Unresolved ${name}`);
      return dependencies[name];
    },
    mod,
    mod.exports,
  );
  return renderToStaticMarkup(
    React.createElement(
      router.StaticRouter,
      { location: '/prayer-times' },
      React.createElement(mod.exports.default, {
        row: day,
        date: day.d_date,
        now: new Date(clock),
        ...props,
      }),
    ),
  );
}

test('current and next prayers stay distinct and only the exact upcoming event cell is marked', () => {
  const html = render('2026-11-04T16:49:00Z');
  assert.match(html, /Currently Maghrib time/);
  assert.match(html, /01:33:00/);
  assert.equal((html.match(/data-current="true"/g) || []).length, 1);
  assert.equal((html.match(/data-upcoming="true"/g) || []).length, 1);
  const next = [...html.matchAll(/<td[^>]*data-next-event="true"[^>]*>([\s\S]*?)<\/td>/g)];
  assert.equal(next.length, 1);
  assert.match(next[0][1], /6:22/);
});

test('a second Friday congregation never marks the first displayed congregation cell as next', () => {
  const row = { ...day, d_date: '2026-11-06', jummah_1_start: '12:20', jummah_1_jamah: '12:35' };
  const html = render('2026-11-06T13:05:00Z', {
    row,
    date: row.d_date,
    jummahTimes: [{ prayer: '12:35' }, { prayer: '13:30' }],
  });
  assert.match(html, /Jummah 2 Jamaat/);
  assert.match(html, /00:25:00/);
  assert.match(html, /12:35/);
  assert.match(html, /First Jummah khutbah[\s\S]*?12:20[\s\S]*?PM/);
  assert.match(html, /href="\/contact"/);
  assert.doesNotMatch(html, /data-next-event="true"/);
});

test('browsing another day never makes a live current or upcoming prayer claim', () => {
  const row = { ...day, d_date: '2026-11-05' };
  const html = render('2026-11-04T16:49:00Z', { row, date: row.d_date, summary: false });
  assert.match(html, /6:22/);
  assert.doesNotMatch(
    html,
    /data-current="true"|data-upcoming="true"|data-next-event="true"|role="timer"/,
  );
});

test('missing publication shows an explicit empty state without a table or live countdown', () => {
  const html = render('2026-11-04T16:49:00Z', { row: null });
  assert.match(html, /No published timetable/);
  assert.doesNotMatch(html, /<table|role="timer"/);
});
