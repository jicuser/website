import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Moon, Sun, Heart } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import { seasonDays } from '@/lib/bookingCalendar';
import useRamadanCalendar from './useRamadanCalendar';
import {
  RAMADAN_KINDS,
  RAMADAN_PATHS,
  canSponsorDay,
  ramadanSettings,
  ramadanOpen,
  ramadanDay,
} from './model';
import '@/styles/ramadan.css';
const icons = { iftar: Moon, suhoor: Sun, daily: Heart };
export default function HomeRamadan() {
  const { data } = useRamadanCalendar(true),
    { getContent } = useContent();
  const options = ramadanSettings(data),
    season = data?.season;
  if (
    !season ||
    !options.home_enabled ||
    !options.website_enabled ||
    !isPageVisible(getContent, '/ramadan')
  )
    return null;
  const days = seasonDays(season),
    choices = Object.entries(RAMADAN_KINDS).filter(
      ([kind]) => ramadanOpen(data, kind) && isPageVisible(getContent, RAMADAN_PATHS[kind]),
    );
  if (!choices.length) return null;
  return (
    <section className="home-sponsorships" aria-label="Ramadan meal sponsorships">
      <header>
        <div>
          <span className="sponsorship-eyebrow">RAMADAN · GIVE TOGETHER</span>
          <h2>Sponsor a meal. Share the reward.</h2>
        </div>
        <Link to="/ramadan">
          View sponsorships <ArrowRight size={17} />
        </Link>
      </header>
      <div className="home-sponsorship-options">
        {choices.map(([kind, label]) => {
          const Icon = icons[kind],
            available = days.filter((day) => canSponsorDay(data, kind, day.date)).length;
          return (
            <Link key={kind} to={RAMADAN_PATHS[kind]} className="home-sponsorship-card">
              <Icon size={25} />
              <strong>{label}</strong>
              <span>
                {available} {kind === 'daily' ? 'days open' : 'days available'}
              </span>
              {options.home_layout === 'days' && (
                <span className="home-sponsorship-days" aria-hidden="true">
                  {days.map((day) => (
                    <i key={day.date} data-status={ramadanDay(data, kind, day.date).status}>
                      {day.number}
                    </i>
                  ))}
                </span>
              )}
              <b>
                Choose your day <ArrowRight size={16} />
              </b>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
