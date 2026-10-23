export const RAMADAN_KINDS = { iftar: 'Sponsor an Iftar', daily: 'Daily Giving' };
export const RAMADAN_COLOURS = { available: '#68758a', pending: '#b77900', confirmed: '#21835b' };
export function ramadanDay(data, kind, date) {
  const row = data?.days?.find((row) => row.kind === kind && row.day_date === date);
  return {
    ...row,
    status:
      Number(row?.confirmed) > 0 ? 'confirmed' : Number(row?.pending) > 0 ? 'pending' : 'available',
  };
}
export const ramadanStatus = (kind, status) =>
  status === 'confirmed'
    ? kind === 'iftar'
      ? 'Sponsored'
      : 'Supported'
    : status === 'pending'
      ? 'Requested'
      : 'Available';
