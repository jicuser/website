export function financialHistory(records) {
  return records
    .map((record) => {
      const [day, month, year] = record.yearEndDate.split('/');
      const amount = (value) =>
        Math.round(
          Number(String(value).replace(/k$/i, '')) * (/k$/i.test(value) ? 1000 : 1) * 100,
        ) / 100;
      return {
        yearEndDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        totalGrossIncome: amount(record.totalGrossIncome),
        totalExpenditure: amount(record.totalExpenditure),
      };
    })
    .sort((a, b) => a.yearEndDate.localeCompare(b.yearEndDate));
}
export const financialMoney = (value) =>
  value.toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
export const financialDate = (value) =>
  new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/London',
  });
