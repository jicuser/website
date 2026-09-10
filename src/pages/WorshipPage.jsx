import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Headphones, HeartHandshake, Loader2, MoonStar } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ManagedPageContent from '@/components/ManagedPageContent';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';

const QURAN_API = 'https://api.alquran.cloud/v1';
const QURAN_FALLBACK = 'https://quran.com';
const TARTEEL = 'https://tarteel.ai';

const views = {
  '/worship': { title: 'Worship & Qur’an', intro: 'Read Qur’an, build a daily routine and find practical worship guides.' },
  '/worship/quran': { title: 'Read Qur’an', intro: 'Arabic Qur’an with English meaning, loaded from a public Qur’an API.' },
  '/worship/dalail-al-khayrat': { title: 'Dala’il al-Khayrat', intro: 'A dedicated space for salawat and the Dala’il al-Khayrat reading programme.' },
  '/worship/daily-duas': { title: 'Daily Du‘as', intro: 'A simple collection for morning, evening and everyday supplications.' },
  '/worship/prayer-guide': { title: 'Prayer Guide', intro: 'A clear refresher for preparing for and performing Salah.' },
  '/worship/janazah-guide': { title: 'Janazah Guide', intro: 'A concise guide for the funeral prayer and what to expect at a Janazah.' },
  '/worship/daily-salah': { title: 'Daily Salah', intro: 'Today’s JIC Salah timetable and the five daily prayers in one place.' },
};

const salahSteps = [
  ['Prepare', 'Make wudu, ensure clothing and place are clean, face the qiblah and form the intention.'],
  ['Begin', 'Say the opening takbir and stand in prayer with focus.'],
  ['Recite', 'Recite al-Fatihah and Qur’an as appropriate for the rak‘ah.'],
  ['Ruku‘', 'Bow with calmness, then return to standing.'],
  ['Sujud', 'Prostrate with calmness, sit between the two prostrations, then prostrate again.'],
  ['Complete', 'Finish the required rak‘ahs, tashahhud, salawat and salam.'],
];

const janazahSteps = [
  ['Intention', 'Stand for the Janazah prayer facing the qiblah with the congregation.'],
  ['First takbir', 'Begin with takbir and recite the opening praise according to the practice followed at the masjid.'],
  ['Second takbir', 'Send salawat upon the Prophet ﷺ.'],
  ['Third takbir', 'Make sincere du‘a for the deceased and the Muslims.'],
  ['Fourth takbir', 'Complete the prayer with the final takbir and salam.'],
];

const duaCards = [
  ['Morning', 'Begin the day with dhikr, gratitude and protection du‘as.'],
  ['Evening', 'Read the evening adhkar after ‘Asr or Maghrib according to your routine.'],
  ['Before sleep', 'End the day with wudu where possible, Ayat al-Kursi and the closing surahs.'],
  ['After Salah', 'Keep a short, consistent set of tasbih, istighfar and personal du‘a after prayer.'],
];

