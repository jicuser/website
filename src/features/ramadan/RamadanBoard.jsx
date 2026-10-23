import React from 'react';
import { seasonDays } from '@/lib/bookingCalendar';
import useRamadanCalendar from './useRamadanCalendar';
import { RAMADAN_COLOURS, ramadanDay, ramadanStatus } from './model';
import '@/styles/ramadan.css';

export default function RamadanBoard({ kind = 'iftar', portrait = false }) {
  const state = useRamadanCalendar(true),
    season = state.data?.season;
  return (
    <section
      className={`ramadan-board ${portrait ? 'is-portrait' : ''}`}
      aria-label={kind === 'daily' ? 'Daily Giving board' : 'Iftar sponsorship board'}
    >
      {season ? (
        <>
          <header className="ramadan-board-heading">
            <h2>{kind === 'daily' ? 'Daily Giving' : 'Iftar sponsorships'}</h2>
            <p>{season.title}</p>
          </header>
          <div className="ramadan-board-days">
            {seasonDays(season).map((day) => {
              const row = ramadanDay(state.data, kind, day.date);
              return (
                <article
                  className="ramadan-board-day"
                  key={day.date}
                  style={{ '--day-colour': RAMADAN_COLOURS[row.status] }}
                >
                  <strong>Day {day.number}</strong>
                  <span>
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {ramadanStatus(kind, row.status)}
                  </span>
                  <small>
                    {row.names?.join(', ') ||
                      (Number(row.confirmed) > 0 ? 'Anonymous sponsor' : 'Sponsorship available')}
                  </small>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="ramadan-board-status">
          {state.loading
            ? 'Loading Ramadan calendar…'
            : state.error
              ? 'Calendar unavailable. Reconnecting…'
              : 'The Ramadan calendar will appear when published.'}
        </div>
      )}
    </section>
  );
}
