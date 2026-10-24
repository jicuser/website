import React, { useState } from 'react';
import {
  ArrowRight,
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
  ['facilities', 'Facilities', Building2],
  ['examples', 'Decorated examples', ImageIcon],
  ['parking', 'Parking', Car],
];

function AreaPhotos({ area, details }) {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [failedPhotos, setFailedPhotos] = useState([]);
  const photos = details.photos.filter((item) => !failedPhotos.includes(item.url));
  const index = Math.min(selected, Math.max(0, photos.length - 1));
  const photo = photos[index];
  const Icon = icons[area.icon];
  const move = (direction) =>
    setSelected((index + direction + photos.length) % photos.length);
  const controls = photos.length > 1 && (
    <div className="nikah-photo-controls">
      <button type="button" onClick={() => move(-1)} aria-label={`Previous ${area.title} photo`}>
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <span aria-live="polite">
        {index + 1} / {photos.length}
      </span>
      <button type="button" onClick={() => move(1)} aria-label={`Next ${area.title} photo`}>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
  return (
    <article className={`nikah-venue-card ${photo ? 'has-photo' : 'awaiting-photo'}${area.id === 'kitchen' ? ' is-wide' : ''}`}>
      {photo ? (
        <button
          type="button"
          className="nikah-venue-photo"
          onClick={() => setExpanded(true)}
          aria-label={`Enlarge ${area.title} photo`}
        >
          <img src={photo.url} alt={photo.alt || area.title} loading="lazy" decoding="async"
            onError={() => setFailedPhotos((current) => [...current, photo.url])} />
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
        <span className="nikah-space-icon"><Icon size={25} strokeWidth={1.5} aria-hidden="true" /></span>
        <div className="nikah-space-description">
          <h3>{area.title}</h3>
          {details.description ? <p>{details.description}</p> : photo ? <p>Explore the space and photos</p> : null}
          {controls}
        </div>
        {photo && (
          <button type="button" className="nikah-space-open" aria-label={`View ${area.title} photos`}
            onClick={() => setExpanded(true)}>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        )}
      </div>
      {expanded && photo && (
        <ImageViewer image={{ ...photo, title: area.title }} onClose={() => setExpanded(false)}>
          {details.description && <p>{details.description}</p>}
          {controls}
        </ImageViewer>
      )}
    </article>
  );
}

export default function NikahVenue({ venue, selectedGroup, onGroupChange, headingRef }) {
  const [selected, setSelected] = useState('facilities');
  const available = groups.filter(([id]) =>
    NIKAH_AREAS.some((area) => area.group === id && venue[area.id].visible),
  );
  const requested = selectedGroup ?? selected;
  const group = available.some(([id]) => id === requested) ? requested : available[0]?.[0];
  if (!available.length) return null;
  return (
    <section id="facilities" className="nikah-venue" aria-labelledby="nikah-venue-title">
      <div className="nikah-venue-header">
        <h2 id="nikah-venue-title" ref={headingRef} tabIndex={-1}>At the masjid</h2>
        <p>Explore our spaces and facilities for your Nikah.</p>
        <div className="nikah-venue-switch" role="group" aria-label="Explore the venue">
          {available.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              aria-pressed={group === id}
              aria-controls="nikah-venue-content"
              onClick={() => (onGroupChange ? onGroupChange(id) : setSelected(id))}
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </div>
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
