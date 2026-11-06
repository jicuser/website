import { detailsDraft, detailsPayload } from '../features/prayer-details/model.js';

/** Validate every edited detail before writing. Preserve other fields and check each revision. */
export function monthlyDetailWrites(baseline, edits, source, published) {
  return Object.entries(edits).map(([date, patch]) => {
    const existing = baseline[date] || detailsDraft(null);
    return detailsPayload(date, {
      ...existing,
      ...patch,
      source: source.trim() || existing.source,
      published,
    });
  });
}

/** Report each confirmed save so a retry retains only the dates still needing a save. */
export async function saveMonthlyDetails(client, writes, onSaved) {
  for (const payload of writes) {
    const { data, error } = await client.rpc('save_prayer_day_details', payload);
    if (error)
      throw new Error(`${payload.p_date}: ${error.message || 'Additional times were not saved.'}`);
    if (data?.d_date !== payload.p_date || data?.revision !== payload.p_expected_revision + 1)
      throw new Error(
        `${payload.p_date}: the save could not be confirmed. Reload before retrying.`,
      );
    onSaved(data.d_date, detailsDraft(data));
  }
}
