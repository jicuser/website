import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import * as timetable from '../../src/lib/timetable.js';
const source = readFileSync(
  new URL('../../src/components/PrayerClock.jsx', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
  },
}).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  (name) => (name === 'react' ? React : name === '@/lib/timetable' ? timetable : {}),
  mod,
  mod.exports,
);
export const PrayerClock = mod.exports;
