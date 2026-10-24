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
      {visibleItems.map(({ path, title, description, icon: Icon }) => (
        <Link key={path} to={path} className="jic-page-choice">
          {Icon && <Icon className="jic-page-choice-icon" size={22} aria-hidden="true" />}
          <span>
            <strong>{title || navigationName(getContent, path, pageName(path))}</strong>
            {description && <span>{description}</span>}
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
