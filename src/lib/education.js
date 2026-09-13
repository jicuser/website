export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
export const AUDIENCES = ['adult', 'all', 'youth', 'madrassah'];
const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function validSessions(sessions) {
  return (
    sessions === undefined ||
    (Array.isArray(sessions) &&
      sessions.length <= 21 &&
      sessions.every(
        (s) =>
          Number.isInteger(s.day) &&
          s.day >= 1 &&
          s.day <= 7 &&
          ((typeof s.time === 'string' && clock.test(s.time) && !s.after) ||
            (['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(s.after) && !s.time)) &&
          (!s.end || (clock.test(s.end) && s.time && s.end > s.time)) &&
          (!s.title || (typeof s.title === 'string' && s.title.length <= 120)),
      ))
  );
}
export function isAdultProgramme(poster) {
  return (
    poster.kind !== 'announcement' &&
    poster.groups?.includes('education') &&
    ['adult', 'all'].includes(poster.audience)
  );
}
export function weeklySessions(posters) {
  return posters
    .filter(isAdultProgramme)
    .flatMap((poster) =>
      (poster.sessions || []).map((session) => ({
        ...session,
        id: poster.id,
        programme: poster.title,
        image: poster.image,
        to: poster.to,
      })),
    )
    .sort((a, b) => a.day - b.day || (a.time || '99').localeCompare(b.time || '99'));
}
