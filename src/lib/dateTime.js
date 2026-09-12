// datetime-local fields use the browser's wall clock, not UTC. Keep the offset
// conversion at the database boundary so editing a title does not move its time.
export function toDateTimeLocal(value = new Date()) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocal(value, previousValue = null) {
  if (!value) return null;
  // Preserve an unchanged instant, including the repeated hour when clocks go back.
  if (previousValue && toDateTimeLocal(previousValue) === value) return previousValue;
  return new Date(value).toISOString();
}