function QuranReader() {
  const [surah, setSurah] = useState(1);
  const [ayahs, setAyahs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetch(`${QURAN_API}/surah/${surah}/editions/quran-uthmani,en.sahih`)
      .then(response => {
        if (!response.ok) throw new Error('Qur’an reader is temporarily unavailable.');
        return response.json();
      })
      .then(payload => {
        if (!active) return;
        const arabic = payload?.data?.[0]?.ayahs || [];
        const english = payload?.data?.[1]?.ayahs || [];
        setAyahs(arabic.map((ayah, index) => ({
          number: ayah.numberInSurah,
          arabic: ayah.text,
          english: english[index]?.text || '',
        })));
      })
      .catch(loadError => active && setError(loadError.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [surah]);

  return <section className="worship-reader">
    <div className="worship-reader-toolbar">
      <label>Surah
        <select value={surah} onChange={event => setSurah(Number(event.target.value))}>
          {Array.from({ length: 114 }, (_, index) => index + 1).map(number => <option key={number} value={number}>Surah {number}</option>)}
        </select>
      </label>
      <div className="worship-external-links">
        <a href={TARTEEL} target="_blank" rel="noreferrer"><Headphones size={16}/>Tarteel</a>
        <a href={QURAN_FALLBACK} target="_blank" rel="noreferrer"><ExternalLink size={16}/>Quran.com</a>
      </div>
    </div>
    {loading && <div className="worship-loading"><Loader2 className="animate-spin"/>Loading Qur’an…</div>}
    {error && <div className="worship-note">{error} <a href={QURAN_FALLBACK} target="_blank" rel="noreferrer">Open Quran.com</a></div>}
    {!loading && !error && <div className="worship-ayah-list">{ayahs.map(ayah => <article key={ayah.number} className="worship-ayah">
      <span>{ayah.number}</span>
      <p className="worship-arabic" lang="ar" dir="rtl">{ayah.arabic}</p>
      <p>{ayah.english}</p>
    </article>)}</div>}
  </section>;
}

function DailySalah() {
  const { todaysTimes } = usePrayerTimes();
  const prayers = useMemo(() => [
    ['Fajr', todaysTimes?.fajr, todaysTimes?.jamaah_fajr],
    ['Sunrise', todaysTimes?.sunrise, null],
    ['Dhuhr', todaysTimes?.dhuhr, todaysTimes?.jamaah_dhuhr],
    ['Asr', todaysTimes?.asr, todaysTimes?.jamaah_asr],
    ['Maghrib', todaysTimes?.maghrib, todaysTimes?.jamaah_maghrib],
    ['Isha', todaysTimes?.isha, todaysTimes?.jamaah_isha],
  ], [todaysTimes]);
  return <div className="worship-salah-grid">{prayers.map(([name, start, jamaah]) => <article key={name}><MoonStar/><strong>{name}</strong><span>Start {start || '—'}</span>{jamaah && <span>Jama‘ah {jamaah}</span>}</article>)}</div>;
}

function Cards({ items }) {
  return <div className="worship-guide-grid">{items.map(([title, text], index) => <article key={title}><b>{String(index + 1).padStart(2, '0')}</b><h3>{title}</h3><p>{text}</p></article>)}</div>;
}

export default function WorshipPage() {
  const { pathname } = useLocation();
  const view = views[pathname] || views['/worship'];
  const isQuran = pathname === '/worship/quran';
  const isPrayer = pathname === '/worship/prayer-guide';
  const isJanazah = pathname === '/worship/janazah-guide';
  const isDailySalah = pathname === '/worship/daily-salah';
  const isDuas = pathname === '/worship/daily-duas';
  const isDalail = pathname === '/worship/dalail-al-khayrat';

  return <div className="worship-page">
    <section className="worship-hero">
      <div className="worship-kicker"><BookOpen size={16}/>Worship at JIC</div>
      <ManagedPageContent fallbackTitle={view.title} fallbackBody={view.intro}/>
    </section>

    {pathname === '/worship' && <div className="worship-hub-grid">
      <a href="/worship/quran"><BookOpen/><h2>Read Qur’an</h2><p>Read Arabic with English meaning.</p></a>
      <a href="/worship/dalail-al-khayrat"><HeartHandshake/><h2>Dala’il al-Khayrat</h2><p>Salawat and daily reading.</p></a>
      <a href="/worship/daily-duas"><MoonStar/><h2>Daily Du‘as</h2><p>Morning, evening and everyday adhkar.</p></a>
      <a href="/worship/prayer-guide"><MoonStar/><h2>Prayer Guide</h2><p>A compact Salah refresher.</p></a>
      <a href="/worship/janazah-guide"><HeartHandshake/><h2>Janazah Guide</h2><p>Know the basic funeral prayer steps.</p></a>
      <a href="/worship/daily-salah"><MoonStar/><h2>Daily Salah</h2><p>Today’s JIC prayer times.</p></a>
    </div>}
    {isQuran && <QuranReader/>}
    {isPrayer && <Cards items={salahSteps}/>} 
    {isJanazah && <Cards items={janazahSteps}/>} 
    {isDuas && <Cards items={duaCards}/>} 
    {isDailySalah && <DailySalah/>}
    {isDalail && <section className="worship-reading-card"><h2>Dala’il al-Khayrat</h2><p>Use this page for JIC’s approved daily reading, salawat schedule, recordings and notes. Staff can edit the page text and add sections from Admin.</p></section>}
  </div>;
}
