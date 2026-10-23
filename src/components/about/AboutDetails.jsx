import React, { Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

/** Keep long records and external frames out of the initial page. */
export default function AboutDetails({ label, anchors, children }) {
  const { hash } = useLocation();
  const requested = anchors.includes(hash.slice(1));
  const [open, setOpen] = useState(requested);
  useEffect(() => {
    if (requested) setOpen(true);
  }, [hash, requested]);
  return (
    <details className="about-details" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        {label} <ChevronDown size={18} aria-hidden="true" />
      </summary>
      {open && (
        <div className="about-details-content">
          <Suspense
            fallback={
              <p role="status" className="about-empty">
                Loading details…
              </p>
            }
          >
            {children}
          </Suspense>
        </div>
      )}
    </details>
  );
}
