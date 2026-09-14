import React from 'react';
import { TV_DHIKR } from '@/content/tvReminders';
export default function TvPrayerScene({ sequence, jummahNotice }) {
  if (sequence.phase === 'jamaah')
    return (
      <section className="jic-tv-prayer-scene" aria-label="Congregation notice">
        <p className="jic-tv-scene-label">
          {sequence.name} · {sequence.time}
        </p>
        <h1>{sequence.key === 'jummah' ? 'Jumu‘ah congregation' : 'It is Jama‘ah time'}</h1>
        <p>Please switch off or silence your phone.</p>
        <p>
          {sequence.key === 'jummah'
            ? jummahNotice
            : 'Keep the prayer hall quiet and prepare for salah.'}
        </p>
      </section>
    );
  return (
    <section className="tv-dhikr" lang="ar" dir="rtl" aria-label={TV_DHIKR.title}>
      <h1>{TV_DHIKR.title}</h1>
      <div className="tv-dhikr-columns">
        <div className="tv-dhikr-opening">
          <div className="tv-dhikr-card">
            <p className="tv-dhikr-counted">
              <span>{TV_DHIKR.forgiveness.arabic}</span>
              <DhikrCount count={TV_DHIKR.forgiveness.count} />
            </p>
            <p>{TV_DHIKR.peace}</p>
          </div>
          <div className="tv-dhikr-card">
            <p>{TV_DHIKR.tawhid}</p>
            <p>{TV_DHIKR.generosity}</p>
          </div>
        </div>
        <div className="tv-dhikr-card tv-dhikr-kursi">
          <h2>{TV_DHIKR.kursi.label}</h2>
          <p>{TV_DHIKR.kursi.arabic}</p>
        </div>
      </div>
      <div className="tv-dhikr-tasbih">
        {TV_DHIKR.tasbih.map((item) => (
          <p className="tv-dhikr-counted" key={item.arabic}>
            <span>{item.arabic}</span>
            <DhikrCount count={item.count} />
          </p>
        ))}
      </div>
      <div className="tv-dhikr-completion">
        <h2>
          {TV_DHIKR.completion.label} <DhikrCount count={TV_DHIKR.completion.count} />
        </h2>
        <p>{TV_DHIKR.completion.arabic}</p>
      </div>
    </section>
  );
}

function DhikrCount({ count }) {
  const digits = String(count).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
  const label = count === 1 ? 'مَرَّةٌ وَاحِدَةٌ' : `${digits} ${count < 11 ? 'مَرَّاتٍ' : 'مَرَّةً'}`;
  return (
    <span className="tv-dhikr-count" aria-label={label}>
      {digits} ×
    </span>
  );
}
