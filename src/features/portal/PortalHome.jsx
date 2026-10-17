import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Heart,
  Mail,
  Users,
  Wallet,
} from 'lucide-react';
import { formatPortalDate, linkedStudents, portalSearch } from './model';

export default function PortalHome({ data, auth, params, areas, busy, failures }) {
  const family = linkedStudents(data, auth.user.id);
  const available = new Set(areas.map(([id]) => id));
  const destination = (tab) => {
    const search = portalSearch(params, tab);
    if (tab === 'forms') search.set('mine', 'true');
    return `/portal?${search}`;
  };
  const cards = [
    ...(available.has('family')
      ? [[Users, 'My family', 'Children, progress, attendance and meetings', destination('family')]]
      : []),
    [
      BookOpen,
      'My learning',
      'Classes, learning records and course materials',
      destination('learning'),
    ],
    [Mail, 'Forms & replies', 'Your submitted forms and available replies', destination('forms')],
    [Wallet, 'Fees & receipts', 'Charges and confirmed payment records', destination('fees')],
    [ClipboardList, 'My actions', 'Requests and tasks assigned to you', destination('tasks')],
    [
      Award,
      'My certificates',
      'Requests, guidance and issued JIC records',
      '/account/certificates',
    ],
    [
      CalendarDays,
      'Request a booking',
      'Check the hall calendar and make an enquiry',
      '/services/hall-booking',
    ],
    [Heart, 'Support JIC', 'Donate to the centre and its community work', '/donate'],
  ];
  const nextSessions = data.learning_sessions
    .filter(
      (row) =>
        Number.isFinite(Date.parse(row.starts_at)) && Date.parse(row.starts_at) >= Date.now(),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 4);
  const unread = data.user_notifications.filter((row) => !row.read_at).length;
  return (
    <>
      <section className="portal-welcome">
        <p className="workspace-kicker">JIC Portal</p>
        <h2>Welcome{auth.profile.display_name ? `, ${auth.profile.display_name}` : ''}</h2>
        <p>Your family, learning and requests in one place.</p>
        {!busy && !failures.includes('user_notifications') && (
          <Link to={destination('notifications')}>
            {unread ? `${unread} unread update${unread === 1 ? '' : 's'}` : 'View your updates'}{' '}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </section>
      <div className="portal-card-grid">
        {cards.map(([Icon, title, description, to]) => (
          <Link className="portal-area-card" to={to} key={title}>
            <Icon size={22} aria-hidden="true" />
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ))}
      </div>
      {!busy && family.length > 0 && (
        <p className="workspace-meta">
          {family.length} linked student{family.length === 1 ? '' : 's'}. Student details are shown
          in My family.
        </p>
      )}
      <section className="workspace-card">
        <h3>Upcoming classes</h3>
        {busy ? (
          <p role="status">Loading classes…</p>
        ) : failures.includes('learning_sessions') ? (
          <p>Class information is unavailable. Please refresh.</p>
        ) : !nextSessions.length ? (
          <p>No upcoming sessions are in the loaded schedule.</p>
        ) : (
          <ul className="portal-record-list">
            {nextSessions.map((session) => (
              <li key={session.id}>
                <span>
                  <strong>{session.title}</strong>
                  <small>{formatPortalDate(session.starts_at)}</small>
                </span>
                <Link to={destination('learning')}>Learning</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
