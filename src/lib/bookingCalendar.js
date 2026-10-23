export const CALENDAR_COLOURS = {
  available: '#21835b',
  pending: '#b77900',
  booked: '#c43b48',
  closed: '#68758a',
  unknown: '#68758a',
};
export const HALL_STATUSES = [
  ['available', 'Available'],
  ['pending', 'Provisional'],
  ['booked', 'Booked'],
  ['closed', 'Closed'],
];
export const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function monthDays(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const cells = Array.from({ length: (first.getDay() + 6) % 7 }, () => null);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= count; day++)
    cells.push(new Date(month.getFullYear(), month.getMonth(), day, 12));
  while (cells.length % 7) cells.push(null);
  return cells;
}
export const fullDate = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
export function seasonDays(season) {
  if (!season?.start_date) return [];
  return Array.from(
    { length: Math.min(30, Math.max(0, Number(season.day_count) || 0)) },
    (_, index) => {
      const date = new Date(`${season.start_date}T12:00:00`);
      date.setDate(date.getDate() + index);
      return { number: index + 1, date: dateKey(date) };
    },
  );
}
