import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Heart,
  HeartHandshake,
  Users,
} from 'lucide-react';
import { SERVICE_CARDS } from '@/content/serviceJourneys';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import CentreVisit from './CentreVisit';
import '@/styles/services.css';

const icons = {
  heart: HeartHandshake,
  rings: Heart,
  calendar: CalendarDays,
  award: Award,
  book: BookOpen,
  users: Users,
};
export default function ServicesOverview() {
  const { getContent } = useContent();
  return (
    <div className="service-page">
      <section className="service-hero">
        <div className="service-hero-copy">
          <p className="service-eyebrow">Alongside you, through life</p>
          <h1>Support starts here.</h1>
          <p>
            From learning and celebrations to difficult moments, find the right service and a clear
            next step.
          </p>
          <a href="#choose-service" className="service-button is-primary">
            Find your service <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
        <figure className="service-centre-photo">
          <img
            src="/optimized/jic-aerial-sunset.webp"
            alt="Jamatia Islamic Centre in Sparkhill, Birmingham"
            width="1280"
            height="720"
          />
          <figcaption>Your centre. Your community.</figcaption>
        </figure>
      </section>
      <section id="choose-service" className="service-section">
        <h2>What can we help with?</h2>
        <div className="service-directory">
          {SERVICE_CARDS.filter((item) => isPageVisible(getContent, item.to)).map((item) => {
            const Icon = icons[item.icon];
            return (
              <Link key={item.to} to={item.to}>
                <Icon size={26} aria-hidden="true" />
                <small>{item.label}</small>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span>
                  Explore service <ArrowRight size={17} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="service-account-strip">
        <div>
          <p className="service-eyebrow">Already part of JIC?</p>
          <h2>Your account, in one place.</h2>
          <p>Sign in for your available records, requests and certificates.</p>
        </div>
        <Link className="service-button" to="/portal">
          Portal login <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>
      <CentreVisit />
    </div>
  );
}
