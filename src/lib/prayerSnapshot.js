const PRAYER_COLUMNS =
  'd_date,fajr_begins,fajr_jamah,sunrise,zuhr_begins,zuhr_jamah,asr_begins,asr_jamah,maghrib_begins,maghrib_jamah,isha_begins,isha_jamah,is_ramadan,jummah_1_start,jummah_1_jamah,jummah_2_begins,jummah_2_jamah';
const iso = (date) => date.toISOString().slice(0, 10);

export function prayerQueryRange(today, includeTomorrow = false) {
  const date = new Date(`${today}T12:00:00Z`);
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = iso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12)));
  const friday = new Date(date);
  friday.setUTCDate(friday.getUTCDate() + ((5 - friday.getUTCDay() + 7) % 7));
  const tomorrow = new Date(date);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return {
    monthStart,
    monthEnd,
    friday: iso(friday),
    tomorrow: iso(tomorrow),
    last: [monthEnd, iso(friday), ...(includeTomorrow ? [iso(tomorrow)] : [])].sort().at(-1),
  };
}

// Today's row, the month and next Jummah share one bounded request. This also
// keeps their values from different parts of the page on the same snapshot.
export async function loadPrayerSnapshot(client, today, includeTomorrow = false, signal) {
  const range = prayerQueryRange(today, includeTomorrow);
  const withSignal = (query) => (signal ? query.abortSignal(signal) : query);
  const [times, settings] = await Promise.all([
    withSignal(
      client
        .from('prayer_times')
        .select(PRAYER_COLUMNS)
        .gte('d_date', range.monthStart)
        .lte('d_date', range.last)
        .order('d_date'),
    ),
    withSignal(
      client
        .from('page_content')
        .select('content_value')
        .eq('content_key', 'jummah_settings')
        .maybeSingle(),
    ),
  ]);
  const rows = times.error ? [] : times.data || [];
  const record = (date) => ({
    data: rows.find((row) => row.d_date === date) || null,
    error: times.error,
  });
  return {
    daily: record(today),
    monthly: { data: rows.filter((row) => row.d_date <= range.monthEnd), error: times.error },
    settings,
    fridayRow: record(range.friday),
    nextDay: includeTomorrow ? record(range.tomorrow) : { data: null },
  };
}
