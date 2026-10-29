import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import TodayPrayerSummary from '@/components/home/TodayPrayerSummary';
import '@/styles/app-experience.css';

export default function AppCompanion() {
  const [hidden, setHidden] = useState(false);
  const panel = useRef(null);
  useLayoutEffect(() => {
    const update = () =>
      document.documentElement.style.setProperty(
        '--jic-app-companion-height',
        `${Math.ceil(panel.current?.getBoundingClientRect().height || 0)}px`,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(panel.current);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--jic-app-companion-height');
    };
  }, []);
  return (
    <aside ref={panel} className="jic-app-companion" aria-label="Prayer times and search">
      <div className="jic-app-companion-tools">
        <button
          type="button"
          aria-controls="jic-app-salah"
          aria-expanded={!hidden}
          onClick={() => setHidden(!hidden)}
        >
          {hidden ? (
            <ChevronUp size={17} aria-hidden="true" />
          ) : (
            <ChevronDown size={17} aria-hidden="true" />
          )}
          {hidden ? 'Show Salah times' : 'Hide Salah times'}
        </button>
        <Link to="/search" aria-label="Search JIC">
          <Search size={20} aria-hidden="true" />
        </Link>
      </div>
      <div id="jic-app-salah" className="jic-app-salah" hidden={hidden}>
        <TodayPrayerSummary showLink={false} />
      </div>
    </aside>
  );
}
