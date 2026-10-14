import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { pageName } from '@/content/pageDirectory';

export default function PageChoices({ items, label }) {
  return (
    <nav className="jic-page-choices" aria-label={label}>
      {items.map(({ path, title, description, icon: Icon }) => (
        <Link key={path} to={path} className="jic-page-choice" data-glass="frosted">
          {Icon && <Icon className="jic-page-choice-icon" size={22} aria-hidden="true" />}
          <span>
            <strong>{title || pageName(path)}</strong>
            {description && <span>{description}</span>}
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
