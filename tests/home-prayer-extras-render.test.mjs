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
function render(clock, date = '2026-11-04', time = '07:09') {
  const mod = { exports: {} };
  const deps = {
    react: React,
    'lucide-react': require('lucide-react'),
    '@/lib/sunriseStatus': sunrise,
    '@/lib/homePrayerView': view,
    '@/lib/timetable': timetable,
    '@/features/prayer-details/usePublishedPrayerDetails': {
      usePublishedPrayerDetails: () => ({ rows: new Map(), status: 'ready' }),
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
    }),
  );
}

test('sunrise tile describes the prohibition, preserves the published time and labels the estimate', () => {
  const html = render('2026-11-04T07:15:00Z');
  assert.match(html, /Prohibited time/);
  assert.match(html, /Shuroq time/);
  assert.match(html, /07:09/);
  assert.match(html, /Until ≈ 07:29/);
  assert.match(html, /Ishraq starts ≈/);
  assert.match(html, /Sunrise \+ 20 min/);
  assert.match(html, /Not published/);
});
test('passed sunrise clears the prohibition and only marks Ishraq at its approximate start', () => {
  const start = render('2026-11-04T07:29:00Z');
  assert.match(start, /Passed/);
  assert.match(start, /aria-current="time"/);
  assert.doesNotMatch(start, /Prohibited time|Shuroq time|Until ≈/);
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
