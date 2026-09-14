// No deployed endpoint is called. Run with deno test --allow-env --deny-net.
const assert = (condition: unknown, message = 'Assertion failed') => {
  if (!condition) throw new Error(message);
};
type Handler = (request: Request) => Response | Promise<Response>;
let captured: Handler;
const originalServe = Deno.serve;
Deno.serve = ((fn: Handler) => { captured = fn; return {}; }) as typeof Deno.serve;
await import('../supabase/functions/submit-form/index.ts');
const submit = captured!;
await import('../supabase/functions/manage-user/index.ts');
const manage = captured!;
Deno.serve = originalServe;

Deno.test('release handlers preserve public form validation and private account authorization', async (t) => {
  const values = { SUPABASE_URL: 'https://release.invalid', SUPABASE_SERVICE_ROLE_KEY: 'server-test-key' };
  const originals = Object.fromEntries(Object.keys(values).map((key) => [key, Deno.env.get(key)]));
  for (const [key, value] of Object.entries(values)) Deno.env.set(key, value);
  const originalFetch = globalThis.fetch;
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  let limited = false;
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(input)).pathname;
    calls.push({ path, body: typeof init?.body === 'string' ? JSON.parse(init.body) : {} });
    if (path === '/rest/v1/rpc/submit_website_form') return limited ? json({ message: 'submission_rate_limit', code: 'P0001' }, 400) : json(null);
    if (path === '/auth/v1/user') return new Headers(init?.headers).get('authorization') === 'Bearer actual-user-jwt'
      ? json({ id: '00000000-0000-4000-8000-000000000001' }) : json({ message: 'Invalid JWT' }, 401);
    if (path === '/rest/v1/profiles') return json({ id: '00000000-0000-4000-8000-000000000001', is_active: true, is_owner: false, permissions: [] });
    throw new Error(`Unmocked network request: ${path}`);
  }) as typeof fetch;
  const post = (handler: Handler, body: unknown, token?: string) => handler(new Request('https://edge.invalid', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  }));
  const payload = { kind: 'contact', payload: { name: 'Visitor', email: 'visitor@example.org', question: 'Course enquiry' } };
  try {
    await t.step('legacy anon, publishable and absent auth all preserve validated visitor submissions', async () => {
      for (const token of ['legacy-anon-jwt', 'sb_publishable_public_client', undefined]) {
        calls.length = 0;
        const response = await post(submit, { ...payload, user_id: 'forged', role: 'owner' }, token);
        assert(response.status === 200, await response.text());
        assert(calls.length === 1 && calls[0].path.endsWith('/submit_website_form'));
        assert(JSON.stringify(calls[0].body.p_payload) === JSON.stringify(payload.payload));
        assert(!JSON.stringify(calls[0].body).includes('forged'));
      }
    });
    await t.step('public handler still rejects malformed input and enforces SQL throttling', async () => {
      calls.length = 0;
      assert((await post(submit, { kind: 'custom', payload: {} })).status === 400);
      assert(calls.length === 0);
      limited = true;
      assert((await post(submit, payload)).status === 429);
    });
    await t.step('account mutations reject public credentials, forged JWTs and unprivileged users', async () => {
      for (const token of [undefined, 'legacy-anon-jwt', 'sb_publishable_public_client', 'forged-jwt', 'actual-user-jwt']) {
        calls.length = 0;
        const response = await post(manage, { action: 'invite', email: 'nobody@example.org', permissions: ['users'] }, token);
        assert(response.status === (token === 'actual-user-jwt' ? 403 : 401), await response.text());
        assert(!calls.some((call) => call.path.includes('/invite') || call.path.includes('/rpc/')));
      }
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originals)) value === undefined ? Deno.env.delete(key) : Deno.env.set(key, value);
  }
});
