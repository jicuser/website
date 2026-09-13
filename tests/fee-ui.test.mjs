import test from 'node:test';
import assert from 'node:assert/strict';
import { feeAmount, feeWrite, poundsToMinor, uncertainFeeWrite } from '../src/lib/fees.js';

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

test('fee retries distinguish an unconfirmed network/server result from a rejected request', async () => {
  for (const status of [0, 400, 403, 408, 503]) {
    await assert.rejects(
      feeWrite(Promise.resolve({ status, error: { message: 'Rejected or unconfirmed' } })),
      (error) => {
        assert.equal(uncertainFeeWrite(error), status === 0 || status === 408 || status >= 500);
        return true;
      },
    );
  }
  assert.equal(await feeWrite(Promise.resolve({ status: 200, data: 'receipt-id' })), 'receipt-id');
});
