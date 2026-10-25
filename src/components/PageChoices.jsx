import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { pageName } from '@/content/pageDirectory';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import { navigationName } from '@/lib/navigationConfiguration';

export default function PageChoices({ items, label }) {
  const { getContent } = useContent();
  const visibleItems = items.filter(({ path }) => isPageVisible(getContent, path));
  if (!visibleItems.length) return null;
  return (
    <nav className="jic-page-choices" aria-label={label}>
      {visibleItems.map(({ path, title, description, icon: Icon, featured }) => (
        <Link key={path} to={path} className={`jic-page-choice${featured ? ' is-featured' : ''}`}>
          {Icon && (
            <span className="jic-page-choice-symbol" aria-hidden="true">
              <Icon size={24} strokeWidth={1.5} />
            </span>
          )}
          <span className="jic-page-choice-copy">
            <strong>{title || navigationName(getContent, path, pageName(path))}</strong>
            {description && <span>{description}</span>}
          </span>
          <ChevronRight className="jic-page-choice-arrow" size={18} aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
