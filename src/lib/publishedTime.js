/** Accept only clock values, not missing-value markers or prose. */
export function hasPublishedTime(value) {
  if (typeof value !== 'string') return false;
  const clock = value.trim();
  return /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(clock) ||
    /^(?:0?[1-9]|1[0-2]):[0-5]\d\s*(?:am|pm)$/i.test(clock);
}
