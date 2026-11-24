import React, { lazy, Suspense } from 'react';
import { BookOpen, Languages, Loader2 } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import GuideResource from '@/components/GuideResource';
import PageHeading from '@/components/PageHeading';
import '@/styles/services.css';
import GuidancePanel from '@/features/guidance/GuidancePanel';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import { getVisibleReadLearnResources } from '@/content/readLearn';

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
  const { pathname: routePath } = useLocation();
  const pathname = routePath.replace(/\/+$/, '') || '/';
  const { getContent } = useContent();
  const resources = getVisibleReadLearnResources(getContent);
  const readings = resources.filter((resource) => resource.category === 'read');
  const learning = resources.filter((resource) => resource.category === 'learn');
  const guides = resources.filter((resource) => resource.category === 'guide');
  if (pathname === '/worship/daily-salah') return <Navigate to="/prayer-times" replace />;

  return (
    <div className="worship-page">
      {pathname === '/worship' && (
        <>
          <PageHeading title="Read & Learn" eyebrow="Use online" icon={BookOpen}>
            Read Qur’an and du’as, or build Arabic one piece at a time.
          </PageHeading>
          <div className="read-learn-home">
            <div className="read-learn-primary">
              {readings.length > 0 && (
                <section className="read-learn-section" aria-labelledby="read-learn-reading-title">
                  <div className="read-learn-section-heading">
                    <BookOpen size={22} aria-hidden="true" />
                    <h2 id="read-learn-reading-title">Read</h2>
                  </div>
                  <p>Open a reader and continue at your own pace.</p>
                  <nav
                    className="worship-compact-resources read-learn-readers"
                    aria-label="Read online"
                  >
                    {readings.map((resource) => (
                      <Link key={resource.id} to={resource.to}>
                        <strong>{resource.title}</strong>
                        <span>{resource.description}</span>
                      </Link>
                    ))}
                  </nav>
                </section>
              )}
              {learning.length > 0 && (
                <section
                  className="read-learn-section read-learn-study"
                  aria-labelledby="read-learn-arabic-title"
                >
                  <div className="read-learn-section-heading">
                    <Languages size={22} aria-hidden="true" />
                    <h2 id="read-learn-arabic-title">Learn Arabic</h2>
                  </div>
                  <p>Choose a word. Change a piece. Understand what it does.</p>
                  <div className="read-learn-example">
                    <span lang="ar" dir="rtl">
                      بَيْتُنَا
                    </span>
                    <span>bayt · u · nā</span>
                    <strong>our house</strong>
                  </div>
                  {learning.map((resource) => (
                    <Link className="read-learn-open" key={resource.id} to={resource.to}>
                      Open the Arabic playground
                    </Link>
                  ))}
                </section>
              )}
            </div>
            {guides.length > 0 && (
              <details className="read-learn-guides">
                <summary>Prayer guides & programme information</summary>
                <nav aria-label="Prayer guides and programmes">
                  {guides.map((resource) => (
                    <Link key={resource.id} to={resource.to}>
                      <strong>{resource.title}</strong>
                      <span>{resource.description}</span>
                    </Link>
                  ))}
                </nav>
              </details>
            )}
            {!resources.length && <p>Online resources are not currently listed.</p>}
            {readings.length > 0 && (
              <details className="read-learn-guides">
                <summary>Help choosing a reading</summary>
                <GuidancePanel journeyId="worship" />
              </details>
            )}
            {isPageVisible(getContent, '/education') && (
              <p className="read-learn-classes">
                Looking for classes at JIC? <Link to="/education">Education & Madrassah</Link>
              </p>
            )}
          </div>
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
