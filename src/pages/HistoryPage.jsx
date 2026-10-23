import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import AboutMasthead from '@/components/about/AboutMasthead';
import ManagedPageContent from '@/components/ManagedPageContent';

export default function HistoryPage() {
  return (
    <article className="about-page about-history">
      <AboutMasthead eyebrow="Our story" photo>
        <ManagedPageContent
          className="is-unframed"
          fallbackTitle="Our History"
          fallbackBody="Founded by our members in 1979 and established in 1981, Jamatia Islamic Centre continues to serve its community through prayer, education and care."
        />
      </AboutMasthead>
      <section className="about-history-story" aria-labelledby="history-story-title">
        <div className="about-section-intro">
          <p className="about-eyebrow">From the beginning</p>
          <h2 id="history-story-title">Built around our community.</h2>
          <p>Two early milestones laid the foundations for the centre’s work today.</p>
          <Link className="about-text-link" to="/team">
            Meet our founder members <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <ol className="about-timeline">
          <li>
            <span>1979</span>
            <div>
              <h3>Our founder members begin</h3>
              <p>
                The founder members began Jamatia Islamic Centre, bringing the community together.
              </p>
            </div>
          </li>
          <li>
            <span>1981</span>
            <div>
              <h3>The centre is established</h3>
              <p>
                The centre was established, laying the foundation for its worship and community
                work.
              </p>
            </div>
          </li>
          <li>
            <span>Today</span>
            <div>
              <h3>The story continues</h3>
              <p>A place for prayer, Islamic learning and community life in Sparkhill.</p>
              <Link className="about-text-link" to="/projects">
                Explore the masjid project <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </li>
        </ol>
      </section>
    </article>
  );
}
