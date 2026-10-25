import React from 'react';

/** A compact editorial introduction; actions and page content remain outside the heading. */
export default function PageHeading({ title, children, eyebrow, icon: Icon }) {
  return (
    <header className={`jic-page-heading${Icon ? ' has-symbol' : ''}`}>
      <div className="jic-page-heading-copy">
        {eyebrow && <p className="jic-page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="jic-page-intro">{children}</p>}
      </div>
      {Icon && (
        <span className="jic-page-symbol" aria-hidden="true">
          <Icon size={42} strokeWidth={1.25} />
        </span>
      )}
    </header>
  );
}
