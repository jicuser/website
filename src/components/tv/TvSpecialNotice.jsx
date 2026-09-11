import React from 'react';

// A general Qur’anic supplication, not a prescribed Taraweeh formula: https://quran.com/2/201.
const DUA =
  'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ';
export default function TvSpecialNotice({ mode, settings }) {
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
