import test from 'node:test';
import assert from 'node:assert/strict';
import { feeAmount, poundsToMinor } from '../src/lib/fees.js';

test('payment entry converts decimal pounds exactly to integer pence', () => {
  assert.equal(poundsToMinor('12.05'), 1205);
  assert.equal(poundsToMinor('0.01'), 1);
  assert.equal(poundsToMinor('12.5'), 1250);
  assert.equal(poundsToMinor('1000000'), 100000000);
  for (const value of ['0', '-1', '1.001', '1e3', '1,000', 'NaN', '1000000.01', '', '=1+2'])
    assert.throws(() => poundsToMinor(value));
});

test('readable balances respect currency minor units', () => {
  assert.equal(feeAmount(1205, 'GBP'), '£12.05');
  assert.equal(feeAmount(1205, 'JPY'), 'JP¥1,205');
});
