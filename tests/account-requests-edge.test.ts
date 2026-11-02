// Executes the real Edge handlers. All outbound fetches are mocked; --deny-net is required.
const assert = (condition: unknown, message = 'Assertion failed') => {
  if (!condition) throw new Error(message);
};
type Handler = (request: Request) => Response | Promise<Response>;
let captured: Handler;
const originalServe = Deno.serve;
let intake: Handler;
let manage: Handler;
try {
  Deno.serve = ((fn: Handler) => {
    captured = fn;
    return {};
  }) as typeof Deno.serve;
  await import('../supabase/functions/request-access/index.ts');
  intake = captured!;
  await import('../supabase/functions/manage-user/index.ts');
  manage = captured!;
} finally {
  Deno.serve = originalServe;
}

Deno.test('account intake release boundary and separate staff approval', async (t) => {
  const env = {
    SUPABASE_URL: 'https://account-test.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'server-test-key',
    ACCOUNT_REQUESTS_ENABLED: 'true',
    VITE_ENABLE_ACCOUNT_REQUESTS: 'true',
    FORM_ALLOWED_ORIGINS: 'https://jicmasjid.org',
    TURNSTILE_SECRET_KEY: 'test-captcha-secret',
    JIC_SITE_URL: 'https://jicmasjid.org',
  };
  const originals = Object.fromEntries(Object.keys(env).map((key) => [key, Deno.env.get(key)]));
  for (const [key, value] of Object.entries(env)) Deno.env.set(key, value);
  const originalFetch = globalThis.fetch;
  const actorId = '00000000-0000-4000-8000-000000000001';
  const targetId = '00000000-0000-4000-8000-000000000002';
  const requestId = '00000000-0000-4000-8000-000000000003';
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  let rpcError = '';
  let captchaSuccess = true;
  let active = true;
  let permissions: string[] = [];
  const json = (body: unknown, status = 200) => Response.json(body, { status });
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(input)).pathname;
    calls.push({ path, body: typeof init?.body === 'string' ? JSON.parse(init.body) : {} });
    if (path === '/turnstile/v0/siteverify')
      return json({ success: captchaSuccess, action: 'public_form', hostname: 'jicmasjid.org' });
    if (path === '/rest/v1/rpc/submit_account_request')
      return rpcError ? json({ message: rpcError, code: 'P0001' }, 400) : json(null);
    if (path === '/auth/v1/user')
      return new Headers(init?.headers).get('authorization') === 'Bearer verified-user-jwt'
        ? json({ id: actorId })
        : json({ message: 'Invalid JWT' }, 401);
    if (path === '/rest/v1/profiles')
      return json({
        id: actorId,
        is_active: active,
        is_owner: false,
        permissions,
        staff_kinds: [],
      });
    if (path === '/rest/v1/account_access_requests')
      return json({
        id: requestId,
        email: 'visitor@example.test',
        display_name: 'Visitor',
        status: 'pending',
      });
    if (path === '/rest/v1/rpc/account_request_user') return json(targetId);
    if (
      path === '/rest/v1/rpc/resolve_account_request' ||
      path === '/rest/v1/rpc/manage_staff_access'
    )
      return json(null);
    if (path === '/auth/v1/invite') return json({ id: targetId, email: 'visitor@example.test' });
    throw new Error(`Unmocked network request: ${path}`);
  }) as typeof fetch;
  const valid = {
    display_name: '  Visitor Name  ',
    email: 'VISITOR@example.test',
    consent: true,
    requested_role: 'teacher',
    requested_features: ['teacher_tools', 'family_updates'],
    message: 'Please review my access.',
    website: '',
    security: { captcha_token: 'test-proof', started_at: Date.now() - 10000, website: '' },
  };
  const post = (handler: Handler, body: unknown, headers: Record<string, string> = {}) =>
    handler(
      new Request('https://edge.invalid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://jicmasjid.org',
          ...headers,
        },
        body: JSON.stringify(body),
      }),
    );
  const staffHeaders = { Authorization: 'Bearer verified-user-jwt' };
  try {
    await t.step(
      'unset, false and unrecognised flags fail closed before body parsing, CAPTCHA or RPCs',
      async () => {
        for (const flag of [undefined, '', 'false', 'TRUE', '1', ' true ', 'yes']) {
          flag === undefined
            ? Deno.env.delete('ACCOUNT_REQUESTS_ENABLED')
            : Deno.env.set('ACCOUNT_REQUESTS_ENABLED', flag);
          calls.length = 0;
          const req = new Request('https://edge.invalid?ACCOUNT_REQUESTS_ENABLED=true', {
            method: 'POST',
            headers: {
              Authorization: 'Bearer verified-user-jwt',
              'X-Account-Requests-Enabled': 'true',
            },
            body: '{malformed',
          });
          const response = await intake(req);
          assert(response.status === 503);
          assert((await response.json()).code === 'account_requests_disabled');
          assert(response.headers.get('cache-control') === 'no-store');
          assert(response.headers.get('access-control-allow-origin') === '*');
          assert(!req.bodyUsed, 'Disabled intake must not consume the request');
          assert(calls.length === 0);
        }
        const response = await post(intake, {
          ...valid,
          ACCOUNT_REQUESTS_ENABLED: true,
          is_owner: true,
        });
        assert(response.status === 503 && calls.length === 0);
      },
    );
    await t.step(
      'preflight and unsupported methods never perform work in either release state',
      async () => {
        for (const flag of ['false', 'true']) {
          Deno.env.set('ACCOUNT_REQUESTS_ENABLED', flag);
          calls.length = 0;
          assert(
            (await intake(new Request('https://edge.invalid', { method: 'OPTIONS' }))).status ===
              200,
          );
          assert((await intake(new Request('https://edge.invalid'))).status === 405);
          assert(calls.length === 0);
        }
      },
    );
    await t.step(
      'enabled visitor intake verifies the human and submits only a pending request',
      async () => {
        for (const token of [
          undefined,
          'legacy-anon-jwt',
          'sb_publishable_test',
          'verified-user-jwt',
        ]) {
          calls.length = 0;
          const response = await post(
            intake,
            valid,
            token ? { Authorization: `Bearer ${token}`, 'x-forwarded-for': '192.0.2.5' } : {},
          );
          assert(response.status === 200 && (await response.json()).ok === true);
          assert(calls.length === 2 && calls[0].path === '/turnstile/v0/siteverify');
          const rpc = calls[1];
          assert(rpc.path === '/rest/v1/rpc/submit_account_request');
          assert(/^[a-f0-9]{64}$/.test(String(rpc.body.p_source_key)));
          const body = rpc.body.p_body as typeof valid;
          assert(body.email === 'visitor@example.test' && body.display_name === 'Visitor Name');
          assert(
            !calls.some((call) =>
              /invite|resolve_account_request|manage_staff_access/.test(call.path),
            ),
          );
        }
      },
    );
    await t.step(
      'duplicates share a receipt; SQL throttling, validation and failures keep their status',
      async () => {
        for (const [error, status] of [
          ['', 200],
          ['', 200],
          ['request_rate_limit', 429],
          ['invalid_request', 400],
          ['private database detail', 503],
        ] as const) {
          rpcError = error;
          const response = await post(intake, valid);
          assert(response.status === status);
          assert(!(await response.text()).includes('private database detail'));
        }
        rpcError = '';
      },
    );
    await t.step('malformed submissions never reach the database', async () => {
      for (const body of [
        null,
        [],
        'text',
        {},
        { ...valid, consent: 'true' },
        { ...valid, display_name: 'x' },
        { ...valid, email: 'bad-email' },
        { ...valid, email: `${'a'.repeat(250)}@example.test` },
        { ...valid, message: 'x'.repeat(2001) },
        { ...valid, requested_features: 'staff' },
        { ...valid, requested_features: Array(9).fill('staff') },
      ]) {
        calls.length = 0;
        const response = await post(intake, body);
        assert([400, 403].includes(response.status));
        assert(
          !calls.some((call) => call.path.startsWith('/rest/') || call.path.startsWith('/auth/')),
        );
      }
      for (const body of ['{broken', 'x'.repeat(12001)]) {
        calls.length = 0;
        assert(
          (await intake(new Request('https://edge.invalid', { method: 'POST', body }))).status ===
            400,
        );
        assert(calls.length === 0);
      }
    });
    await t.step(
      'disallowed origins, honeypots and failed human checks cannot submit',
      async () => {
        for (const [body, headers, status] of [
          [valid, { Origin: 'https://untrusted.example' }, 403],
          [{ ...valid, website: 'spam' }, {}, 400],
          [{ ...valid, security: { ...valid.security, website: 'spam' } }, {}, 400],
          [{ ...valid, security: { ...valid.security, started_at: Date.now() + 60000 } }, {}, 400],
          [{ ...valid, security: {} }, {}, 403],
        ] as const) {
          calls.length = 0;
          assert((await post(intake, body, headers)).status === status);
          assert(calls.length === 0);
        }
        calls.length = 0;
        captchaSuccess = false;
        assert((await post(intake, valid)).status === 403);
        assert(calls.length === 1 && calls[0].path === '/turnstile/v0/siteverify');
        captchaSuccess = true;
      },
    );
    await t.step(
      'public and forged credentials cannot list, approve, reject or invite',
      async () => {
        for (const action of [
          'list_access_requests',
          'approve_access_request',
          'reject_access_request',
          'invite',
        ]) {
          for (const token of [
            undefined,
            'legacy-anon-jwt',
            'sb_publishable_test',
            'forged-jwt',
            'verified-user-jwt',
          ]) {
            calls.length = 0;
            const response = await post(
              manage,
              {
                action,
                request_id: requestId,
                p_actor: actorId,
                is_owner: true,
                permissions: ['users'],
              },
              token ? { Authorization: `Bearer ${token}` } : {},
            );
            assert(response.status === (token === 'verified-user-jwt' ? 403 : 401));
            assert(
              !calls.some((call) => /account_access_requests|\/rpc\/|\/invite/.test(call.path)),
            );
          }
        }
        permissions = ['users'];
        active = false;
        calls.length = 0;
        assert(
          (
            await post(
              manage,
              { action: 'approve_access_request', request_id: requestId },
              staffHeaders,
            )
          ).status === 403,
        );
        assert(!calls.some((call) => /\/rpc\/|\/invite/.test(call.path)));
        active = true;
      },
    );
    await t.step(
      'approval checks delegation and uses the verified actor and explicit permissions',
      async () => {
        permissions = ['users', 'tv'];
        calls.length = 0;
        assert(
          (
            await post(
              manage,
              {
                action: 'approve_access_request',
                request_id: requestId,
                permissions: ['finance'],
                staff_kinds: [],
              },
              staffHeaders,
            )
          ).status === 400,
        );
        assert(!calls.some((call) => /\/rpc\/|\/invite/.test(call.path)));
        calls.length = 0;
        const response = await post(
          manage,
          {
            action: 'approve_access_request',
            request_id: requestId,
            permissions: ['tv'],
            staff_kinds: ['teacher'],
            p_actor: targetId,
          },
          staffHeaders,
        );
        assert(response.status === 200);
        const approval = calls.find((call) => call.path.endsWith('/resolve_account_request'))!.body;
        assert(
          approval.p_actor === actorId &&
            approval.p_target === targetId &&
            approval.p_approve === true,
        );
        assert(JSON.stringify(approval.p_permissions) === '["tv"]');
        assert(
          !calls.some((call) => call.path.endsWith('/invite')),
          'Existing accounts must not be reinvited',
        );
      },
    );
    await t.step('closing intake does not break authorised staff invitations', async () => {
      Deno.env.set('ACCOUNT_REQUESTS_ENABLED', 'false');
      calls.length = 0;
      const response = await post(
        manage,
        {
          action: 'invite',
          email: 'visitor@example.test',
          display_name: 'Visitor',
          permissions: ['tv'],
          staff_kinds: ['volunteer'],
        },
        staffHeaders,
      );
      assert(response.status === 200, await response.text());
      assert(calls.some((call) => call.path === '/auth/v1/invite'));
      const grant = calls.find((call) => call.path.endsWith('/manage_staff_access'))!.body;
      assert(grant.actor === actorId && grant.target === targetId);
      assert(JSON.stringify(grant.new_permissions) === '["tv"]');
      assert(!calls.some((call) => call.path.endsWith('/submit_account_request')));
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originals))
      value === undefined ? Deno.env.delete(key) : Deno.env.set(key, value);
  }
});
