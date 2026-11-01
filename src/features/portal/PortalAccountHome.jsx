import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, Heart, Wallet } from 'lucide-react';
import DashboardBoard from '@/features/dashboard/DashboardBoard';
const RECORDS = [
  { id: 'invoices', icon: Wallet, name: 'My invoices', description: 'Invoices and payments shared with you.', to: '/account/invoices' },
  { id: 'certificates', icon: Award, name: 'My certificates', description: 'Certificates shared by the centre.', to: '/account/certificates' },
  { id: 'fundraising', icon: Heart, name: 'My fundraising', description: 'Start or manage your fundraiser for JIC.', to: '/fundraise/new' },
];
export default function PortalAccountHome({ auth, onSignOut }) {
  return <main className="portal-account-home" aria-label="Portal home">
    <section className="portal-welcome"><p className="workspace-kicker">Your JIC home</p><h2>Welcome{auth.profile.display_name ? `, ${auth.profile.display_name}` : ''}</h2><p>Your records, account and connection to the centre.</p></section>
    <DashboardBoard scope="portal" auth={auth} items={RECORDS} title="Your records" />
    <section className="portal-home-links" aria-labelledby="portal-centre-title"><h3 id="portal-centre-title">Around the centre</h3><nav aria-label="Centre links"><Link to="/prayer-times">Prayer times <ArrowRight size={16} aria-hidden="true" /></Link><Link to="/education">Courses & classes <ArrowRight size={16} aria-hidden="true" /></Link><Link to="/services">Services & bookings <ArrowRight size={16} aria-hidden="true" /></Link></nav></section>
    <footer className="portal-home-help"><Link to="/account/request">Need help with your account?</Link><button type="button" onClick={onSignOut}>Sign out</button></footer>
  </main>;
}
