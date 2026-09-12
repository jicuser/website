import React from 'react';

// A general Qur’anic supplication, not a prescribed Taraweeh formula: https://quran.com/2/201.
const DUA =
  'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ';
export default function TvSpecialNotice({ mode, settings, fasting }) {
  if (mode === 'fasting')
    return (
      <section className="jic-tv-prayer-scene" aria-label="Ramadan fasting times">
        <h1>Ramadan Mubarak</h1>
        {fasting ? (
          <>
            <p>
              {fasting.label} ·{' '}
              {new Date(fasting.d_date + 'T12:00:00Z').toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
              })}
            </p>
            <div className="jic-tv-fasting">
              <div>
                <span>Suhoor ends · Fajr</span>
                <strong>{fasting.fajr}</strong>
              </div>
              <div>
                <span>Iftar · Maghrib</span>
                <strong>{fasting.maghrib}</strong>
              </div>
            </div>
            <p>May Allah accept your fasting and prayers.</p>
          </>
        ) : (
          <p>Fasting timetable is not available yet. Please check with the mosque.</p>
        )}
      </section>
    );
  const jummah = mode === 'jummah';
  return (
    <section
      className="jic-tv-prayer-scene"
      aria-label={jummah ? 'Jummah notice' : 'Ramadan supplication'}
    >
      <h1>{jummah ? 'Jumu‘ah Mubarak' : 'Ramadan · Taraweeh'}</h1>
      {jummah ? (
        <p>{settings.jummah_notice}</p>
      ) : (
        <>
          <p className="jic-tv-arabic" dir="auto">
            {settings.taraweeh_dua || DUA}
          </p>
          <p>
            {settings.taraweeh_dua
              ? 'Du‘a selected by the mosque'
              : 'A du‘a from the Qur’an · Al-Baqarah 2:201'}
          </p>
          <p>Take a quiet moment for du‘a.</p>
        </>
      )}
    </section>
  );
}
