import { londonDay, londonWallInstant } from './prayerDisplayState.js';

// Matches the existing, visibly approximate sunrise + 20 minute Ishraq marker.
export const ISHRAQ_BUFFER_MINUTES = 20;

export function sunriseStatus(date, sunrise, now = new Date()) {
  const today = londonDay(now);
  const sunriseAt = londonWallInstant(date, sunrise);
  if (!today || sunriseAt === null) {
    return { phase: 'unavailable', sunriseAt: null, ishraqAt: null, startingIshraq: false };
  }
  const ishraqAt = sunriseAt + ISHRAQ_BUFFER_MINUTES * 60000;
  if (date !== today) return { phase: 'timetable', sunriseAt, ishraqAt, startingIshraq: false };
  const instant = now.getTime();
  let phase = 'upcoming';
  if (instant >= ishraqAt) phase = 'passed';
  else if (instant >= sunriseAt) phase = 'active';
  return {
    phase,
    sunriseAt,
    ishraqAt,
    startingIshraq: phase === 'passed' && instant < ishraqAt + 60000,
  };
}
