import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QURAN_SURAHS } from '@/content/quranSurahs';
import {
  fetchQuranSurah,
  findSurahs,
  getReaderStorage,
  loadQuranPreferences,
  QURAN_FALLBACK,
  saveQuranPreferences,
} from '@/lib/quranReader';
import ReadingControls from './ReadingControls';
import '@/styles/worship-readers.css';

export default function QuranReader() {
  const [preferences, setPreferences] = useState(() => loadQuranPreferences(getReaderStorage()));
  const [surah, setSurah] = useState(() => preferences.savedVerse?.surah || 1);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState({ surah: null, status: 'loading', ayahs: [], error: '' });
  const [retry, setRetry] = useState(0);
  const [pendingAyah, setPendingAyah] = useState(null);
  const [saveNotice, setSaveNotice] = useState('');
  const matches = useMemo(() => findSurahs(query), [query]);
  const selected = QURAN_SURAHS[surah - 1];
  const saved = preferences.savedVerse;
  const savedSurah = saved ? QURAN_SURAHS[saved.surah - 1] : null;
  const loading = result.surah !== surah || result.status === 'loading';

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 20000);
    setResult({ surah, status: 'loading', ayahs: [], error: '' });
    fetchQuranSurah(surah, { signal: controller.signal })
      .then((ayahs) => {
        if (active) setResult({ surah, status: 'ready', ayahs, error: '' });
      })
      .catch((error) => {
        if (!active) return;
        setResult({
          surah,
          status: 'error',
          ayahs: [],
          error: timedOut
            ? 'Loading took too long. Please try again or open Quran.com.'
            : error.message,
        });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [surah, retry]);

  useEffect(() => {
    if (loading || result.status !== 'ready' || !pendingAyah) return;
    const verse = document.getElementById(`quran-ayah-${surah}-${pendingAyah}`);
    if (verse) {
      verse.scrollIntoView({ block: 'center' });
      verse.focus({ preventScroll: true });
    }
    setPendingAyah(null);
  }, [loading, pendingAyah, result, surah]);

  function updatePreferences(patch, message = '') {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    const stored = saveQuranPreferences(getReaderStorage(), next);
    setSaveNotice(
      stored
        ? message
        : 'Saving on this device is unavailable. You can keep reading; changes last for this visit.',
    );
  }

  function chooseSurah(number) {
    setPendingAyah(null);
    setSurah(number);
    setQuery('');
  }

  return (
    <section
      className="worship-reading"
      style={{ '--worship-arabic-size': `${preferences.fontSize}px` }}
    >
      <header className="jic-guide-heading">
        <Link to="/worship" className="worship-back-link">
          All reading resources
        </Link>
        <h1>Read Qur’an</h1>
        <p>Arabic with Sahih International’s English translation. Choose a surah to begin.</p>
      </header>
      <div className="worship-reader">
        <div className="worship-quran-navigation">
          <label>
            Search surahs
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, meaning or number"
            />
          </label>
          {query.trim() && (
            <div className="worship-surah-search">
              <p role="status">
                {matches.length
                  ? `${matches.length} surah${matches.length === 1 ? '' : 's'} found${matches.length > 10 ? '; showing the first 10' : ''}.`
                  : 'No surahs found. Try another name or number.'}
              </p>
              <ul aria-label="Matching surahs">
                {matches.slice(0, 10).map((item) => (
                  <li key={item.number}>
                    <button type="button" onClick={() => chooseSurah(item.number)}>
                      {item.number}. {item.name} — {item.meaning}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <label>
            Surah
            <select
              aria-label="Surah"
              value={surah}
              onChange={(event) => chooseSurah(Number(event.target.value))}
            >
              {QURAN_SURAHS.map((item) => (
                <option key={item.number} value={item.number}>
                  {item.number}. {item.name} — {item.meaning}
                </option>
              ))}
            </select>
          </label>
          {saved && (
            <button
              className="worship-continue"
              type="button"
              onClick={() => {
                setSurah(saved.surah);
                setQuery('');
                setPendingAyah(saved.ayah);
              }}
            >
              <Bookmark size={18} aria-hidden="true" />
              <span>
                Continue reading
                <span>
                  {savedSurah.name}, verse {saved.ayah}
                </span>
              </span>
            </button>
          )}
          <p className="worship-save-hint">
            {saved
              ? 'Your saved verse and reading settings stay on this browser.'
              : 'Use “Save verse” while reading to keep your place on this browser.'}
          </p>
          <p className="worship-save-notice" role="status">
            {saveNotice}
          </p>
        </div>
        <ReadingControls
          fontSize={preferences.fontSize}
          onFontSizeChange={(fontSize) => updatePreferences({ fontSize })}
          showMeaning={preferences.showTranslation}
          onMeaningChange={(showTranslation) => updatePreferences({ showTranslation })}
          meaningLabel="Show English translation"
        />
        <div className="worship-surah-heading">
          <h2>
            {selected.number}. {selected.name}
          </h2>
          <p lang="ar" dir="rtl">
            {selected.arabicName}
          </p>
          <p>
            {selected.meaning} · {selected.ayahCount} verses
          </p>
        </div>
        {loading && (
          <p className="worship-loading" role="status">
            <Loader2 className="animate-spin" aria-hidden="true" />
            Loading {selected.name}…
          </p>
        )}
        {!loading && result.status === 'error' && (
          <div className="worship-reader-error" role="alert">
            <p>{result.error}</p>
            <button
              className="jic-button"
              type="button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Try again
            </button>
            <a href={`${QURAN_FALLBACK}/${surah}`} target="_blank" rel="noopener noreferrer">
              Open {selected.name} on Quran.com
            </a>
          </div>
        )}
        {!loading && result.status === 'ready' && (
          <div className="worship-ayah-list">
            {result.ayahs.map((ayah) => {
              const isSaved = saved?.surah === surah && saved?.ayah === ayah.number;
              return (
                <article
                  key={ayah.number}
                  id={`quran-ayah-${surah}-${ayah.number}`}
                  className={`worship-quran-ayah${isSaved ? ' is-saved' : ''}`}
                  tabIndex={-1}
                  aria-label={`${selected.name}, verse ${ayah.number}`}
                >
                  <div className="worship-verse-toolbar">
                    <span>Verse {ayah.number}</span>
                    <button
                      type="button"
                      aria-pressed={isSaved}
                      aria-label={`${isSaved ? 'Saved' : 'Save'} verse ${surah}:${ayah.number}`}
                      onClick={() =>
                        updatePreferences(
                          { savedVerse: { surah, ayah: ayah.number } },
                          `Saved ${selected.name}, verse ${ayah.number} on this browser.`,
                        )
                      }
                    >
                      <Bookmark size={16} aria-hidden="true" />
                      {isSaved ? 'Saved verse' : 'Save verse'}
                    </button>
                  </div>
                  <p className="worship-recitation-arabic" lang="ar" dir="rtl">
                    {ayah.arabic}
                  </p>
                  {preferences.showTranslation && (
                    <p className="worship-quran-translation">{ayah.english}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
      <div className="worship-external-links worship-reader-sources">
        <a href={`${QURAN_FALLBACK}/${surah}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          Quran.com
        </a>
        <a href="https://tarteel.ai" target="_blank" rel="noopener noreferrer">
          Tarteel
        </a>
      </div>
      <p className="worship-reading-footnote">
        Text provided by AlQuran Cloud: Uthmani Arabic and Sahih International English. Translation
        is an interpretation of the meaning. If the reader is unavailable, use Quran.com.
      </p>
    </section>
  );
}
