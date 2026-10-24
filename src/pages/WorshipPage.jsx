import React, { lazy, Suspense } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import GuideResource from '@/components/GuideResource';
import PageHeading from '@/components/PageHeading';
import '@/styles/services.css';
import GuidancePanel from '@/features/guidance/GuidancePanel';
import { useContent } from '@/context/ContentContext';
import { getVisibleServices } from '@/features/services/catalog';

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
  const resources = getVisibleServices(getContent).filter(
    (service) => service.category === 'prayer',
  );
  if (pathname === '/worship/daily-salah') return <Navigate to="/prayer-times" replace />;

  return (
    <div className="worship-page">
      {pathname === '/worship' && (
        <>
          <PageHeading title="Worship">
            Adhkar, Qur’an and prayer guides, ready when you need them.
          </PageHeading>
          <div className="guidance-page-width">
            <nav className="worship-compact-resources" aria-label="Worship resources">
              {resources.map((resource) => (
                <Link key={resource.id} to={resource.to}>
                  <span>
                    <strong>{resource.title}</strong>
                    <small>{resource.description}</small>
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              ))}
            </nav>
            <GuidancePanel journeyId="worship" />
            <Link className="guidance-back-link" to="/prayer-times/reminders">
              Salah reminders <ArrowRight size={16} aria-hidden="true" />
            </Link>
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
