import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import { fullDate, seasonDays } from '@/lib/bookingCalendar';
import SponsorshipMonth from './SponsorshipMonth';
import SponsorshipKey from './SponsorshipKey';
import MealSummary from './MealSummary';
import useRamadanCalendar from './useRamadanCalendar';
import {
  RAMADAN_KINDS,
  RAMADAN_PATHS,
  canSponsorDay,
  ramadanDay,
  ramadanOpen,
  ramadanStatus,
} from './model';

const mealNames = { iftar: 'Iftar', suhoor: 'Suhoor' };
export default function MealBookingPage({ initialKind = null }) {
  const state = useRamadanCalendar(true),
    season = state.data?.season;
  const { getContent } = useContent();
  const days = useMemo(() => seasonDays(season), [season]);
  const [kind, setKind] = useState(initialKind || 'iftar');
  const [selected, setSelected] = useState('');
  const [review, setReview] = useState(null);
  const [name, setName] = useState(''),
    [contact, setContact] = useState('');
  const [showName, setShowName] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(''),
    [receipt, setReceipt] = useState('');
  const key = useRef(crypto.randomUUID()),
    heading = useRef(null);
  const choices = Object.keys(mealNames).filter(
    (value) => ramadanOpen(state.data, value) && isPageVisible(getContent, RAMADAN_PATHS[value]),
  );
  const offer = ramadanDay(state.data, kind, selected);
  const bookable =
    !!selected && choices.includes(kind) && canSponsorDay(state.data, kind, selected);
  const price = offer.price_pence ?? season?.[`${kind}_target_pence`] ?? 0;
  useEffect(() => {
    setSelected('');
    setReview(null);
    setReceipt('');
    setError('');
  }, [season?.id, season?.start_date, initialKind]);
  useEffect(() => {
    if (initialKind) setKind(initialKind);
  }, [initialKind]);
  useEffect(() => {
    if (!state.loading && choices.length && !choices.includes(kind)) setKind(choices[0]);
  }, [state.loading, choices.join(','), kind]);
  useEffect(() => {
    setReview(null);
    key.current = crypto.randomUUID();
  }, [selected, kind]);
  useEffect(() => {
    if (
      review &&
      (!bookable || review.version !== (offer.offer_version || 0) || review.price !== price)
    ) {
      setReview(null);
      if (bookable) setError('Meal details changed. Please review the updated menu and price.');
    }
  }, [bookable, offer.offer_version, price, review]);
  function selectDay(date) {
    setSelected(date);
    setReview(null);
    setError('');
    requestAnimationFrame(() => {
      heading.current?.scrollIntoView({ block: 'nearest' });
      heading.current?.focus({ preventScroll: true });
    });
  }
  async function submit(event) {
    event.preventDefault();
    if (busy || !bookable || !review) return;
    setBusy(true);
    setError('');
    try {
      const email = contact.includes('@') ? contact.trim() : '';
      const result = await supabase.functions.invoke('ramadan-request', {
        body: {
          season_id: season.id,
          kind,
          dates: [selected],
          sponsor_name: name.trim(),
          phone: email ? '' : contact.trim(),
          email,
          amount_pence: review.price,
          offer_versions: { [selected]: review.version },
          show_name: showName,
          consent: true,
          request_key: key.current,
        },
      });
      if (result.error) {
        let message = 'Your request was not saved. Please try again.';
        try {
          message = (await result.error.context.json()).error || message;
        } catch {}
        throw new Error(message);
      }
      if (!result.data?.reference)
        throw new Error('The receipt could not be confirmed. Please try again.');
      setReceipt(result.data.reference);
    } catch (failure) {
      setError(failure.message);
      setReview(null);
    } finally {
      state.refresh();
      setBusy(false);
    }
  }
  return (
    <div className="booking-workspace sponsorship-page meal-booking-page">
      <header className="meal-page-heading">
        <div>
          <span className="sponsorship-eyebrow">RAMADAN · GIVE TOGETHER</span>
          <h1>{initialKind ? RAMADAN_KINDS[initialKind] : 'Ramadan meals'}</h1>
          <p>Choose a date, explore the menu and sponsor a meal.</p>
        </div>
        {ramadanOpen(state.data, 'daily') && isPageVisible(getContent, RAMADAN_PATHS.daily) && (
          <Link className="booking-button" to={RAMADAN_PATHS.daily}>
            Daily Giving
          </Link>
        )}
      </header>
      {state.error && (
        <p role="alert">
          {state.error}{' '}
          <button className="booking-button" onClick={state.refresh}>
            Try again
          </button>
        </p>
      )}
      {state.loading && !season && <p role="status">Loading sponsorships…</p>}
      {!state.loading && !state.error && !season && (
        <section className="booking-panel">
          <h2>Meal bookings coming soon</h2>
          <p>The centre will share confirmed dates and menus here.</p>
        </section>
      )}
      {season && !choices.length && (
        <section className="booking-panel">
          <h2>Bookings are closed</h2>
          <p>Meal sponsorships will appear here when bookings reopen.</p>
        </section>
      )}
      {season && choices.length > 0 && (
        <div className={`meal-workspace ${selected ? 'has-selected-day' : ''}`}>
          <section className="booking-panel meal-calendar">
            <div className="sponsorship-days-heading">
              <h2>
                <CalendarDays size={19} aria-hidden="true" />
                Choose a date
              </h2>
              <span>{mealNames[kind]} availability</span>
            </div>
            <SponsorshipMonth
              days={days}
              kind={kind}
              selected={selected}
              onSelect={selectDay}
              disabled={busy || !!receipt}
              dayInfo={(date) => ramadanDay(state.data, kind, date)}
              help="Tap a date to see Iftar and Suhoor. Numbers are Ramadan days; dates are UK dates."
            />
            <SponsorshipKey kind={kind} />
          </section>
          {receipt ? (
            <section className="booking-panel" role="status">
              <h2>Booking request received</h2>
              <p>The team will contact you to confirm your sponsorship and arrange payment.</p>
              <strong>{receipt}</strong>
              <div className="booking-actions">
                <button
                  onClick={() => {
                    setReceipt('');
                    setSelected('');
                    setReview(null);
                    setError('');
                    key.current = crypto.randomUUID();
                  }}
                >
                  Sponsor another meal
                </button>
              </div>
            </section>
          ) : (
            <section className="booking-panel meal-selected" aria-label="Selected meal">
              {selected && (
                <button
                  type="button"
                  className="booking-button meal-change-date"
                  disabled={busy}
                  onClick={() => {
                    setSelected('');
                    setReview(null);
                  }}
                >
                  Change date
                </button>
              )}
              <h2 ref={heading} tabIndex={-1}>
                {selected ? fullDate(selected) : 'Choose your date first'}
              </h2>
              {selected ? (
                <>
                  <div className="booking-choices meal-kind-choice" role="group" aria-label="Meal">
                    {choices.map((value) => {
                      const Icon = value === 'iftar' ? Moon : Sun;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={kind === value}
                          disabled={busy}
                          onClick={() => {
                            setKind(value);
                            setError('');
                          }}
                        >
                          <Icon size={18} aria-hidden="true" />
                          {mealNames[value]}
                        </button>
                      );
                    })}
                  </div>
                  <MealSummary offer={offer} fallbackPrice={price} />
                  {!bookable && (
                    <p className="meal-availability">
                      {ramadanStatus(kind, offer.status)} · Please choose another meal or date.
                    </p>
                  )}
                  {review && bookable ? (
                    <form className="meal-request" onSubmit={submit}>
                      <div className="booking-fields">
                        <label className="booking-field">
                          Your name
                          <input
                            required
                            minLength={2}
                            maxLength={120}
                            autoComplete="name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            disabled={busy}
                          />
                        </label>
                        <label className="booking-field">
                          Phone or email
                          <input
                            required
                            maxLength={254}
                            value={contact}
                            onChange={(event) => setContact(event.target.value)}
                            disabled={busy}
                          />
                        </label>
                      </div>
                      <label className="ramadan-check">
                        <input
                          type="checkbox"
                          checked={showName}
                          onChange={(event) => setShowName(event.target.checked)}
                          disabled={busy}
                        />
                        Show my name on the sponsorship board
                      </label>
                      <div className="booking-actions">
                        <button className="primary" disabled={busy || state.loading}>
                          {busy ? 'Sending…' : 'Request sponsorship'}
                        </button>
                        <button type="button" disabled={busy} onClick={() => setReview(null)}>
                          Back to menu
                        </button>
                      </div>
                      <small>The team will arrange confirmation and payment.</small>
                    </form>
                  ) : (
                    <div className="booking-actions">
                      <button
                        className="primary"
                        disabled={!bookable || busy || state.loading}
                        onClick={() => setReview({ version: offer.offer_version || 0, price })}
                      >
                        Book this meal
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p>
                  Tap a day in the month view to see dishes, prices and how many people the meal
                  will feed.
                </p>
              )}
              {error && <p role="alert">{error}</p>}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
