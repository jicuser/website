import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation } from 'react-router-dom';
import { Box, Check, ArrowDown, ArrowRight, CalendarDays } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { useAuth } from '@/context/AuthContext';
import ImageViewer from '@/components/ImageViewer';
import { DEFAULT_STAGES, PROJECT_KEY, STAGE_STATUS, parseStages, polycamEmbed } from './model';
import '@/styles/operations.css';
import '@/styles/projects.css';
const formatDate = (value) =>
  value
    ? new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/London',
      })
    : '';
export default function ProjectTimeline() {
  const { getContent } = useContent();
  const { can } = useAuth();
  const location = useLocation();
  const raw = getContent(PROJECT_KEY, JSON.stringify(DEFAULT_STAGES));
  const stages = parseStages(raw).filter((s) => s.visible);
  const routeStage = location.pathname.split('/').pop();
  const [active, setActive] = useState(''),
    [image, setImage] = useState(null),
    [walkthrough, setWalkthrough] = useState('');
  const sections = useRef(new Map());
  const selected = stages.find((s) => s.id === active) || stages[0];
  const completed = stages.filter((s) => s.status === 'completed').length;
  function choose(id) {
    setActive(id);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    sections.current
      .get(id)
      ?.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'start' });
  }
  useEffect(() => {
    if (stages.some((s) => s.id === routeStage)) {
      setActive(routeStage);
      sections.current.get(routeStage)?.scrollIntoView({ block: 'start' });
    }
  }, [routeStage, raw]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.dataset.stage);
      },
      { rootMargin: '-20% 0px -40% 0px', threshold: [0, 0.1, 0.5] },
    );
    sections.current.forEach((node) => {
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [raw]);
  return (
    <div className="ops-page project-journey">
      <Helmet>
        <title>Our Masjid Project | Jamatia Islamic Centre</title>
      </Helmet>
      <header className="project-hero">
        <div>
          <p className="ops-eyebrow">Built together. Stage by stage.</p>
          <h1>
            Our masjid.
            <br />
            The next chapter.
          </h1>
          <p>View the project areas, published updates and ways to support JIC.</p>
          <div className="ops-actions">
            <a className="ops-button" href="#project-stages">
              View project stages <ArrowDown size={17} />
            </a>
            <Link className="ops-secondary" to="/donate">
              Support JIC <ArrowRight size={17} />
            </Link>
          </div>
          {can('content') && (
            <Link className="ops-text-link" to="/admin?section=projects">
              Edit stages, photos & walkthroughs →
            </Link>
          )}
        </div>
        <figure>
          <img
            src="/optimized/jic-about-760.webp"
            alt="Jamatia Islamic Centre viewed from above at sunset"
          />
          <figcaption>The centre we’re building around.</figcaption>
        </figure>
      </header>
      <section className="project-explorer" aria-labelledby="project-explore-title">
        <div>
          <p className="ops-eyebrow">Explore our spaces</p>
          <h2 id="project-explore-title">Project areas</h2>
          <p>Choose a space to see its published details.</p>
          <p className="project-summary">
            <strong>{completed}</strong> of {stages.length} stages marked complete
          </p>
          <small>This diagram shows project areas and their published status.</small>
        </div>
        <div className="project-map">
          {stages.map((s, i) => (
            <button
              key={s.id}
              className={`project-map-tile ${s.status}`}
              aria-pressed={selected?.id === s.id}
              onClick={() => choose(s.id)}
            >
              <span className="project-map-number">{String(i + 1).padStart(2, '0')}</span>
              <strong>{s.title}</strong>
              <span>
                {s.status === 'completed' ? <Check size={16} /> : <Box size={16} />}{' '}
                {STAGE_STATUS.find(([id]) => id === s.status)?.[1]}
              </span>
            </button>
          ))}
        </div>
      </section>
      <div id="project-stages" className="project-stages-layout">
        <nav className="project-stage-nav" aria-label="Project stages">
          <p className="ops-eyebrow">Project stages</p>
          {stages.map((s, i) => (
            <button
              key={s.id}
              aria-current={selected?.id === s.id ? 'step' : undefined}
              onClick={() => choose(s.id)}
            >
              <span>{s.status === 'completed' ? <Check size={15} /> : i + 1}</span>
              <strong>{s.title}</strong>
            </button>
          ))}
        </nav>
        <div className="project-timeline">
          {stages.map((s, i) => (
            <section
              key={s.id}
              id={`stage-${s.id}`}
              data-stage={s.id}
              ref={(node) => {
                if (node) sections.current.set(s.id, node);
                else sections.current.delete(s.id);
              }}
              className={`project-stage ${s.status}`}
            >
              <span className="project-stage-marker" aria-hidden="true">
                {s.status === 'completed' ? <Check size={19} /> : String(i + 1).padStart(2, '0')}
              </span>
              <div className="project-stage-heading">
                <p className="ops-badge">{STAGE_STATUS.find(([id]) => id === s.status)?.[1]}</p>
                <h2>{s.title}</h2>
                <div className="project-stage-dates">
                  {s.started_on && (
                    <span>
                      <CalendarDays size={16} /> Started {formatDate(s.started_on)}
                    </span>
                  )}
                  {s.completed_on && s.status === 'completed' && (
                    <span>
                      <Check size={16} /> Completed {formatDate(s.completed_on)}
                    </span>
                  )}
                </div>
              </div>
              <p className="ops-preserve">{s.description}</p>
              {s.photos.length > 0 && (
                <div className="project-photos">
                  {s.photos.map((photo, index) => (
                    <button
                      key={`${photo.url}-${index}`}
                      type="button"
                      onClick={() =>
                        setImage({ url: photo.url, title: photo.caption, alt: photo.caption })
                      }
                    >
                      <img src={photo.url} alt={photo.caption} loading="lazy" />
                      <span>{photo.caption}</span>
                    </button>
                  ))}
                </div>
              )}
              {s.status === 'completed' && polycamEmbed(s.polycam) && (
                <div className="project-walkthrough">
                  <div className="ops-heading">
                    <div>
                      <p className="ops-eyebrow">Step inside</p>
                      <h3>Explore in 3D</h3>
                    </div>
                    <button
                      className="ops-secondary"
                      onClick={() => setWalkthrough(walkthrough === s.id ? '' : s.id)}
                    >
                      <Box size={18} />
                      {walkthrough === s.id ? 'Close walkthrough' : 'Load walkthrough'}
                    </button>
                  </div>
                  {walkthrough === s.id ? (
                    <>
                      <iframe
                        src={polycamEmbed(s.polycam)}
                        title={`${s.title} — Polycam walkthrough`}
                        loading="lazy"
                        allow="fullscreen; xr-spatial-tracking"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                      <a
                        href={polycamEmbed(s.polycam).replace('/embed', '')}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open full-screen on Polycam ↗
                      </a>
                    </>
                  ) : (
                    <p>
                      Rotate, move around and zoom into this completed space. Loading connects to
                      Polycam.
                    </p>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
      {!stages.length && (
        <div className="ops-empty">
          <h2>No project stages are currently published.</h2>
          <p>Contact the centre for the latest information about the works.</p>
        </div>
      )}
      {image && <ImageViewer image={image} onClose={() => setImage(null)} />}
    </div>
  );
}
