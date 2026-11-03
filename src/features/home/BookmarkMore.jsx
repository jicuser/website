import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

/** Secondary content stays available without making the bookmark's opening screen long. */
export default function BookmarkMore({ enabled, children }) {
  const panel = useRef(null);
  const { hash } = useLocation();
  useEffect(() => {
    if (!enabled || hash !== '#live' || !panel.current) return undefined;
    panel.current.open = true;
    const frame = requestAnimationFrame(() => document.getElementById('live')?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [enabled, hash]);
  if (!enabled) return <>{children}</>;
  return (
    <details ref={panel} id="jic-bookmark-more" className="jic-bookmark-more">
      <summary><span>More from JIC <small>Services, updates & contact</small></span><ChevronDown size={18} aria-hidden="true" /></summary>
      <div className="jic-bookmark-more-content">
        <nav className="jic-bookmark-help" aria-label="Prayer shortcuts"><Link to="/prayer-times">Full timetable</Link><Link to="/prayer-times/reminders">Salah alerts</Link></nav>
        {children}
        <nav className="jic-bookmark-help" aria-label="Contact and privacy">
          <Link to="/contact">Contact the centre</Link><Link to="/privacy">Privacy</Link>
        </nav>
      </div>
    </details>
  );
}
