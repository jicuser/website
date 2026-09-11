export function nextPrayer(times, date = new Date()) {
  const clock = date.toLocaleTimeString('en-GB', {timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false});
  const [hour,minute] = clock.split(':').map(Number);
  const now = hour * 60 + minute;
  for (const [name,key] of [['Fajr','fajr'],['Dhuhr','dhuhr'],['Asr','asr'],['Maghrib','maghrib'],['Isha','isha']]) {
    const match = String(times?.[key] || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) continue;
    const h = match[3] ? Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0) : Number(match[1]);
    if (h * 60 + Number(match[2]) > now) return {name,time:times[key],jamaah:times[`jamaah_${key}`],minutesLeft:h * 60 + Number(match[2]) - now};
  }
  return null;
}
