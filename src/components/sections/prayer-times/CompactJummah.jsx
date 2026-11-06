import React from 'react';
import { displayTime } from '@/lib/timetable';
import { hasPublishedTime } from '@/lib/publishedTime';
import '@/styles/jummah-card.css';

export default function CompactJummah({ jummahTimes }) {
  const sessions = Array.isArray(jummahTimes) ? jummahTimes.filter(Boolean) : [];
  return (
    <section className="compact-jummah" aria-label="Jummah prayer times">
      <p className="compact-jummah__eyebrow">Every Friday</p>
      {sessions.length ? (
        <div className="compact-jummah__grid">
          {sessions.map((session, index) => (
            <article className="compact-jummah__session" key={index}>
              <h3>{session.name || `Jummah ${index + 1}`}</h3>
              <span className="compact-jummah__label">Jama’ah</span>
              <strong className="compact-jummah__time">
                {hasPublishedTime(session.prayer) ? displayTime(session.prayer) : 'Not published'}
              </strong>
              {hasPublishedTime(session.khutbah) && (
                <p className="compact-jummah__khutbah">
                  Khutbah <strong>{displayTime(session.khutbah)}</strong>
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p>Jummah times have not been published. Please contact the centre.</p>
      )}
      <p className="compact-jummah__note">Please arrive early for the khutbah.</p>
    </section>
  );
}
