import React, { useRef } from 'react';
import { ArrowLeft, ArrowRight, Building2, Droplets, History, School, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const extensionAreas = [
  {
    title: 'Timeline',
    text: 'Follow the extension milestones and progress in order.',
    to: '/projects/masjid-extension/timeline',
    icon: History,
  },
  {
    title: 'Main Prayer Hall',
    text: 'See the main prayer hall work and updates.',
    to: '/projects/main-prayer-hall',
    icon: Building2,
  },
  {
    title: 'Wudu & Facilities',
    text: 'View the wudu and supporting facilities work.',
    to: '/projects/wudu-area',
    icon: Droplets,
  },
  {
    title: 'Community Hall',
    text: 'See the community hall plans and progress.',
    to: '/projects/community-hall',
    icon: Users,
  },
  {
    title: 'Madrassah Floor',
    text: 'View the madrassah floor development.',
    to: '/projects/madrassah-floor',
    icon: School,
  },
];

export default function MasjidExtensionPage() {
  const railRef = useRef(null);

  const scrollTiles = (direction) => {
    railRef.current?.scrollBy({
      left: direction * Math.min(440, railRef.current.clientWidth * 0.8),
      behavior: 'smooth',
    });
  };

  return (
    <div className="extension-hub-page">
      <div className="extension-hub-heading">
        <div>
          <p>Masjid Extension</p>
          <h1>Explore the project</h1>
        </div>
        <div className="extension-hub-controls" aria-label="Scroll project areas">
          <button type="button" onClick={() => scrollTiles(-1)} aria-label="Previous project area">
            <ArrowLeft size={18} />
          </button>
          <button type="button" onClick={() => scrollTiles(1)} aria-label="Next project area">
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div className="extension-hub-rail" ref={railRef}>
        {extensionAreas.map(({ title, text, to, icon: Icon }, index) => (
          <Link
            key={to}
            to={to}
            className={index === 0 ? 'extension-hub-tile is-featured' : 'extension-hub-tile'}
          >
            <span className="extension-hub-icon">
              <Icon size={24} />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
            <span className="extension-hub-open">
              Open <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
