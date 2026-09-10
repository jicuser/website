import React from 'react';

const minutes = value => {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  if (match[3]) hour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + Number(match[2]);
};

export default function TodaysPrayerTimesSection({ currentDate, todaysTimes }) {
  if (!todaysTimes) return <section className="py-6 px-4 text-center">Today's timetable is unavailable. Please contact the centre.</section>;
  const rows = [['Fajr','fajr'],['Sunrise','sunrise'],['Dhuhr','dhuhr'],['Asr','asr'],['Maghrib','maghrib'],['Isha','isha']];
  const now = minutes(currentDate.toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}));
  const next = rows.find(([name,key]) => name !== 'Sunrise' && minutes(todaysTimes[key]) !== null && minutes(todaysTimes[key]) > now);
  return <section className="jic-prayer-schedule mx-auto max-w-4xl px-4 py-6">
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full text-left">
        <caption className="sr-only">Today's prayer start and congregation times</caption>
        <thead><tr><th scope="col">Prayer</th><th scope="col">Starts</th><th scope="col">Jama‘ah</th></tr></thead>
        <tbody>{rows.map(([name,key]) => <tr key={key} className={next?.[1] === key ? 'is-next' : ''}><th scope="row">{name}</th><td>{todaysTimes[key]}</td><td>{todaysTimes[`jamaah_${key}`] || '—'}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}
