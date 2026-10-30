export const staffId = '10000000-0000-4000-8000-000000000001';
export async function sitewideFixture(
  page,
  { signedIn = false, owner = true, permissions = [], content = {}, tables = {} } = {},
) {
  const state = { errors: [], writes: [] };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.addInitScript(
    ({ signedIn, staffId }) => {
      if (window.top !== window) return;
      sessionStorage.setItem('jic-salawat-shown', '1');
      if (signedIn)
        sessionStorage.setItem(
          'sb-127-auth-token',
          JSON.stringify({
            access_token: 'preview-token',
            refresh_token: 'test-refresh',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: { id: staffId, email: 'design-test@example.invalid' },
          }),
        );
    },
    { signedIn, staffId },
  );
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.route('**/preview-api/**', (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      key = url.pathname.split('/').at(-1);
    if (!['GET', 'OPTIONS'].includes(req.method()) && !url.pathname.includes('/rpc/'))
      state.writes.push({ key, body: req.postData() });
    const known = {
      get_my_profile: {
        id: staffId,
        display_name: 'Design test',
        is_owner: owner,
        is_active: true,
        permissions,
        staff_kinds: [],
      },
      page_content: Object.entries(content).map(([content_key, content_value]) => ({
        content_key,
        content_value,
      })),
      get_public_form: null,
      get_site_page: null,
      list_fee_requests: { rows: [], total: 0, outstanding_by_currency: {} },
      search_form_submissions: { rows: [], total: 0, new_count: 0, done_count: 0 },
      prayer_times: url.searchParams.has('d_date')
        ? { d_date: '2026-10-25', fajr_begins: '05:30', fajr_jamah: '06:00' }
        : [],
    };
    const data = Object.hasOwn(tables, key)
      ? tables[key]
      : Object.hasOwn(known, key)
        ? known[key]
        : [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return state;
}
