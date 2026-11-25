import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { normalizeTimetableDesign } from '@/lib/timetableDesign';

export default function useTimetableDesign(month) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    window.addEventListener('jic-content-updated', retry);
    return () => window.removeEventListener('jic-content-updated', retry);
  }, [retry]);
  useEffect(() => {
    if (!month) return undefined;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    async function load() {
      try {
        const { data, error } = await supabase
          .from('prayer_timetable_months')
          .select('month,design,published,revision')
          .eq('month', `${month}-01`)
          .eq('published', true)
          .abortSignal(controller.signal);
        if (error) throw error;
        if (active)
          setResult({
            month,
            attempt,
            status: 'ready',
            design: normalizeTimetableDesign(data?.[0]?.design),
          });
      } catch {
        if (active) setResult({ month, attempt, status: 'error', design: null });
      } finally {
        clearTimeout(timer);
      }
    }
    load();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [month, attempt]);
  return result?.month === month && result?.attempt === attempt
    ? { ...result, retry }
    : { design: null, status: month ? 'loading' : 'ready', retry };
}
