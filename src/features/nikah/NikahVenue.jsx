import React, { useState } from 'react';
import {
  Building2,
  Car,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import ImageViewer from '@/components/ImageViewer';
import { NIKAH_AREAS } from './venue';

const icons = { hall: Building2, kitchen: ChefHat, decorations: Sparkles, parking: Car };
const groups = [
  ['facilities', 'Facilities'],
  ['examples', 'Decorated examples'],
  ['parking', 'Parking'],
];

function AreaPhotos({ area, details }) {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const index = Math.min(selected, Math.max(0, details.photos.length - 1));
  const photo = details.photos[index];
  const Icon = icons[area.icon];
  const move = (direction) =>
    setSelected((index + direction + details.photos.length) % details.photos.length);
  const controls = details.photos.length > 1 && (
    <div className="nikah-photo-controls">
      <button type="button" onClick={() => move(-1)} aria-label={`Previous ${area.title} photo`}>
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <span aria-live="polite">
        {index + 1} / {details.photos.length}
      </span>
      <button type="button" onClick={() => move(1)} aria-label={`Next ${area.title} photo`}>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
  return (
    <article className={`nikah-venue-card ${photo ? 'has-photo' : 'awaiting-photo'}`}>
      {photo ? (
        <button
          type="button"
          className="nikah-venue-photo"
          onClick={() => setExpanded(true)}
          aria-label={`Enlarge ${area.title} photo`}
        >
          <img src={photo.url} alt={photo.alt || area.title} loading="lazy" decoding="async" />
          <span>
            <ImageIcon size={15} aria-hidden="true" /> View photo
          </span>
        </button>
      ) : (
        <div className="nikah-venue-placeholder" aria-label={`${area.title}: photos to follow`}>
          <Icon size={28} aria-hidden="true" />
          <span>Photos to follow</span>
        </div>
      )}
      <div className="nikah-venue-copy">
        <h3>{area.title}</h3>
        {details.description && <p>{details.description}</p>}
        {controls}
      </div>
      {expanded && photo && (
        <ImageViewer image={{ ...photo, title: area.title }} onClose={() => setExpanded(false)}>
          {controls}
        </ImageViewer>
      )}
    </article>
  );
}

export default function NikahVenue({ venue }) {
  const [selected, setSelected] = useState('facilities');
  const available = groups.filter(([id]) =>
    NIKAH_AREAS.some((area) => area.group === id && venue[area.id].visible),
  );
  const group = available.some(([id]) => id === selected) ? selected : available[0]?.[0];
  if (!available.length) return null;
  return (
    <section id="facilities" className="nikah-venue" aria-labelledby="nikah-venue-title">
      <h2 id="nikah-venue-title">At the masjid</h2>
      <div className="nikah-venue-switch" role="group" aria-label="Explore the venue">
        {available.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={group === id}
            aria-controls="nikah-venue-content"
            onClick={() => setSelected(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div id="nikah-venue-content" className={`nikah-venue-grid nikah-venue-grid--${group}`}>
        {NIKAH_AREAS.filter((area) => area.group === group && venue[area.id].visible).map(
          (area) => (
            <AreaPhotos key={area.id} area={area} details={venue[area.id]} />
          ),
        )}
      </div>
      {group === 'examples' && (
        <p className="nikah-venue-note">
          Previous setups are shown for inspiration. Please confirm decoration arrangements with the
          team.
        </p>
      )}
      {group === 'parking' && (
        <p className="nikah-venue-note">
          Confirm parking and arrival arrangements for your date when booking.
        </p>
      )}
    </section>
  );
}
