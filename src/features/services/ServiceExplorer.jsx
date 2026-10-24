import React, { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  BookOpen,
  Briefcase,
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
import GuidancePanel from '@/features/guidance/GuidancePanel';
import { HUB_PRIMARY_IDS } from './catalog';
import '@/styles/services.css';

const icons = {
  mosque: MosqueSymbol,
  book: BookOpen,
  briefcase: Briefcase,
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
  const visibleServices = getVisibleServices(getContent);
  const categories = SERVICE_CATEGORIES.filter(
    ({ id }) => id === 'all' || visibleServices.some((service) => service.category === id),
  );
  const activeCategory = categories.some(({ id }) => id === category) ? category : 'all';
  const results = filterServices({ category: activeCategory, query, getContent });
  const hasFilters = activeCategory !== 'all' || query.trim().length > 0;
  const displayedServices = compact
    ? visibleServices.filter(({ id }) => ['support', 'careers', 'adhkar', 'quran'].includes(id))
    : [...results].sort(
        (a, b) =>
          (HUB_PRIMARY_IDS.includes(a.id) ? HUB_PRIMARY_IDS.indexOf(a.id) : 99) -
          (HUB_PRIMARY_IDS.includes(b.id) ? HUB_PRIMARY_IDS.indexOf(b.id) : 99),
      );
  const directoryVisible = isPageVisible(getContent, '/services');
  const groups =
    compact || hasFilters
      ? [{ label: '', items: displayedServices }]
      : [
          {
            label: 'Community services',
            items: displayedServices.filter((service) => HUB_PRIMARY_IDS.includes(service.id)),
          },
          {
            label: 'Worship & prayer',
            items: displayedServices.filter(
              (service) => service.category === 'prayer' && !HUB_PRIMARY_IDS.includes(service.id),
            ),
          },
          {
            label: 'More at JIC',
            items: displayedServices.filter(
              (service) => service.category !== 'prayer' && !HUB_PRIMARY_IDS.includes(service.id),
            ),
          },
        ];
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

  if (compact && displayedServices.length === 0) return null;

  return (
    <section
      className={`service-explorer ${compact ? 'service-explorer--compact' : 'service-explorer--full'} ${!hasFilters ? 'is-browsing' : ''}`}
      aria-labelledby={headingId}
      id={compact ? undefined : 'service-finder'}
    >
      <header className="service-explorer-header">
        <div className="service-explorer-intro">
          <Heading id={headingId} className="service-explorer-title">
            {compact ? 'Find what you need' : 'Community Hub'}
          </Heading>
          {!compact && (
            <p className="service-explorer-description">Services, activities and support at JIC.</p>
          )}
        </div>
        {compact && directoryVisible && (
          <Link className="service-explorer-all-link" to="/services">
            Explore the Hub <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </header>

      {!compact && (
        <>
          <div className="service-explorer-controls" id={compact ? undefined : 'choose-service'}>
            <div className="service-explorer-search-row">
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
            {`${results.length} ${results.length === 1 ? 'service' : 'services'}${hasFilters ? ' found' : ''}`}
          </p>
        </>
      )}
      <div id={resultsId}>
        {displayedServices.length ? (
          groups
            .filter((group) => group.items.length)
            .map((group) => (
              <section className="service-explorer-group" key={group.label || 'results'}>
                {group.label && <h2>{group.label}</h2>}
                <div className="service-explorer-grid">
                  {group.items.map((service) => {
                    const Icon = icons[service.icon];
                    const titleId = `${instanceId}-${service.id}`;
                    return (
                      <Link
                        key={service.id}
                        to={service.to}
                        className={`service-explorer-card ${!HUB_PRIMARY_IDS.includes(service.id) ? 'service-explorer-card--resource' : ''}`}
                        aria-labelledby={titleId}
                      >
                        <span className="service-explorer-card-icon" aria-hidden="true">
                          <Icon />
                        </span>
                        <span className="service-explorer-card-copy">
                          <h3 id={titleId}>{service.title}</h3>
                          <span className="service-explorer-card-description">
                            {service.description}
                          </span>
                        </span>
                        <ChevronRight
                          className="service-explorer-card-arrow"
                          size={18}
                          aria-hidden="true"
                        />
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))
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

      {!compact && <GuidancePanel journeyId="hub" />}
      {!compact && contactVisible && !displayedServices.length && (
        <div className="service-explorer-footer">
          <p>
            Need help finding the right service?{' '}
            <Link to="/contact">
              Contact the centre <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
