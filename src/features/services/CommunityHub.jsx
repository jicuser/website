import React, { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Briefcase, Building2, ChevronRight, GraduationCap, Heart, HeartHandshake, Monitor, Radio, Search, Settings, Users, X } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { useAuth } from '@/context/AuthContext';
import { isPageVisible } from '@/lib/pageVisibility';
import { filterServices, getVisibleServices } from './catalog';
import { HUB_LAYOUT_KEY, buildHubCards, normaliseHubLayout } from './hubLayout';
import '@/styles/community-hub.css';

const icons = { book: BookOpen, briefcase: Briefcase, building: Building2, graduation: GraduationCap, heart: Heart, support: HeartHandshake, users: Users };
const categories = [['all', 'All services'], ['life-events', 'Life events'], ['learning', 'Learning'], ['prayer', 'Worship'], ['community', 'Community']];
const utilityIds = ['community', 'ramadan', 'giving', 'portal', 'prayer'];

/** A compact, real-data directory. Existing routes, access rules and services are retained. */
export default function CommunityHub() {
  const { getContent } = useContent();
  const { can } = useAuth();
  const id = useId();
  const search = useRef(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const layout = normaliseHubLayout(getContent(HUB_LAYOUT_KEY, ''));
  const visible = getVisibleServices(getContent);
  const cards = buildHubCards(visible, layout, (path) => isPageVisible(getContent, path));
  const activeCategory = cards.some((card) => card.category === category) ? category : 'all';
  const shown = cards.filter((card) => activeCategory === 'all' || card.category === activeCategory);
  const allowed = new Set([...cards.flatMap((card) => card.serviceIds), ...utilityIds]);
  const results = filterServices({ query, getContent }).filter((service) => allowed.has(service.id) && (activeCategory === 'all' || service.category === activeCategory));
  const searching = Boolean(query.trim());
  const utilities = utilityIds.map((key) => visible.find((service) => service.id === key)).filter(Boolean);
  const quick = [
    ['funerals', 'Janazah support', HeartHandshake],
    ['nikah', 'Plan a Nikah', Heart],
    ['giving', 'Support your masjid', HeartHandshake],
  ].map(([key, title, Icon]) => ({ service: visible.find((service) => service.id === key), title, Icon })).filter((item) => item.service);

  function reset() { setQuery(''); setCategory('all'); search.current?.focus(); }

  return (
    <section className="community-hub" aria-labelledby={`${id}-title`}>
      <header className="community-hub-hero">
        <span className="community-hub-kicker">Jamatia Islamic Centre</span>
        <h1 id={`${id}-title`}>Community Hub</h1>
        <p>Services, learning and support — together in one place.</p>
        <div className="community-hub-search">
          <Search size={20} aria-hidden="true" />
          <label className="sr-only" htmlFor={`${id}-search`}>Search services</label>
          <input ref={search} id={`${id}-search`} type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search services, classes, support…" aria-controls={`${id}-results`} />
          {query && <button type="button" onClick={reset} aria-label="Clear service search"><X size={18} /></button>}
        </div>
        {can('content') && <Link className="community-hub-manage" to="/admin?section=visibility"><Settings size={16} aria-hidden="true" /> Manage this Hub</Link>}
      </header>
      {layout.quickLinks && quick.length > 0 && (
        <nav className="community-hub-quick" aria-label="Quick service access">
          {quick.map(({ service, title, Icon }) => <Link key={service.id} to={service.to}><Icon size={21} aria-hidden="true" /><span>{title}</span><ChevronRight size={16} aria-hidden="true" /></Link>)}
        </nav>
      )}
      <div className="community-hub-content">
        <div className="community-hub-section-heading"><div><span className="community-hub-kicker">Explore JIC</span><h2>Find your place in the community</h2></div></div>
        <div className="community-hub-filters" role="group" aria-label="Filter services">
          {categories.filter(([key]) => key === 'all' || cards.some((card) => card.category === key)).map(([key, label]) => <button key={key} type="button" aria-pressed={activeCategory === key} onClick={() => setCategory(key)}>{label}</button>)}
        </div>
        <p className="community-hub-count" role="status" aria-live="polite" aria-atomic="true">{searching ? `${results.length} ${results.length === 1 ? 'service' : 'services'} found` : `${shown.length} ${shown.length === 1 ? 'area' : 'areas'} to explore`}</p>
        <div id={`${id}-results`}>
          {searching ? (
            <div className="community-hub-results">{results.map((service) => <Link key={service.id} to={service.to}><span><strong>{service.title}</strong><small>{service.description}</small></span><ArrowRight size={18} aria-hidden="true" /></Link>)}</div>
          ) : (
            <div className="community-hub-grid">{shown.map((card) => {
              const Icon = icons[card.icon] || BookOpen;
              return <Link key={card.id} to={card.to} className={`community-hub-card community-hub-tone-${card.tone}`} aria-label={card.title}>
                <span className="community-hub-art" aria-hidden="true"><Icon className="community-hub-art-icon" strokeWidth={1.1} />{card.image && <img key={card.image} src={card.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true; }} />}</span>
                <span className="community-hub-card-body"><span className="community-hub-card-icon" aria-hidden="true"><Icon size={21} /></span><span className="community-hub-card-copy"><strong>{card.title}</strong><small>{card.description}</small></span><ChevronRight className="community-hub-card-arrow" size={17} aria-hidden="true" /></span>
              </Link>;
            })}</div>
          )}
          {(searching ? !results.length : !shown.length) && <div className="community-hub-empty"><h3>{searching ? 'No matching services' : 'No services are currently listed'}</h3><p>{searching ? 'Try a shorter search or another category.' : 'Please contact the centre for help.'}</p>{(searching || activeCategory !== 'all') && <button type="button" onClick={reset}>Clear search and filters</button>}</div>}
        </div>
        <nav className="community-hub-utilities" aria-label="More at JIC">
          {utilities.map((service) => <Link key={service.id} to={service.to}>{service.id === 'community' ? 'Volunteer' : service.id === 'giving' ? 'Donate & fundraise' : service.id === 'portal' ? 'My Portal' : service.title}<ArrowRight size={15} aria-hidden="true" /></Link>)}
          {isPageVisible(getContent, '/radio') && <Link to="/radio"><Radio size={17} aria-hidden="true" /> JIC Radio</Link>}
          {isPageVisible(getContent, '/events') && <Link to="/events">What’s on <ArrowRight size={15} aria-hidden="true" /></Link>}
          {can('tv') && <Link to="/admin?section=tv"><Monitor size={17} aria-hidden="true" /> TV & live controls</Link>}
        </nav>
        {isPageVisible(getContent, '/contact') && <p className="community-hub-help">Not sure where to start? <Link to="/contact">Contact the centre <ArrowRight size={14} aria-hidden="true" /></Link></p>}
      </div>
    </section>
  );
}
