import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { recordDate } from '@/lib/monthlyTimetable';

export function usePublishedPrayerDetails(first, last = first) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    window.addEventListener('jic-content-updated', retry);
    return () => window.removeEventListener('jic-content-updated', retry);
  }, [retry]);
  useEffect(() => {
    if (!first || !last) return undefined;
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    const read = async () => {
      try {
        const query = supabase
          .from('prayer_day_details')
          .select('d_date,sunset,zawwal_start,zawwal_end,source,published')
          .eq('published', true);
        const single = first === last;
        const request = single
          ? query.eq('d_date', first).maybeSingle()
          : query.gte('d_date', first).lte('d_date', last);
        const { data, error } = await request.abortSignal(controller.signal);
        if (error) throw error;
        const records = single ? (data ? [data] : []) : data || [];
        const rows = new Map(
          records
            .filter((row) => row.published && row.d_date >= first && row.d_date <= last)
            .map((row) => [row.d_date, row]),
        );
        if (active) setResult({ first, last, attempt, rows, status: 'ready' });
      } catch {
        if (active) setResult({ first, last, attempt, rows: null, status: 'error' });
      } finally {
        window.clearTimeout(timer);
      }
    };
    read();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [first, last, attempt]);
  if (result?.first === first && result?.last === last && result?.attempt === attempt)
    return { rows: result.rows, status: result.status, retry };
  return { rows: null, status: first ? 'loading' : 'ready', retry };
}

export function useMonthlyZawal(rows) {
  const dates = useMemo(() => rows.map(recordDate).filter(Boolean).sort(), [rows]);
  const { rows: details, status, retry } = usePublishedPrayerDetails(dates[0], dates.at(-1));
  const timetableRows = useMemo(
    () =>
      !details?.size
        ? rows
        : rows.map((row) => {
            const detail = details.get(recordDate(row));
            return detail
              ? { ...row, zawwal_start: detail.zawwal_start, zawwal_end: detail.zawwal_end }
              : row;
          }),
    [rows, details],
  );
  return { timetableRows, status, retry };
}
