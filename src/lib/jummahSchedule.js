const fields = ['jummah_1_start', 'jummah_1_jamah', 'jummah_2_begins', 'jummah_2_jamah'];

export function isFriday(date) {
  return (
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    new Date(`${date}T12:00:00Z`).getUTCDay() === 5
  );
}

export function jummahClock(value) {
  const match =
    typeof value === 'string' && value.trim().match(/^(\d{1,2}):(\d{2})(?::00)?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  if (hour > 23 || Number(match[2]) > 59 || (match[3] && (hour < 1 || hour > 12))) return null;
  if (match[3]) hour = (hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}

export function parseJummahSettings(value) {
  let settings = value;
  if (typeof value === 'string') {
    try {
      settings = JSON.parse(value);
    } catch {
      settings = {};
    }
  }
  return Object.fromEntries(fields.map((key) => [key, jummahClock(settings?.[key])]));
}

// A dated exception wins; blank fields inherit the published weekly setting.
// There are no guessed times and no substitution from the ordinary Dhuhr Jamaat.
export function resolveJummah(row, weekly = {}) {
  const defaults = parseJummahSettings(weekly);
  return [1, 2].map((number) => {
    const prayerKey = `jummah_${number}_jamah`;
    const khutbahKey = number === 1 ? 'jummah_1_start' : 'jummah_2_begins';
    const prayer = jummahClock(row?.[prayerKey]) || defaults[prayerKey];
    const khutbah = jummahClock(row?.[khutbahKey]) || defaults[khutbahKey];
    return {
      number,
      name: number === 1 ? 'First Jummah' : 'Second Jummah',
      prayer,
      khutbah: khutbah && prayer && khutbah <= prayer ? khutbah : null,
    };
  });
}

export function jummahFieldsFor(sessions) {
  return {
    jummah_1_start: sessions[0]?.khutbah || null,
    jummah_1_jamah: sessions[0]?.prayer || null,
    jummah_2_begins: sessions[1]?.khutbah || null,
    jummah_2_jamah: sessions[1]?.prayer || null,
  };
}
