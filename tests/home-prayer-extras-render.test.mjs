import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as sunrise from '../src/lib/sunriseStatus.js';
import * as view from '../src/lib/homePrayerView.js';
import * as timetable from '../src/lib/timetable.js';
import * as prayerState from '../src/lib/prayerDisplayState.js';

const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL('../src/components/home/HomePrayerExtras.jsx', import.meta.url),
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
function render(clock, date = '2026-11-04', time = '07:09', detail, props = {}) {
  const mod = { exports: {} };
  const deps = {
    react: React,
    'lucide-react': require('lucide-react'),
    '@/lib/sunriseStatus': sunrise,
    '@/lib/homePrayerView': view,
    '@/lib/timetable': timetable,
    '@/lib/prayerDisplayState': prayerState,
    '@/features/prayer-details/usePublishedPrayerDetails': {
      usePublishedPrayerDetails: () => ({
        rows: new Map(detail ? [[date, detail]] : []),
        status: props.detailStatus || 'ready',
      }),
    },
  };
  new Function('require', 'module', 'exports', compiled)(
    (name) => {
      assert.ok(name in deps, `Unresolved ${name}`);
      return deps[name];
    },
    mod,
    mod.exports,
  );
  return renderToStaticMarkup(
    React.createElement(mod.exports.default, {
      compact: true,
      date,
      sunrise: time,
      now: new Date(clock),
      ...props,
    }),
  );
}

test('sunrise tile describes the prohibition, preserves the published time and labels the estimate', () => {
  const html = render('2026-11-04T07:15:00Z');
  assert.match(html, /Prohibited time/);
  assert.match(html, /Shuruq/);
  assert.match(html, /07:09/);
  assert.match(html, /until ≈ 07:29/);
  assert.match(html, /Ishraq ≈/);
  assert.match(html, /sunrise \+ 20 min/);
  assert.match(html, /Not published/);
});
test('passed sunrise clears the prohibition and only marks Ishraq at its approximate start', () => {
  const start = render('2026-11-04T07:29:00Z');
  assert.doesNotMatch(start, /Passed|Upcoming/);
  assert.match(start, /aria-current="time"/);
  assert.doesNotMatch(start, /Prohibited time|Shuruq|until ≈/);
  assert.doesNotMatch(render('2026-11-04T07:31:00Z'), /aria-current="time"/);
});
test('browsing another date or missing sunrise never shows a live sunrise status', () => {
  assert.doesNotMatch(
    render('2026-11-04T07:15:00Z', '2026-11-05'),
    /Prohibited time|Upcoming|Passed|aria-current/,
  );
  assert.doesNotMatch(
    render('2026-11-04T07:15:00Z', undefined, null),
    /Prohibited time|Upcoming|Passed|07:29/,
  );
});

test('Zawal highlights its published start minute and clears in the afternoon', () => {
  const detail = { zawwal_start: '11:46' };
  const at = (clock) => render(`2026-11-04T${clock}Z`, undefined, undefined, detail);
  assert.doesNotMatch(at('11:45:59'), /aria-current/);
  assert.match(at('11:46:00'), /class="jic-card-zawal" aria-current="time"/);
  assert.match(at('11:46:59'), /class="jic-card-zawal" aria-current="time"/);
  assert.doesNotMatch(at('11:47:00'), /aria-current/);
  assert.doesNotMatch(at('13:47:00'), /aria-current/);
});

test('Zawal uses a published end when present and never highlights another timetable day', () => {
  const detail = { zawwal_start: '11:46', zawwal_end: '11:56' };
  const at = (clock, date) => render(`2026-11-04T${clock}Z`, date, undefined, detail);
  assert.match(at('11:55:59'), /class="jic-card-zawal" aria-current="time"/);
  assert.doesNotMatch(at('11:56:00'), /aria-current/);
  assert.doesNotMatch(at('11:46:00', '2026-11-05'), /aria-current/);
  assert.doesNotMatch(
    render('2026-11-04T11:46:00Z', undefined, undefined, { zawwal_start: 'Not published' }),
    /aria-current/,
  );
});

test('extra times include a published sunset without substituting an inferred value', () => {
  const withSunset = render('2026-11-04T16:49:00Z', undefined, undefined, { sunset: '16:31' });
  assert.match(withSunset, /data-has-sunset="true"/);
  assert.match(withSunset, /Sunset/);
  assert.match(withSunset, /16:31/);
  const missing = render('2026-11-04T16:49:00Z');
  assert.match(missing, /jic-card-sunset[\s\S]*aria-label="Not published">—/);
  assert.doesNotMatch(missing, /data-has-sunset|16:31/);
});

test('the four sun times stay in daily order with one shared estimate note', () => {
  const html = render('2026-11-04T16:49:00Z', undefined, undefined, {
    sunset: '16:31', zawwal_start: '11:46', zawwal_end: '11:56',
  });
  const labels = [...html.matchAll(/<dt>(.*?)<\/dt>/g)].map((match) =>
    match[1].replace(/<svg[\s\S]*?<\/svg>/g, '').trim(),
  );
  assert.deepEqual(labels, ['Sunrise', 'Ishraq ≈', 'Zawal', 'Sunset']);
  assert.match(html, /11:46\s*–\s*11:56/);
  assert.equal((html.match(/sunrise \+ 20 min/g) || []).length, 1);
});

test('loading or failed sunset data is distinguished from an unpublished time', () => {
  for (const [detailStatus, label] of [['loading', 'Loading…'], ['error', 'Unavailable']]) {
    const html = render('2026-11-04T16:49:00Z', undefined, undefined, undefined, { detailStatus });
    const sunset = html.slice(html.indexOf('class="jic-card-sunset"'), html.indexOf('</dl>'));
    assert.ok(sunset.includes(label));
    assert.doesNotMatch(sunset, /Not published|16:31/);
  }
});

test('the Salah workspace can disclose the original published timetable source', () => {
  const detail = { source: 'JIC printed November timetable' };
  const html = render('2026-11-04T16:49:00Z', undefined, undefined, detail, { showSource: true });
  assert.match(html, /<summary>Timetable source<\/summary>/);
  assert.match(html, /JIC printed November timetable/);
  assert.doesNotMatch(
    render('2026-11-04T16:49:00Z', undefined, undefined, detail),
    /Timetable source/,
  );
});
