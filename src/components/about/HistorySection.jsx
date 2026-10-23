import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ManagedPageContent from '@/components/ManagedPageContent';

export default function HistorySection() {
  return (
    <div className="about-history-story">
      <div className="about-section-intro">
        <p className="about-eyebrow">From the beginning</p>
        <ManagedPageContent
          pagePath="/about/history"
          className="is-unframed"
          headingLevel={2}
          fallbackTitle="Built around our community."
          fallbackBody="From our founding members to the community we serve today."
        />
        <Link className="about-text-link" to="/about#team">
          Meet our founder members <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <ol className="about-timeline">
        <li>
          <span>1979</span>
          <div>
            <h3>Our founder members begin</h3>
            <p>The founder members began Jamatia Islamic Centre.</p>
          </div>
        </li>
        <li>
          <span>1981</span>
          <div>
            <h3>The centre is established</h3>
            <p>A home for worship and community life.</p>
          </div>
        </li>
        <li>
          <span>Today</span>
          <div>
            <h3>The story continues</h3>
            <p>Prayer, learning and care in Sparkhill.</p>
            <Link className="about-text-link" to="/projects">
              Explore the masjid project <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </li>
      </ol>
    </div>
  );
}
