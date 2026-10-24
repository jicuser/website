import React, { lazy, Suspense } from 'react';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import GuideResource from '@/components/GuideResource';
import PageHeading from '@/components/PageHeading';
import ReadingIllustration from '@/components/worship/ReadingIllustration';

// Reading text and the surah directory load only when their reader is opened.
const AdhkarReader = lazy(() => import('@/components/worship/AdhkarReader'));
const QuranReader = lazy(() => import('@/components/worship/QuranReader'));
const JanazahGuide = lazy(() => import('@/components/worship/JanazahGuide'));

const salahSteps = [
  [
    'Prepare',
    'Make wudu, ensure clothing and place are clean, face the qiblah and form the intention.',
  ],
  ['Begin', 'Say the opening takbir and stand in prayer with focus.'],
  ['Recite', 'Recite al-Fatihah and Qur’an as appropriate for the rak‘ah.'],
  ['Ruku‘', 'Bow with calmness, then return to standing.'],
  ['Sujud', 'Prostrate with calmness, sit between the two prostrations, then prostrate again.'],
  ['Complete', 'Finish the required rak‘ahs, tashahhud, salawat and salam.'],
];

export default function WorshipPage() {
  const { pathname } = useLocation();
  const { getContent } = useContent();
  if (pathname === '/worship/daily-salah') return <Navigate to="/prayer-times" replace />;

  return (
    <div className="worship-page">
      {pathname === '/worship' && (
        <>
          <PageHeading title="Worship">
            Choose a reading or open the funeral prayer guide.
          </PageHeading>
          <div className="worship-hub-grid">
            {isPageVisible(getContent, '/worship/daily-duas') && (
              <Link to="/worship/daily-duas">
                <ReadingIllustration resource="adhkar" />
                <div>
                  <span className="worship-resource-label">Morning · Evening · After Salah</span>
                  <h2>Adhkar</h2>
                  <p>Read Arabic, follow the transliteration and understand the meaning.</p>
                  <span className="worship-resource-action">
                    Start reading <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            )}
            {isPageVisible(getContent, '/worship/quran') && (
              <Link to="/worship/quran">
                <ReadingIllustration resource="quran" />
                <div>
                  <span className="worship-resource-label">Arabic & English translation</span>
                  <h2>Read Qur’an</h2>
                  <p>Find a surah and save your place to continue another time.</p>
                  <span className="worship-resource-action">
                    Choose a surah <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            )}
            {isPageVisible(getContent, '/worship/janazah-guide') && (
              <Link to="/worship/janazah-guide">
                <ReadingIllustration resource="janazah" />
                <div>
                  <span className="worship-resource-label">The four takbirs</span>
                  <h2>Janazah Guide</h2>
                  <p>Follow the recitations, with the full guide in English or Urdu.</p>
                  <span className="worship-resource-action">
                    Read the guide <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            )}
          </div>
          <nav className="worship-secondary-links" aria-label="More worship resources">
            {[
              ['Salah guide', '/worship/prayer-guide'],
              ['Salah times', '/prayer-times'],
              ['Salah reminders', '/prayer-times/reminders'],
              ['Dala’il al-Khayrat', '/worship/dalail-al-khayrat'],
            ]
              .filter(([, to]) => isPageVisible(getContent, to))
              .map(([title, to]) => (
                <Link key={to} to={to}>
                  {title}
                </Link>
              ))}
          </nav>
        </>
      )}
      <Suspense
        fallback={
          <p className="worship-loading" role="status">
            <Loader2 className="animate-spin" aria-hidden="true" />
            Loading reading…
          </p>
        }
      >
        {pathname === '/worship/quran' && <QuranReader />}
        {pathname === '/worship/daily-duas' && <AdhkarReader />}
        {pathname === '/worship/janazah-guide' && <JanazahGuide />}
      </Suspense>
      {pathname === '/worship/prayer-guide' && (
        <>
          <header className="jic-guide-heading">
            <h1>Salah guide</h1>
            <p>
              Use the full guide for the prayer method and rulings. The steps below are a short
              refresher; ask the Imam if you are unsure.
            </p>
          </header>
          <GuideResource guide="salah" />
          <div className="worship-guide-grid">
            {salahSteps.map(([title, text], index) => (
              <article key={title}>
                <b>{String(index + 1).padStart(2, '0')}</b>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="worship-reading-card worship-secondary-links">
            <Link className="jic-button" to="/worship/janazah-guide">
              Janazah prayer guide
            </Link>
            <Link className="jic-button" to="/prayer-times/reminders">
              Set Salah reminders
            </Link>
          </div>
        </>
      )}
      {pathname === '/worship/dalail-al-khayrat' && (
        <section className="worship-reading-card">
          <h1>Dala’il al-Khayrat</h1>
          <p>
            Contact the centre for details of JIC’s Dala’il al-Khayrat reading programme, salawat
            and related resources.
          </p>
          <Link className="jic-button" to="/contact">
            Contact the centre
          </Link>
        </section>
      )}
    </div>
  );
}
