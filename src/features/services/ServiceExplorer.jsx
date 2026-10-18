import React, { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Gift,
  GraduationCap,
  Heart,
  HeartHandshake,
  Search,
  Sparkles,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import MosqueSymbol from '@/components/icons/MosqueSymbol';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import { filterServices, getVisibleServices, SERVICE_CATEGORIES } from './catalog';
import '@/styles/services.css';

const icons = {
  mosque: MosqueSymbol,
  book: BookOpen,
  graduation: GraduationCap,
  heart: Heart,
  support: HeartHandshake,
  calendar: CalendarDays,
  sparkles: Sparkles,
  users: Users,
  giving: Gift,
  account: UserCircle,
};

/** One CMS-aware service finder, shared by the homepage and full directory. */
export default function ServiceExplorer({ compact = false }) {
  const { getContent } = useContent();
  const instanceId = useId();
  const searchRef = useRef(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const visibleServices = getVisibleServices(getContent);
  const categories = SERVICE_CATEGORIES.filter(
    ({ id }) => id === 'all' || visibleServices.some((service) => service.category === id),
  );
  const activeCategory = categories.some(({ id }) => id === category) ? category : 'all';
  const results = filterServices({ category: activeCategory, query, getContent });
  const hasFilters = activeCategory !== 'all' || query.trim().length > 0;
  const displayedServices = compact && !hasFilters && !showAll ? results.slice(0, 6) : results;
  const isLimited = displayedServices.length < results.length;
  const directoryVisible = isPageVisible(getContent, '/services');
  const contactVisible = isPageVisible(getContent, '/contact');
  const Heading = compact ? 'h2' : 'h1';
  const headingId = `${instanceId}-heading`;
  const searchId = `${instanceId}-search`;
  const resultsId = `${instanceId}-results`;

  function clearSearch() {
    setQuery('');
    searchRef.current?.focus();
  }

  function resetFilters() {
    setQuery('');
    setCategory('all');
    searchRef.current?.focus();
  }

  return (
    <section
      className={`service-explorer ${compact ? 'service-explorer--compact' : 'service-explorer--full'}`}
      aria-labelledby={headingId}
      id={compact ? undefined : 'service-finder'}
    >
      <header className="service-explorer-header">
        <div className="service-explorer-intro">
          <p className="service-explorer-eyebrow">
            <span aria-hidden="true" />{' '}
            {compact ? 'Life at JIC' : 'Jamatia Islamic Centre · Services'}
          </p>
          <Heading id={headingId} className="service-explorer-title">
            {compact ? (
              'Find your next step.'
            ) : (
              <>
                Faith, learning <span>&amp; life together.</span>
              </>
            )}
          </Heading>
          <p className="service-explorer-description">
            {compact
              ? 'A place to pray, a chance to learn, a community to turn to. Find what you need at JIC.'
              : 'From daily prayers to life’s important moments, find the right service and a clear next step.'}
          </p>
          {!compact && (
            <a className="service-explorer-primary" href="#choose-service">
              Find your service <ArrowRight size={18} aria-hidden="true" />
            </a>
          )}
        </div>
        {!compact && (
          <figure className="service-explorer-photo">
            <img
              src="/optimized/jic-aerial-sunset.webp"
              alt="Jamatia Islamic Centre in the Sparkhill neighbourhood of Birmingham"
              width="1280"
              height="720"
            />
            <figcaption>
              <span aria-hidden="true">
                <MosqueSymbol className="service-explorer-photo-icon" />
              </span>
              <span>
                Jamatia Islamic Centre<small>Sparkhill, Birmingham</small>
              </span>
            </figcaption>
          </figure>
        )}
      </header>

      <div className="service-explorer-controls" id={compact ? undefined : 'choose-service'}>
        <div className="service-explorer-search-row">
          {!compact && <h2 className="service-explorer-subtitle">How can we help?</h2>}
          <div className="service-explorer-search">
            <label className="sr-only" htmlFor={searchId}>
              Search services
            </label>
            <Search size={19} aria-hidden="true" />
            <input
              ref={searchRef}
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What can we help you find?"
              aria-controls={resultsId}
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={clearSearch} aria-label="Clear service search">
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <div className="service-explorer-categories" role="group" aria-label="Filter services">
          {categories.map(({ id, label }) => {
            const count =
              id === 'all'
                ? visibleServices.length
                : visibleServices.filter((service) => service.category === id).length;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={activeCategory === id}
                onClick={() => setCategory(id)}
              >
                {label}
                <span aria-hidden="true">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p
        className="service-explorer-result-count"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {isLimited
          ? `Showing ${displayedServices.length} of ${results.length} services`
          : `${results.length} ${results.length === 1 ? 'service' : 'services'}${hasFilters ? ' found' : ''}`}
      </p>
      <div id={resultsId}>
        {displayedServices.length ? (
          <div className="service-explorer-grid">
            {displayedServices.map((service) => {
              const Icon = icons[service.icon];
              const titleId = `${instanceId}-${service.id}`;
              return (
                <Link
                  key={service.id}
                  to={service.to}
                  className={`service-explorer-card ${service.id === 'prayer' ? 'service-explorer-card--prayer' : ''}`}
                  aria-labelledby={titleId}
                >
                  <div className="service-explorer-card-top" aria-hidden="true">
                    <span className="service-explorer-card-icon">
                      <Icon />
                    </span>
                    <ArrowUpRight size={20} className="service-explorer-card-arrow" />
                  </div>
                  <p className="service-explorer-card-eyebrow">{service.eyebrow}</p>
                  <h3 id={titleId}>{service.title}</h3>
                  <p className="service-explorer-card-description">{service.description}</p>
                  <span className="service-explorer-card-action">
                    {service.action} <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="service-explorer-empty">
            <Search size={28} aria-hidden="true" />
            <h3>
              {visibleServices.length ? 'No matching services.' : 'No services are listed here.'}
            </h3>
            <p>
              {visibleServices.length
                ? 'Try a shorter search or choose another category.'
                : 'Please contact the centre for help with your enquiry.'}
            </p>
            {hasFilters && (
              <button type="button" onClick={resetFilters}>
                Clear search and filters
              </button>
            )}
          </div>
        )}
      </div>

      <footer className="service-explorer-footer">
        {contactVisible && (
          <p>
            Unsure where to begin?{' '}
            <Link to="/contact">
              Ask the centre <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </p>
        )}
        {compact && directoryVisible && (
          <Link className="service-explorer-view-all" to="/services">
            View all services <ArrowRight size={17} aria-hidden="true" />
          </Link>
        )}
        {compact && !directoryVisible && isLimited && (
          <button
            className="service-explorer-view-all"
            type="button"
            onClick={() => setShowAll(true)}
          >
            Show all services <ArrowRight size={17} aria-hidden="true" />
          </button>
        )}
        {!compact && (
          <small>
            Enquiries are a first step. The centre confirms dates and arrangements directly.
          </small>
        )}
      </footer>
    </section>
  );
}
