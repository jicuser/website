import React from 'react';
import { seasonDays } from '@/lib/bookingCalendar';
import useRamadanCalendar from './useRamadanCalendar';
import { RAMADAN_COLOURS, ramadanDay, ramadanStatus, ramadanSettings } from './model';
import '@/styles/ramadan.css';

export default function RamadanBoard({ kind = 'iftar', portrait = false }) {
  const state = useRamadanCalendar(true),
    season = state.data?.season;
  const options = ramadanSettings(state.data);
  const heading =
    kind === 'daily'
      ? 'Daily Giving'
      : kind === 'suhoor'
        ? 'Suhoor meal sponsorships'
        : 'Iftar meal sponsorships';
  if (!options.tv_enabled || options[`${kind}_enabled`] === false)
    return (
      <section className="ramadan-board ramadan-board-status">
        <strong>Jamatia Islamic Centre</strong>
      </section>
    );
  return (
    <section className={`ramadan-board ${portrait ? 'is-portrait' : ''}`} aria-label={heading}>
      {season ? (
        <>
          <header className="ramadan-board-heading">
            <h2>{heading}</h2>
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
                      (Number(row.confirmed) > 0
                        ? 'Anonymous sponsor'
                        : row.status === 'closed'
                          ? ''
                          : row.status === 'pending'
                            ? 'Booking requested'
                            : 'Sponsorship available')}
                  </small>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="ramadan-board-status">
          {state.loading
            ? 'Loading sponsorships…'
            : state.error
              ? 'Sponsorships unavailable. Reconnecting…'
              : 'Ramadan meal sponsorships'}
        </div>
      )}
    </section>
  );
}
