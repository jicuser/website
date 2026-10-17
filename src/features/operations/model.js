export const BANK_DETAILS = {
  bank: 'Metro Bank',
  accountName: 'Jamatia Islamic Centre',
  sortCode: '23-05-80',
  accountNumber: '57434236',
};
export const CAMPAIGN_CATEGORIES = [
  ['community', 'Community'],
  ['ramadan', 'Ramadan'],
  ['education', 'Learning'],
  ['masjid', 'Our masjid'],
];
export const CAMPAIGN_PURPOSE =
  'Donations support JIC’s general charitable work. Targets are fundraising goals. Donations stay with JIC if a target is exceeded or not reached.';
export const money = (pence = 0) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
    Number(pence) / 100,
  );
export function toPence(value) {
  const text = String(value).trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text))
    throw new Error('Enter an amount in pounds with up to two decimal places.');
  const [whole, fraction = ''] = text.split('.');
  const pence = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(pence) || pence < 1 || pence > 100000000)
    throw new Error('Enter an amount between £0.01 and £1,000,000.');
  return pence;
}
export const paidFor = (payments, id) =>
  payments.filter((p) => p.invoice_id === id).reduce((sum, p) => sum + p.amount_pence, 0);
export function financeSummary(invoices, payments, today) {
  const issued = invoices.filter((i) => i.status === 'issued');
  return {
    outstanding: issued.reduce(
      (sum, i) => sum + Math.max(0, i.total_pence - paidFor(payments, i.id)),
      0,
    ),
    overdue: issued
      .filter((i) => i.due_date < today)
      .reduce((sum, i) => sum + Math.max(0, i.total_pence - paidFor(payments, i.id)), 0),
    received: payments.filter((p) => p.invoice_id).reduce((sum, p) => sum + p.amount_pence, 0),
    donations: payments.filter((p) => p.campaign_id).reduce((sum, p) => sum + p.amount_pence, 0),
  };
}
export function paymentMonths(payments, today) {
  const end = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date(end);
    date.setUTCMonth(end.getUTCMonth() - 5 + i);
    const key = date.toISOString().slice(0, 7);
    return {
      key,
      label: date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      total: payments
        .filter((p) => p.happened_on.startsWith(key))
        .reduce((sum, p) => sum + p.amount_pence, 0),
    };
  });
}
