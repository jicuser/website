/** Canonical storage stays HH:mm; entry accepts explicit AM/PM or 24-hour times. */
export function normalizeClock(value) {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::00)?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  if (hour > 23 || Number(match[2]) > 59 || (match[3] && (hour < 1 || hour > 12))) return null;
  if (match[3]) hour = (hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}

export function clockInputParts(value, fallbackPeriod = 'AM') {
  const normalized = normalizeClock(value);
  if (normalized) {
    const hour = Number(normalized.slice(0, 2));
    return { clock: `${hour % 12 || 12}:${normalized.slice(3)}`, period: hour >= 12 ? 'PM' : 'AM' };
  }
  const match = String(value || '').match(/^(.*?)\s+(AM|PM)$/i);
  return {
    clock: match ? match[1] : String(value || ''),
    period: match?.[2].toUpperCase() || fallbackPeriod,
  };
}

/** Incomplete input is retained so validation can stop a save, rather than silently clearing it. */
export function clockInputValue(clock, period) {
  if (!clock.trim()) return '';
  const entered = `${clock.trim()} ${period}`;
  return normalizeClock(entered) || entered;
}
