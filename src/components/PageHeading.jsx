import React from 'react';

export default function PageHeading({ title, children }) {
  return (
    <header className="jic-page-heading">
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}
