import React, { useEffect, useState } from 'react';
import { Eye, Plus, Trash2, Utensils } from 'lucide-react';
import { fullDate } from '@/lib/bookingCalendar';
import { toPence } from '@/features/operations/model';
import MealSummary from './MealSummary';

const draftOf = (offer) => ({
  enabled: offer?.enabled !== false,
  menu_title: offer?.menu_title || '',
  dishes: (offer?.dishes || []).map((dish) => ({
    name: dish.name,
    cost: dish.cost_pence == null ? '' : String(dish.cost_pence / 100),
  })),
  price: offer?.price_pence ? String(offer.price_pence / 100) : '',
  people: offer?.people_fed || '',
  menu_notes: offer?.menu_notes || '',
  expected_version: offer?.offer_version || 0,
});
export default function MealDayEditor({
  seasonId,
  day,
  kind,
  offer,
  busy,
  onSave,
  onClose,
  bookingEditor,
  bookingCount,
  headingRef,
  drafts,
  setDrafts,
  onKindChange,
}) {
  const [tab, setTab] = useState('menu'),
    [error, setError] = useState('');
  const slot = `${seasonId}:${day.date}:${kind}`;
  useEffect(() => {
    setTab('menu');
    setError('');
  }, [slot]);
  const draft = drafts[slot] || draftOf(offer);
  const patch = (values) => {
    setDrafts((current) => ({ ...current, [slot]: { ...draft, ...values } }));
    setError('');
  };
  function payload() {
    return {
      enabled: draft.enabled,
      menu_title: draft.menu_title,
      menu_notes: draft.menu_notes,
      dishes: draft.dishes.map((dish) => ({
        name: dish.name.trim(),
        cost_pence: dish.cost === '' ? null : toPence(dish.cost),
      })),
      price_pence: draft.price === '' ? null : toPence(draft.price),
      people_fed: draft.people === '' ? null : Number(draft.people),
      expected_version: draft.expected_version,
    };
  }
  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      const saved = await onSave(payload());
      if (saved)
        setDrafts((current) => {
          const next = { ...current };
          delete next[slot];
          return next;
        });
    } catch (failure) {
      setError(failure.message);
    }
  }
  let preview;
  try {
    preview = { ...payload(), offer_version: 1 };
  } catch {
    preview = null;
  }
  return (
    <section className="sponsorship-editor meal-day-editor" aria-label="Day meal settings">
      <div className="sponsorship-editor-heading">
        <div>
          <h3 ref={headingRef} tabIndex={-1}>
            {day.number} Ramadan · {kind === 'iftar' ? 'Iftar' : 'Suhoor'}
          </h3>
          <p>{fullDate(day.date)}</p>
        </div>
        <button type="button" className="booking-button" disabled={busy} onClick={onClose}>
          Change date
        </button>
      </div>
      <label className="booking-field">
        Selected meal
        <select value={kind} disabled={busy} onChange={(event) => onKindChange(event.target.value)}>
          <option value="iftar">Iftar</option>
          <option value="suhoor">Suhoor</option>
        </select>
      </label>
      <div className="booking-choices meal-kind-choice" role="group" aria-label="Day details">
        <button type="button" aria-pressed={tab === 'menu'} onClick={() => setTab('menu')}>
          <Utensils size={17} aria-hidden="true" />
          Menu & availability
        </button>
        <button type="button" aria-pressed={tab === 'booking'} onClick={() => setTab('booking')}>
          Bookings{bookingCount ? ` · ${bookingCount}` : ''}
        </button>
      </div>
      {tab === 'booking' ? (
        bookingEditor
      ) : (
        <form onSubmit={save}>
          <fieldset className="sponsorship-editor-fields" disabled={busy}>
            <label className="meal-availability-toggle">
              <span>
                <strong>Open for booking</strong>
                <small>
                  {draft.enabled ? 'Visitors can request this meal' : 'Closed to new requests'}
                </small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={draft.enabled}
                onChange={(event) => patch({ enabled: event.target.checked })}
              />
            </label>
            <label className="booking-field">
              Menu title
              <input
                maxLength={120}
                placeholder={kind === 'iftar' ? 'Community Iftar' : 'Suhoor meal'}
                value={draft.menu_title}
                onChange={(event) => patch({ menu_title: event.target.value })}
              />
            </label>
            <div className="meal-dish-editor" aria-label="Dishes">
              {draft.dishes.map((dish, index) => (
                <div className="meal-dish-row" key={index}>
                  <label className="booking-field">
                    {`Dish ${index + 1}`}
                    <input
                      required
                      maxLength={120}
                      value={dish.name}
                      onChange={(event) =>
                        patch({
                          dishes: draft.dishes.map((value, i) =>
                            i === index ? { ...value, name: event.target.value } : value,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="booking-field">
                    Cost (£)
                    <input
                      aria-label={`Dish ${index + 1} cost (£)`}
                      inputMode="decimal"
                      placeholder="Optional"
                      value={dish.cost}
                      onChange={(event) =>
                        patch({
                          dishes: draft.dishes.map((value, i) =>
                            i === index ? { ...value, cost: event.target.value } : value,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="booking-button"
                    aria-label={`Remove dish ${index + 1}`}
                    onClick={() => patch({ dishes: draft.dishes.filter((_, i) => i !== index) })}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="booking-button"
                disabled={draft.dishes.length >= 30}
                onClick={() => patch({ dishes: [...draft.dishes, { name: '', cost: '' }] })}
              >
                <Plus size={17} aria-hidden="true" />
                Add dish
              </button>
            </div>
            <div className="meal-price-fields">
              <label className="booking-field">
                Total meal price (£)
                <input
                  required={draft.enabled}
                  inputMode="decimal"
                  value={draft.price}
                  onChange={(event) => patch({ price: event.target.value })}
                />
              </label>
              <label className="booking-field">
                People fed
                <input
                  required={draft.enabled}
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  value={draft.people}
                  onChange={(event) => patch({ people: event.target.value })}
                />
              </label>
            </div>
            <button
              type="button"
              className="booking-button"
              disabled={!draft.dishes.length}
              onClick={() => {
                try {
                  patch({
                    price: String(
                      draft.dishes.reduce(
                        (sum, dish) => sum + (dish.cost ? toPence(dish.cost) : 0),
                        0,
                      ) / 100,
                    ),
                  });
                } catch (failure) {
                  setError(failure.message);
                }
              }}
            >
              Use dish total
            </button>
            <details className="meal-extra">
              <summary>Notes & visitor preview</summary>
              <label className="booking-field">
                Public meal notes
                <textarea
                  rows={2}
                  maxLength={1000}
                  placeholder="Dietary options or serving details"
                  value={draft.menu_notes}
                  onChange={(event) => patch({ menu_notes: event.target.value })}
                />
              </label>
              <p>
                <Eye size={16} aria-hidden="true" /> Visitor preview
              </p>
              {preview && <MealSummary offer={preview} />}
            </details>
            {bookingCount > 0 && (
              <p className="sponsorship-private-note">
                Existing bookings keep the menu and price agreed at booking.
              </p>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="booking-actions">
              <button className="primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save meal'}
              </button>
              <button
                type="button"
                disabled={!drafts[slot] || busy}
                onClick={() => {
                  setDrafts((current) => {
                    const next = { ...current };
                    delete next[slot];
                    return next;
                  });
                  setError('');
                }}
              >
                Undo edits
              </button>
              {drafts[slot] && <small>Unsaved menu</small>}
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
