import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const result = await build({
  entryPoints: [new URL('../../src/features/displays/PrayerWidget.jsx', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  alias: { '@': new URL('../../src', import.meta.url).pathname },
  write: false,
});
const context = { module: { exports: {} }, require: createRequire(import.meta.url) };
runInNewContext(result.outputFiles[0].text, context);
const PrayerWidget = context.module.exports.default;

export const prayerFixture = {
  todaysTimes: {
    fajr: '06:14', jamaah_fajr: '06:45', sunrise: '07:31',
    dhuhr: '12:59', jamaah_dhuhr: '13:45', asr: '16:22', jamaah_asr: '17:15',
    maghrib: '18:18', jamaah_maghrib: '18:18', isha: '19:29', jamaah_isha: '20:15',
  },
  tomorrowsTimes: { fajr: '06:16', sunrise: '07:33', dhuhr: '12:58', asr: '16:20', maghrib: '18:16', isha: '19:27' },
  jummahTimes: [{ name: 'First Jummah', prayer: '13:30' }, { name: 'Second Jummah', prayer: '14:30' }],
};

export function prayerMarkup(layout, overrides = {}) {
  return renderToStaticMarkup(React.createElement(PrayerWidget, {
    kind: 'times', layout, prayers: prayerFixture,
    now: new Date('2026-10-14T15:10:00Z'), ...overrides,
  }));
}
