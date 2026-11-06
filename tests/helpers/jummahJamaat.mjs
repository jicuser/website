import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import * as timetable from '../../src/lib/timetable.js';
import { PrayerClock } from './prayerClock.mjs';
const compiled = ts.transpileModule(
  readFileSync(new URL('../../src/components/JummahJamaat.jsx', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  },
).outputText;
const mod = { exports: {} };
const dependencies = {
  react: React,
  'react-router-dom': {
    Link: ({ to, children, ...props }) =>
      React.createElement('a', { ...props, href: to }, children),
  },
  '@/components/PrayerClock': PrayerClock,
  '@/lib/timetable': timetable,
  '@/styles/jummah-jamaat.css': {},
};
new Function('require', 'module', 'exports', compiled)(
  (name) => {
    if (!(name in dependencies)) throw new Error(`Unresolved ${name}`);
    return dependencies[name];
  },
  mod,
  mod.exports,
);
export const JummahJamaat = mod.exports;
