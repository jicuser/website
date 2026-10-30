import { noticePlacement } from '@/lib/noticePlacement';
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
import CommunityProgrammeList from '@/features/home/CommunityProgrammeList';
import HomePrayerCard from '@/components/home/HomePrayerCard';
import { SITE } from '@/content/site';
import { useContent } from '@/context/ContentContext';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import { safeWebUrl, youtubeEmbedUrl } from '@/lib/video';
import { isPageVisible } from '@/lib/pageVisibility';
import { cn } from '@/lib/utils';

import useInstalledApp from '@/hooks/useInstalledApp';
import AppHomeRadio from '@/components/home/AppHomeRadio';

const HomeRamadan = lazy(() => import('@/features/ramadan/HomeRamadan'));

const DEFAULT_CARDS = [
  {
    key: 'services',
    title: 'Community Hub',
    text: 'Find services and useful guidance in one place.',
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
  const installed = useInstalledApp();
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
    {
      key: 'hall',
      title: 'Hall hire',
      text: 'Enquire & book',
      to: '/services/hall-booking',
      icon: Building2,
    },
    {
      key: 'volunteer',
      title: 'Volunteer',
      text: 'Help at the centre',
      to: '/get-involved/volunteer',
      icon: Users,
    },
  ].filter((card) => !card.to || isPageVisible(getContent, card.to));
  const communityCards = cards.filter(
    (card) => !['madrassah', 'services'].includes(card.key) && isPageVisible(getContent, card.to),
  );

  const renderNotices = (position) => (
    <>
      {announcement && noticePlacement(announcement.display_settings).placement === position && (
        <section className="jic-announcement jic-popup-surface">
          <Megaphone size={18} />
          <strong>{announcement.title}</strong>
          <span>{announcement.body}</span>
        </section>
      )}

      {hasLiveStream && noticePlacement(livestream.display_settings).placement === position && (
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
    </>
  );

  return (
    <div className={`jic-premium-home ${installed ? 'jic-app-home' : ''}`}>
      {installed && <h1 className="sr-only">Jamatia Islamic Centre — Home</h1>}
      <section className="jic-hero">
        <div className="jic-hero-inner">
          {!installed && (
            <div className="jic-hero-copy">
              <header className="jic-home-intro">
                <p className="jic-app-brandline">Jamatia Islamic Centre</p>
                <h1 className="jic-home-welcome">Worship. Learn. Grow. Together.</h1>
              </header>
              <nav className="jic-home-shortcuts" aria-label="Services and learning">
                {shortcuts.map(({ key, ...card }) => (
                  <HomeDestination key={key} {...card} />
                ))}
              </nav>
              <Link to="/contact#map" className="jic-home-visit">
                Plan your visit <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          )}
          <HomePrayerCard />
          {installed && <AppHomeRadio />}
          {installed && (
            <nav
              className="jic-home-shortcuts jic-app-service-shortcuts"
              aria-label="Services and learning"
            >
              {shortcuts.map(({ key, ...card }) => (
                <HomeDestination key={key} {...card} />
              ))}
            </nav>
          )}
        </div>
      </section>

      <div className="jic-home-content">
        {renderNotices('before-events')}

        {getContent('ramadan:home-enabled', 'false') === 'true' && (
          <Suspense fallback={null}>
            <HomeRamadan />
          </Suspense>
        )}

        <CommunityProgrammeList events={events} />
        {renderNotices('after-events')}

        <nav className="jic-home-community-links" aria-label="More from JIC">
          <Link to="/services">
            Community Hub <ArrowRight size={16} aria-hidden="true" />
          </Link>
          {communityCards.map((card) => (
            <Link key={card.key} to={card.to}>
              {card.key === 'projects' ? 'Our projects' : 'Youth'}{' '}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </nav>

        {renderNotices('after-community')}
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
