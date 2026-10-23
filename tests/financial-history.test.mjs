import test from 'node:test';
import assert from 'node:assert/strict';
import { financialHistory, financialDate, financialMoney } from '../src/lib/financialHistory.js';
import { FINANCIAL_RECORDS } from '../src/content/data/financials.js';

test('financial dates retain the published UK accounting day across daylight saving', () => {
  const rows = financialHistory([
    { yearEndDate: '31/03/2023', totalGrossIncome: '1k', totalExpenditure: '0.5k' },
  ]);
  assert.equal(rows[0].yearEndDate, '2023-03-31');
  assert.equal(financialDate(rows[0].yearEndDate), '31 Mar 2023');
});
test('the compact chart preserves all published figures and surplus or deficit', () => {
  const rows = financialHistory(FINANCIAL_RECORDS);
  assert.equal(rows.length, 5);
  assert.equal(rows[0].totalGrossIncome - rows[0].totalExpenditure, -21230);
  assert.deepEqual(rows.at(-1), {
    yearEndDate: '2024-03-31',
    totalGrossIncome: 545030,
    totalExpenditure: 241520,
  });
  assert.equal(financialMoney(303510), '£303,510');
  assert.equal(financialMoney(-21230), '-£21,230');
});
