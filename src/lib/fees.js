export function poundsToMinor(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(text))
    throw new Error('Enter an amount in pounds with up to two decimal places.');
  const [pounds, pence = ''] = text.split('.');
  const minor = Number(pounds) * 100 + Number(pence.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor < 1 || minor > 100000000)
    throw new Error('Enter an amount between £0.01 and £1,000,000.');
  return minor;
}

export function feeAmount(minor, currency = 'GBP') {
  try {
    const formatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency });
    return formatter.format(
      Number(minor || 0) / 10 ** formatter.resolvedOptions().maximumFractionDigits,
    );
  } catch {
    return `${Number(minor || 0)} minor units (${currency})`;
  }
}

export async function feeWrite(query) {
  const result = await query;
  if (result.error) {
    const failure = new Error(result.error.message || 'The payment record could not be confirmed.');
    failure.status = result.status;
    throw failure;
  }
  return result.data;
}

export function uncertainFeeWrite(error) {
  return !error?.status || error.status >= 500 || error.status === 408;
}
