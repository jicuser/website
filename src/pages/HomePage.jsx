import React, { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Play,
  Radio,
  Users,
  Building2,
  ArrowRight,
  Megaphone,
  Heart,
  HeartHandshake,
} from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import MosqueIcon from '@/components/icons/MosqueIcon';
import useCommunityLink from '@/hooks/useCommunityLink';
import ProgrammePosters from '@/components/ProgrammePosters';
import HomePrayerCard from '@/components/home/HomePrayerCard';
import { SITE } from '@/content/site';
import { useContent } from '@/context/ContentContext';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import { safeWebUrl, youtubeEmbedUrl } from '@/lib/video';
import { displayTime } from '@/lib/timetable';
import { isPageVisible } from '@/lib/pageVisibility';
import { cn } from '@/lib/utils';

const ServiceExplorer = lazy(() => import('@/features/services/ServiceExplorer'));

const DEFAULT_CARDS = [
  {
    key: 'services',
    title: 'Services',
    text: 'Religious, educational and community services for all.',
    to: '/services',
    cta: 'Explore Services',
    icon: MosqueIcon,
    img: '',
  },
  {
    key: 'projects',
    title: 'Our masjid, our future',
    text: 'Explore the building project and ways to support the centre.',
    to: '/projects',
    cta: 'View & Support the Works',
    icon: Building2,
    img: '',
  },
  {
    key: 'youth',
    title: 'Room for the next generation',
    text: 'Discover youth activities, learning and ways to get involved.',
    to: '/youth',
    cta: 'Explore Youth',
    icon: Users,
    img: '',
  },
  {
    key: 'madrassah',
    title: 'Madrassah',
    text: 'Islamic education for the next generation.',
    to: '/madrassah',
    cta: 'View Classes',
    icon: BookOpen,
    img: '',
  },
];
function HomeDestination({ title, text, to, icon: Icon, img, onClick }) {
  const Tag = to ? Link : 'button';
  return (
    <Tag
      {...(to ? { to } : { type: 'button', onClick })}
      className={cn('jic-home-destination', img && 'has-image')}
      style={img ? { '--card-image': `url("${img}")` } : undefined}
    >
      <span className="jic-home-destination-icon">
        <Icon size={21} aria-hidden="true" />
      </span>
      <span className="jic-home-destination-copy">
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
      <ArrowRight size={16} className="jic-home-destination-arrow" aria-hidden="true" />
    </Tag>
  );
}

function useHomeTiles() {
  const { getContent } = useContent();
  const raw = getContent('home_tiles', null);
  return useMemo(() => {
    try {
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved)) return DEFAULT_CARDS;
      return DEFAULT_CARDS.map((base) => {
        const edit = saved.find((item) => item.key === base.key);
        if (!edit) return base;
        return {
          ...base,
          title:
            base.key === 'projects' && edit.title === 'Projects'
              ? base.title
              : edit.title || base.title,
          text: edit.text || base.text,
          img: typeof edit.image === 'string' ? edit.image : base.img,
        };
      });
    } catch {
      return DEFAULT_CARDS;
    }
  }, [raw]);
}

