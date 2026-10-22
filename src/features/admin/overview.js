import { BUILT_IN_FORMS } from '../../lib/customForms.js';

export function summariseForms(forms) {
  const count = (value) => {
    const numeric = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));
    if (!numeric || !Number.isSafeInteger(Number(value)) || Number(value) < 0)
      throw new Error('Response totals unavailable');
    return Number(value);
  };
  if (!Array.isArray(forms)) throw new Error('Response totals unavailable');
  const rows = forms;
  return {
    waiting: rows.reduce((sum, row) => count(sum + count(row.new_count)), 0),
    complete: rows.reduce((sum, row) => count(sum + count(row.done_count)), 0),
    actions: rows.reduce((sum, row) => count(sum + count(row.open_actions)), 0),
    forms: rows.length,
  };
}

/** Read only authorised areas. A failed count is unavailable, never zero. */
export async function loadAdminOverview(client, { can, certificatesEnabled, signal }) {
  const jobs = [];
  const add = (key, read) =>
    jobs.push(
      (async () => {
        try {
          return [key, { value: await read(), error: false }];
        } catch {
          return [key, { value: null, error: true }];
        }
      })(),
    );
  const count = async (table, filters) => {
    let query = client.from(table).select('id', { count: 'exact', head: true });
    for (const [column, value] of filters) query = query.eq(column, value);
    const result = await query.abortSignal(signal);
    if (result.error || !Number.isSafeInteger(result.count) || result.count < 0)
      throw new Error('Count unavailable');
    return result.count;
  };
  if (can('forms'))
    add('forms', async () => {
      const legacyKinds = BUILT_IN_FORMS.filter(({ permission }) => can(permission));
      const [result, ...legacy] = await Promise.all([
        client.rpc('admin_forms_overview').abortSignal(signal),
        ...legacyKinds.map(({ kind }) =>
          client
            .rpc('search_form_submissions', {
              p_kind: kind,
              p_status: null,
              p_offset: 0,
              p_limit: 1,
            })
            .abortSignal(signal),
        ),
      ]);
      if (
        result.error ||
        !Array.isArray(result.data) ||
        legacy.some((item) => item.error || !item.data)
      )
        throw new Error('Forms unavailable');
      return summariseForms([
        ...result.data,
        ...legacy.map(({ data }) => ({
          new_count: data.new_count,
          done_count: data.done_count,
          open_actions: 0,
        })),
      ]);
    });
  if (certificatesEnabled && can('certificates'))
    add('certificates', () => count('certificate_requests', [['status', 'pending']]));
  return Object.fromEntries(await Promise.all(jobs));
}
