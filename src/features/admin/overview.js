export function summariseForms(forms) {
  const count = (value) =>
    Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
  const rows = Array.isArray(forms) ? forms : [];
  return {
    waiting: rows.reduce((sum, row) => sum + count(row.new_count), 0),
    complete: rows.reduce((sum, row) => sum + count(row.done_count), 0),
    actions: rows.reduce((sum, row) => sum + count(row.open_actions), 0),
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
    if (result.error || !Number.isSafeInteger(result.count)) throw new Error('Count unavailable');
    return result.count;
  };
  if (can('forms_contact'))
    add('messages', () =>
      count('form_submissions', [
        ['kind', 'contact'],
        ['status', 'new'],
      ]),
    );
  if (can('forms'))
    add('forms', async () => {
      const result = await client.rpc('admin_forms_overview').abortSignal(signal);
      if (result.error || !Array.isArray(result.data)) throw new Error('Forms unavailable');
      return summariseForms(result.data);
    });
  if (certificatesEnabled && can('certificates'))
    add('certificates', () => count('certificate_requests', [['status', 'pending']]));
  return Object.fromEntries(await Promise.all(jobs));
}
