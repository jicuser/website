import React, { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Play, Radio, Users, Building2, ArrowRight, Megaphone } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import MosqueIcon from '@/components/icons/MosqueIcon';
import useCommunityLink from '@/hooks/useCommunityLink';
const WhatsOn = lazy(() => import('@/components/home/WhatsOn'));

import { COMMUNITY_SERVICES, HOME_SERVICE_IDS } from '@/content/communityServices';
import ServiceIcon from '@/features/services/ServiceIcon';
import { siteDesign } from '@/lib/siteDesign';
import HomePrayerCard from '@/components/home/HomePrayerCard';
import { SITE } from '@/content/site';
import { useContent } from '@/context/ContentContext';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import { safeWebUrl, youtubeEmbedUrl } from '@/lib/video';
import { isPageVisible } from '@/lib/pageVisibility';
import { cn } from '@/lib/utils';

const HomeRamadan = lazy(() => import('@/features/ramadan/HomeRamadan'));

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
  const { events, announcement, livestream, loading, stale } = useHomeLiveContent();
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
  const design = siteDesign(getContent);
  const shortcuts = HOME_SERVICE_IDS.map((id) =>
    COMMUNITY_SERVICES.find((item) => item.id === id),
  ).filter((item) => isPageVisible(getContent, item.to));
  const project = cards.find((card) => card.key === 'projects');
  const projectFeature = isPageVisible(getContent, project.to) ? (
    <section className="jic-home-section home-feature" aria-label="Our masjid project">
      <HomeDestination {...project} />
    </section>
  ) : null;
  const ramadan =
    getContent('ramadan:home-enabled', 'false') === 'true' && isPageVisible(getContent, '/ramadan');

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
              {shortcuts.map((item) => (
                <Link key={item.id} to={item.to} className="jic-home-destination">
                  <span className="jic-home-destination-icon">
                    <ServiceIcon
                      name={design.icons[item.id] || item.icon}
                      size={21}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="jic-home-destination-copy">
                    <strong>{item.shortTitle || item.title}</strong>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ))}
            </nav>
            <nav className="hub-utility-links home-worship-links" aria-label="Reading and services">
              {[
                ['Adhkar', '/worship/daily-duas'],
                ['Read Qur’an', '/worship/quran'],
                ['Community Hub', '/services'],
              ]
                .filter(([, to]) => isPageVisible(getContent, to))
                .map(([title, to]) => (
                  <Link key={to} to={to}>
                    {title}
                  </Link>
                ))}
            </nav>
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

        <Suspense fallback={<p role="status">Loading what’s on…</p>}>
          <WhatsOn events={events} loading={loading} stale={stale} />
        </Suspense>
        {ramadan ? (
          <Suspense fallback={null}>
            <HomeRamadan fallback={projectFeature} />
          </Suspense>
        ) : (
          projectFeature
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

        <div className="home-visit-row">
          <Link to="/contact#map">
            Visit us · Sparkhill, Birmingham <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <a href={`tel:${SITE.phone.replace(/\s/g, '')}`}>Call {SITE.phone}</a>
        </div>
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
