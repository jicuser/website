import React from 'react';
import { MoonStar } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { EID_ANNOUNCEMENT_KEY, publishedEidAnnouncement } from '@/lib/eidAnnouncement';
import '@/styles/eid-announcement.css';

export default function EidAnnouncement() {
  const { getContent } = useContent();
  const announcement = publishedEidAnnouncement(getContent(EID_ANNOUNCEMENT_KEY, ''));
  if (!announcement) return null;
  return (
    <aside className="jic-eid-announcement" aria-label="Eid announcement">
      <MoonStar size={22} aria-hidden="true" />
      <div>
        <strong>{announcement.title}</strong>
        <p>{announcement.message}</p>
      </div>
    </aside>
  );
}
