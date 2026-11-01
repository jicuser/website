import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, CalendarDays, ClipboardList, Heart, Mail, Users, Wallet } from 'lucide-react';
import { formatPortalDate, linkedStudents, portalSearch } from './model';
import DashboardBoard from '@/features/dashboard/DashboardBoard';
export default function PortalHome({ data, auth, params, areas, busy, failures }) {
  const family = linkedStudents(data, auth.user.id), available = new Set(areas.map(([id]) => id));
  const destination = (tab) => { const search = portalSearch(params, tab); if (tab === 'forms') search.set('mine', 'true'); return `/portal?${search}`; };
  const cards = [
    ...(available.has('family') ? [{ id: 'family', icon: Users, name: 'My family', description: 'Children, progress and attendance', to: destination('family') }] : []),
    ...[['learning', BookOpen, 'My learning', 'Classes and course materials'], ['forms', Mail, 'Forms & replies', 'Your forms and available replies'], ['fees', Wallet, 'Fees & receipts', 'Charges and confirmed payments'], ['tasks', ClipboardList, 'My actions', 'Tasks assigned to you']].filter(([id]) => available.has(id)).map(([id, icon, name, description]) => ({ id, icon, name, description, to: destination(id) })),
    { id: 'certificates', icon: Award, name: 'My certificates', description: 'Certificates shared by the centre', to: '/account/certificates' },
    { id: 'booking', icon: CalendarDays, name: 'Request a booking', description: 'Hall availability and enquiries', to: '/services/hall-booking' },
    { id: 'donate', icon: Heart, name: 'Support JIC', description: 'Support community work', to: '/donate' },
  ];
  const sessions = data.learning_sessions.filter((row) => Number.isFinite(Date.parse(row.starts_at)) && Date.parse(row.starts_at) >= Date.now()).sort((a,b) => a.starts_at.localeCompare(b.starts_at)).slice(0,4);
  const unread = data.user_notifications.filter((row) => !row.read_at).length;
  return <>
    <section className="portal-welcome"><p className="workspace-kicker">JIC Portal</p><h2>Welcome{auth.profile.display_name ? `, ${auth.profile.display_name}` : ''}</h2><p>Your family, learning and requests in one place.</p>{!busy && !failures.includes('user_notifications') && <Link to={destination('notifications')}>{unread ? `${unread} unread update${unread === 1 ? '' : 's'}` : 'View your updates'} <ArrowRight size={16} aria-hidden="true" /></Link>}</section>
    <DashboardBoard scope="portal" auth={auth} items={cards} />
    {!busy && family.length > 0 && <p className="workspace-meta">{family.length} linked student{family.length === 1 ? '' : 's'}. Details are in My family.</p>}
    <section className="workspace-card"><h3>Upcoming classes</h3>{busy ? <p role="status">Loading classes…</p> : failures.includes('learning_sessions') ? <p>Class information is unavailable. Please refresh.</p> : !sessions.length ? <p>No upcoming classes are listed for your account.</p> : <ul className="portal-record-list">{sessions.map((session) => <li key={session.id}><span><strong>{session.title}</strong><small>{formatPortalDate(session.starts_at)}</small></span><Link to={destination('learning')}>Learning</Link></li>)}</ul>}</section>
  </>;
}
