import test from 'node:test';
import assert from 'node:assert/strict';
import { headerTickerItems } from '../src/lib/headerTicker.js';

test('banner uses published congregation times and custom announcements', () => {
  const items = headerTickerItems(
    { name: 'Asr', time: '17:15' },
    [{ prayer: '13:30' }, { prayer: '14:30' }],
    JSON.stringify([{ label: 'Notice', text: 'Class starts at 6pm' }]),
  );
  assert.match(items[0].text, /Asr.*5:15/);
  assert.match(items[1].text, /Jummah 1.*1:30.*Jummah 2.*2:30/);
  assert.deepEqual(items[2], { label: 'Notice', text: 'Class starts at 6pm' });
});

test('missing times and malformed optional content do not invent a congregation', () => {
  for (const saved of ['invalid', '{}', 'null', '[null, 1, {"text": ""}]']) {
    const items = headerTickerItems(null, [], saved);
    assert.equal(items.length, 1);
    assert.equal(items[0].label, 'Salah');
  }
});

test('old admin instructions are not displayed as announcements', () => {
  const items = headerTickerItems(
    null,
    [],
    JSON.stringify([
      { text: 'Live prayer information is shown automatically.' },
      { text: 'Friday khutbah and jama‘ah times are shown automatically.' },
      { text: '  Community update  ', label: 42 },
    ]),
  );
  assert.deepEqual(items.at(-1), { label: 'Update', text: 'Community update' });
  assert.equal(items.length, 2);
});
