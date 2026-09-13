// Run with: deno test --allow-env --deny-net tests/custom-forms-edge.test.ts
// All network requests are replaced by this deterministic fake; no deployed service is called.
const owner = '00000000-0000-4000-8000-000000000001';
const submission = '00000000-0000-4000-8000-000000000002';
const upload = '00000000-0000-4000-8000-000000000003';
const assert = (condition: unknown, message = 'Assertion failed') => { if (!condition) throw new Error(message); };
let handler: (req: Request) => Response | Promise<Response>;
const originalServe = Deno.serve;
Deno.serve = ((fn: typeof handler) => { handler = fn; return {}; }) as typeof Deno.serve;
await import('../supabase/functions/custom-forms/index.ts');
Deno.serve = originalServe;

Deno.test('custom forms handler verifies identities and bounds request, upload and export access', async (t) => {
  const values: Record<string, string> = { SUPABASE_URL: 'https://forms.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', SUPABASE_ANON_KEY: 'test-anon-key' };
  const originals = Object.fromEntries(Object.keys(values).map((name) => [name, Deno.env.get(name)]));
  for (const [name, value] of Object.entries(values)) Deno.env.set(name, value);
  const originalFetch = globalThis.fetch;
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  let invalidFile = false;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input)), path = url.pathname;
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    calls.push({ path, body });
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    if (path === '/auth/v1/user') {
      const token = new Headers(init?.headers).get('authorization');
      return token === 'Bearer valid-user-token' ? json({ id: owner, email: 'member@example.org' }) : json({ message: 'invalid token' }, 401);
    }
    if (path.endsWith('/get_public_form')) return json({ id: owner, slug: 'help-form', version: 1, schema: { fields: [{ id: 'name', type: 'text', label: 'Name', required: true }] } });
    if (path.endsWith('/submit_custom_form')) return json(submission);
    if (path.endsWith('/custom_attachment_object')) return json(null);
    if (path.endsWith('/get_custom_form_upload')) return json({ id: upload, ready: false, object_key: 'safe/random', mime_type: 'image/png', size_bytes: 24 });
    if (path === '/storage/v1/object/authenticated/form-attachments/safe/random') return new Response(invalidFile ? new TextEncoder().encode('<html>not an image</html>') : new Uint8Array(24));
    if (path === '/storage/v1/object/form-attachments') return json([]);
    if (path.endsWith('/custom_form_export')) return json({ message: 'Form staff access required', code: 'P0001' }, 400);
    throw new Error(`Unmocked network request: ${path}`);
  }) as typeof fetch;
  const post = (body: unknown, token = 'test-anon-key') => handler(new Request('https://edge.invalid/custom-forms', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }));
  try {
    await t.step('rejects forged JWT before calling any privileged database RPC', async () => {
      calls.length = 0;
      const response = await post({ action: 'download', attachment_id: upload }, 'forged-token');
      assert(response.status === 401);
      assert(!calls.some((call) => call.path.includes('/rest/')));
    });
    await t.step('derives submitter from verified JWT and ignores client supplied identity', async () => {
      calls.length = 0;
      const response = await post({ action: 'submit', slug: 'help-form', version: 1, answers: { name: 'A member' }, idempotency_key: submission, p_user_id: submission, user_id: submission }, 'valid-user-token');
      assert(response.status === 200, await response.text());
      const call = calls.find((call) => call.path.endsWith('/submit_custom_form'));
      assert(call?.body.p_user_id === owner);
      assert(typeof call?.body.p_source_key === 'string' && call.body.p_source_key.length === 64);
      assert(!JSON.stringify(call?.body).includes('test-service-key'));
    });
    await t.step('anonymous submissions have no account identity', async () => {
      calls.length = 0;
      const response = await post({ action: 'submit', slug: 'help-form', version: 1, answers: { name: 'Visitor' }, idempotency_key: submission, user_id: owner });
      assert(response.status === 200);
      assert(calls.find((call) => call.path.endsWith('/submit_custom_form'))?.body.p_user_id === null);
    });
    await t.step('rejects oversized streamed JSON before network access', async () => {
      calls.length = 0;
      const response = await post({ action: 'submit', answers: { text: 'x'.repeat(65536) } });
      assert(response.status === 413); assert(calls.length === 0);
    });
    await t.step('does not hand unrelated users an attachment URL or export bytes', async () => {
      const download = await post({ action: 'download', attachment_id: upload }, 'valid-user-token'); assert(download.status === 403);
      const exported = await post({ action: 'export', form_id: owner, format: 'zip' }, 'valid-user-token'); assert(exported.status === 403);
    });
    await t.step('rejects file bytes that do not match the declared image signature', async () => {
      invalidFile = true; calls.length = 0;
      const response = await post({ action: 'upload_finish', upload_id: upload, upload_token: 'a'.repeat(64) });
      assert(response.status === 400, await response.text());
      assert(!calls.some((call) => call.path.endsWith('/finish_custom_form_upload')));
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(originals)) value === undefined ? Deno.env.delete(name) : Deno.env.set(name, value);
  }
});
