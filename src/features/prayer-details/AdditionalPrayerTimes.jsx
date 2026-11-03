import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { displayTime } from '@/lib/timetable';
import './prayer-details.css';
export default function AdditionalPrayerTimes({ date }) {
  const [state, setState] = useState({ date: null, row: null, loading: true, error: false });
  useEffect(() => {
    if (!date) return undefined;
    let active = true;
    let controller;
    let timer;
    const read = async () => {
      controller?.abort();
      window.clearTimeout(timer);
      const current = new AbortController();
      controller = current;
      setState({ date, row: null, loading: true, error: false });
      timer = window.setTimeout(() => current.abort(), 8000);
      try {
        const { data, error } = await supabase
          .from('prayer_day_details')
          .select('d_date,sunset,zawwal_start,zawwal_end,source,published')
          .eq('d_date', date)
          .eq('published', true)
          .maybeSingle()
          .abortSignal(current.signal);
        if (!active || controller !== current) return;
        setState({
          date,
          row: !error && data?.published === true && data.d_date === date ? data : null,
          loading: false,
          error: Boolean(error),
        });
      } catch {
        if (active && controller === current)
          setState({ date, row: null, loading: false, error: true });
      } finally {
        if (controller === current) window.clearTimeout(timer);
      }
    };
    read();
    window.addEventListener('jic-content-updated', read);
    return () => {
      active = false;
      controller?.abort();
      window.clearTimeout(timer);
      window.removeEventListener('jic-content-updated', read);
    };
  }, [date]);
  if (!date) return null;
  const row = state.date === date ? state.row : null;
  const unknown = state.loading ? 'Loading…' : state.error ? 'Unavailable' : 'Not published';
  return (
    <section className="additional-prayer-times" aria-label="Additional times">
      <dl>
        <div>
          <dt>Sunset</dt>
          <dd>{row?.sunset ? displayTime(row.sunset) : unknown}</dd>
        </div>
        <div>
          <dt>Zawwal</dt>
          <dd>
            {row?.zawwal_start && row?.zawwal_end
              ? `${displayTime(row.zawwal_start)} – ${displayTime(row.zawwal_end)}`
              : unknown}
          </dd>
        </div>
      </dl>
      {row?.source && <p>{row.source}</p>}
    </section>
  );
}
