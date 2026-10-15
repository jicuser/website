export const REMINDER_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const DEFAULT_SALAH_REMINDERS = {
  start: false,
  jamaah: true,
  startMinutes: 10,
  jamaahMinutes: 10,
  prayers: REMINDER_PRAYERS,
};
export function reminderProblem(value) {
  if (
    !value ||
    typeof value.start !== 'boolean' ||
    typeof value.jamaah !== 'boolean' ||
    (!value.start && !value.jamaah)
  )
    return 'Choose start-time reminders, Jama’ah reminders, or both.';
  if (
    ![value.startMinutes, value.jamaahMinutes].every(
      (number) => Number.isInteger(number) && number >= 0 && number <= 60,
    )
  )
    return 'Choose a whole number of minutes from 0 to 60.';
  if (
    !Array.isArray(value.prayers) ||
    !value.prayers.length ||
    value.prayers.length > 5 ||
    new Set(value.prayers).size !== value.prayers.length ||
    value.prayers.some((prayer) => !REMINDER_PRAYERS.includes(prayer))
  )
    return 'Choose at least one of the five daily prayers.';
  return '';
}
export function cleanReminderSettings(value) {
  if (reminderProblem(value)) throw new Error(reminderProblem(value));
  return {
    start: value.start,
    jamaah: value.jamaah,
    startMinutes: value.startMinutes,
    jamaahMinutes: value.jamaahMinutes,
    prayers: [...value.prayers],
  };
}
