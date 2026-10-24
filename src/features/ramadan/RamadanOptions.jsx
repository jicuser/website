import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useContent } from '@/context/ContentContext';
import SimpleToggle from '@/components/admin/SimpleToggle';
import { RAMADAN_DEFAULTS } from './model';
import '@/styles/booking-calendars.css';

export default function RamadanOptions({ onChanged, hasSeason = true, publishedTitle = '' }) {
  const { refreshContent } = useContent();
  const [options, setOptions] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    supabase
      .from('ramadan_settings')
      .select('*')
      .eq('id', true)
      .single()
      .then(({ data, error: failure }) => {
        if (!active) return;
        if (failure) setError('Could not load sponsorship options.');
        else setOptions({ ...RAMADAN_DEFAULTS, ...data });
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(key, value) {
    if (busy || !options) return;
    setBusy(true);
    setError('');
    try {
      const { data, error: failure } = await supabase.rpc('save_ramadan_options', {
        p_body: { [key]: value },
      });
      if (failure || !data) throw new Error(failure?.message || 'The option was not saved.');
      setOptions({ ...RAMADAN_DEFAULTS, ...data });
      onChanged?.(data);
      await refreshContent();
      window.dispatchEvent(new Event('jic-content-updated'));
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="booking-panel sponsorship-options" aria-label="Sponsorship options">
      <h3>Booking &amp; display choices</h3>
      <p className="sponsorship-options-scope">
        {publishedTitle
          ? `Site-wide switches. Changes apply immediately to the published Ramadan: ${publishedTitle}.`
          : 'Site-wide switches. These choices apply when a Ramadan is published.'}
      </p>
      {!hasSeason && <p>Create a Ramadan in Setup before publishing these choices.</p>}
      {error && <p role="alert">{error}</p>}
      {!options && !error && <p role="status">Loading options…</p>}
      {options && (
        <>
          <fieldset className="sponsorship-option-group">
            <legend>What people can sponsor</legend>
            {[
              ['iftar_enabled', 'Iftar bookings'],
              ['suhoor_enabled', 'Suhoor bookings'],
              ['daily_enabled', 'Daily Giving'],
            ].map(([key, label]) => (
              <SimpleToggle
                key={key}
                label={label}
                checked={options[key]}
                disabled={busy}
                onChange={(value) => save(key, value)}
              />
            ))}
          </fieldset>
          <fieldset className="sponsorship-option-group">
            <legend>Where to show published sponsorships</legend>
            {[
              ['website_enabled', 'Ramadan page', 'Lets visitors request sponsorships.'],
              ['home_enabled', 'Show on homepage', 'Requires the Ramadan page to be on.'],
              [
                'tv_enabled',
                'TV sponsorship board',
                'Add this board to a TV layout or rotation in TV screens.',
              ],
            ].map(([key, label, detail]) => (
              <SimpleToggle
                key={key}
                label={label}
                detail={detail}
                checked={options[key]}
                disabled={busy}
                onChange={(value) => save(key, value)}
              />
            ))}
          </fieldset>
          {options.home_enabled && (
            <fieldset className="sponsorship-layout-choice">
              <legend>Homepage style</legend>
              <div className="booking-choices">
                {[
                  ['card', 'Simple cards', 'Meal choices and a booking button'],
                  ['days', 'Day cards', 'Show available sponsorship days'],
                ].map(([value, label, description]) => (
                  <button
                    type="button"
                    key={value}
                    disabled={busy}
                    aria-pressed={options.home_layout === value}
                    onClick={() => save('home_layout', value)}
                  >
                    <span>
                      <strong>{label}</strong>
                      <small>{description}</small>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </>
      )}
    </section>
  );
}
