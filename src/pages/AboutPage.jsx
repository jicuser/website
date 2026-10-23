import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Heart, Users } from 'lucide-react';
import AboutMasthead from '@/components/about/AboutMasthead';

export default function AboutPage() {
  return (
    <article className="about-page about-overview">
      <AboutMasthead
        title="A place for faith. A home for community."
        photo
        actions={
          <>
            <Link to="/contact">
              Plan your visit <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link to="/about/history">
              Our story <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </>
        }
      >
        <p>
          Jamatia Islamic Centre brings people together for worship, learning and service on
          Woodlands Road in Sparkhill, Birmingham.
        </p>
        <p>Our doors are open to people of all backgrounds.</p>
      </AboutMasthead>
      <dl className="about-date-strip" aria-label="JIC at a glance">
        <div>
          <dt>1979</dt>
          <dd>Founded by our members</dd>
        </div>
        <div>
          <dt>1981</dt>
          <dd>The centre established</dd>
        </div>
        <div>
          <dt>Woodlands Road</dt>
          <dd>Our home in Sparkhill</dd>
        </div>
      </dl>
      <section className="about-purpose" aria-labelledby="about-purpose-title">
        <div className="about-section-intro">
          <p className="about-eyebrow">Life at the centre</p>
          <h2 id="about-purpose-title">Faith, learning and care.</h2>
        </div>
        <div className="about-values">
          {[
            [
              Heart,
              'Worship',
              'A welcoming place for daily prayer, spiritual guidance and reflection.',
              '/prayer-times',
              'Prayer times',
            ],
            [
              BookOpen,
              'Learning',
              'Qur’an, Madrassah and Islamic learning for our community.',
              '/education',
              'Explore learning',
            ],
            [
              Users,
              'Community',
              'Practical support, kindness and opportunities to serve one another.',
              '/services',
              'Our services',
            ],
          ].map(([Icon, title, description, to, label]) => (
            <div key={title}>
              <Icon size={24} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{description}</p>
              <Link to={to}>
                {label} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      </section>
      <section className="about-directory" aria-labelledby="about-more-title">
        <div className="about-section-intro">
          <p className="about-eyebrow">Get to know JIC</p>
          <h2 id="about-more-title">People. Progress. Community.</h2>
        </div>
        <nav aria-label="Explore About JIC">
          {[
            ['/team', 'Meet the team', 'The people behind the centre'],
            ['/financial-history', 'Our finances', 'Annual income and expenditure'],
            ['/social-media', 'Stay connected', 'Talks, notices and community updates'],
            ['/projects', 'Our masjid project', 'Spaces, stages and published updates'],
          ].map(([to, name, detail]) => (
            <Link to={to} key={to}>
              <span>
                <strong>{name}</strong>
                <small>{detail}</small>
              </span>
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </section>
    </article>
  );
}
