import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { toDateTimeLocal } from '../src/lib/dateTime.js';

test('admin time fields preserve instants in UK winter and summer and across the clock change', () => {
  const moduleUrl = new URL('../src/lib/dateTime.js', import.meta.url).href;
  const samples = [
    ['2026-01-12T14:30:00.000Z', '2026-01-12T14:30'],
    ['2026-09-12T14:30:00.000Z', '2026-09-12T15:30'],
    ['2026-03-29T00:30:00.000Z', '2026-03-29T00:30'],
    ['2026-03-29T01:30:00.000Z', '2026-03-29T02:30'],
  ];
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { toDateTimeLocal } from ${JSON.stringify(moduleUrl)};
       const samples = ${JSON.stringify(samples)};
       process.stdout.write(JSON.stringify(samples.map(([instant]) => {
         const field = toDateTimeLocal(instant);
         return [field, new Date(field).toISOString()];
       })));`,
    ],
    { env: { ...process.env, TZ: 'Europe/London' }, encoding: 'utf8' },
  );
  assert.deepEqual(
    JSON.parse(output),
    samples.map(([instant, field]) => [field, instant]),
  );
});

test('an unset or invalid optional time stays empty', () => {
  for (const value of [null, '', 'invalid']) assert.equal(toDateTimeLocal(value), '');
});

test('editing other livestream fields preserves the later repeated autumn hour', () => {
  const moduleUrl = new URL('../src/lib/dateTime.js', import.meta.url).href;
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { fromDateTimeLocal, toDateTimeLocal } from ${JSON.stringify(moduleUrl)};
       const instant = '2026-10-25T01:30:20.000Z';
       const field = toDateTimeLocal(instant);
       process.stdout.write(JSON.stringify([
         field, fromDateTimeLocal(field, instant),
         fromDateTimeLocal('2026-10-25T02:30', instant), fromDateTimeLocal('', instant)
       ]));`,
    ],
    { env: { ...process.env, TZ: 'Europe/London' }, encoding: 'utf8' },
  );
  assert.deepEqual(JSON.parse(output), [
    '2026-10-25T01:30',
    '2026-10-25T01:30:20.000Z',
    '2026-10-25T02:30:00.000Z',
    null,
  ]);
});
