const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const detailsDraft = (row) => ({
  sunset: row?.sunset?.slice(0, 5) || '',
  zawwal_start: row?.zawwal_start?.slice(0, 5) || '',
  zawwal_end: row?.zawwal_end?.slice(0, 5) || '',
  source: row?.source || '',
  published: row?.published === true,
  revision: row?.revision || 0,
});
export function detailsPayload(date, draft) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date
  )
    throw new Error('Choose a valid timetable date.');
  for (const field of ['sunset', 'zawwal_start', 'zawwal_end'])
    if (draft[field] && !clock.test(draft[field]))
      throw new Error('Enter a valid time and choose AM or PM.');
  if (draft.zawwal_end && (!draft.zawwal_start || draft.zawwal_start >= draft.zawwal_end))
    throw new Error('A Zawal interval needs a start and a later end.');
  const source = String(draft.source || '').trim();
  if (
    source.length > 250 ||
    (draft.published && (source.length < 3 || (!draft.sunset && !draft.zawwal_start)))
  )
    throw new Error('Publishing needs a source and at least one confirmed time.');
  return {
    p_date: date,
    p_sunset: draft.sunset || null,
    p_zawwal_start: draft.zawwal_start || null,
    p_zawwal_end: draft.zawwal_end || null,
    p_source: source,
    p_published: draft.published === true,
    p_expected_revision: draft.revision,
  };
}