export default function HomePage() {
  const { events, announcement, livestream } = useHomeLiveContent();
  const whatsapp = useCommunityLink();
  const cards = useHomeTiles();
  const [playingUrl, setPlayingUrl] = useState(null);
  const { getContent } = useContent();
  let hero = {};
  try {
    hero = JSON.parse(getContent('page:/', '{}')) || {};
  } catch {}
  const liveUrl = safeWebUrl(livestream?.stream_url) || SITE.socials.youtube;
  const embedUrl = useMemo(() => youtubeEmbedUrl(livestream?.stream_url), [livestream]);
  const hasLiveStream = Boolean(livestream?.enabled && safeWebUrl(livestream.stream_url));
  const shortcuts = [
    {
      key: 'janazah',
      title: 'Janazah',
      text: 'Funeral support',
      to: '/funerals',
      icon: HeartHandshake,
    },
    {
      key: 'nikah',
      title: 'Nikah',
      text: 'Marriage services',
      to: '/services/nikah',
      icon: Heart,
    },
    {
      key: 'courses',
      title: 'Courses',
      text: 'Find a class',
      to: '/education/courses',
      icon: BookOpen,
    },
    {
      ...cards.find((card) => card.key === 'madrassah'),
      text: 'Learn & enrol',
    },
  ].filter((card) => !card.to || isPageVisible(getContent, card.to));
  const communityCards = cards.filter(
    (card) => !['madrassah', 'services'].includes(card.key) && isPageVisible(getContent, card.to),
  );

  return (
    <div className="jic-premium-home">
      <section className="jic-hero">
        <div className="jic-hero-inner">
          <div className="jic-hero-copy">
            <p className="jic-kicker">JAMATIA ISLAMIC CENTRE · BIRMINGHAM</p>
            <h1 style={{ whiteSpace: 'pre-line' }}>
              {hero.title || (
                <>
                  A place for faith.
                  <br />
                  <em>A home for community.</em>
                </>
              )}
            </h1>
            <p className="jic-hero-sub" style={{ whiteSpace: 'pre-line' }}>
              {hero.body ||
                'Come to pray. Find a class. Be part of something closer to home. Welcome to Jamatia Islamic Centre.'}
            </p>
            <nav className="jic-home-shortcuts" aria-label="Services and learning">
              {shortcuts.map(({ key, ...card }) => (
                <HomeDestination key={key} {...card} />
              ))}
            </nav>
            <Link to="/contact#map" className="jic-home-visit">
              Plan your visit <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <HomePrayerCard />
        </div>
      </section>

      <div className="jic-home-content">
        {announcement && (
          <section className="jic-announcement jic-popup-surface">
            <Megaphone size={18} />
            <strong>{announcement.title}</strong>
            <span>{announcement.body}</span>
          </section>
        )}

        {hasLiveStream && (
          <a href="#live" className="jic-home-live-banner">
            <span className="jic-home-live-badge">
              <Radio size={16} aria-hidden="true" /> Live now
            </span>
            <strong>{livestream.title || 'JIC Live'}</strong>
            <span>
              Watch <ArrowRight size={17} aria-hidden="true" />
            </span>
          </a>
        )}

        <ProgrammePosters />

        {events.length > 0 && (
          <section className="jic-upcoming-events" aria-labelledby="upcoming-events-title">
            <h2 id="upcoming-events-title">Upcoming events</h2>
            {events.length > 3 && (
              <Link className="jic-text-link" to="/events">
                All events <ArrowRight size={16} />
              </Link>
            )}
            <div className="jic-event-cards">
              {events.slice(0, 3).map((event) => (
                <article key={event.id} className="jic-event-card">
                  {safeWebUrl(event.poster_url) && (
                    <img src={event.poster_url} alt={`${event.title} poster`} loading="lazy" />
                  )}
                  <h3>{event.title}</h3>
                  <p>
                    <time dateTime={event.event_date}>
                      {new Date(`${event.event_date}T12:00:00`).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                    {event.start_time ? ` · ${displayTime(event.start_time)}` : ''}
                  </p>
                  {event.location && <p>{event.location}</p>}
                  {event.description && <p>{event.description}</p>}
                  {safeWebUrl(event.registration_url) && (
                    <a href={safeWebUrl(event.registration_url)} target="_blank" rel="noreferrer">
                      Event details & registration
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <Suspense
          fallback={
            <p className="jic-home-section" role="status">
              Loading services…
            </p>
          }
        >
          <ServiceExplorer compact />
        </Suspense>

        {communityCards.length > 0 && (
          <section className="jic-home-section" aria-labelledby="home-community-title">
            <h2 id="home-community-title">Community at JIC</h2>
            <nav className="jic-home-community-grid" aria-label="Community and services">
              {communityCards.map(({ key, ...card }) => (
                <HomeDestination key={key} {...card} />
              ))}
            </nav>
          </section>
        )}

        {hasLiveStream && (
          <section id="live" className="jic-live-section">
            <div className="jic-live-heading">
              <span>
                <Radio size={15} /> Live
              </span>
              <h2>{livestream.title || 'JIC Live'}</h2>
            </div>
            {embedUrl ? (
              <div className="jic-live-frame">
                {playingUrl === embedUrl ? (
                  <iframe
                    src={`${embedUrl}?autoplay=1`}
                    title={livestream.title || 'JIC Live'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <button
                    type="button"
                    className="jic-live-play"
                    onClick={() => setPlayingUrl(embedUrl)}
                  >
                    <Play size={30} aria-hidden="true" />
                    <span>Play {livestream.title || 'JIC Live'}</span>
                  </button>
                )}
              </div>
            ) : (
              <a
                className="jic-primary-cta jic-watch-live"
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
              >
                Watch Live on YouTube
              </a>
            )}
          </section>
        )}

        <a
          className="jic-home-footer-strip"
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
        >
          <WhatsAppIcon size={22} aria-hidden="true" />
          <span>
            <strong>Join WhatsApp</strong>
            <small>Community updates from JIC</small>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
