import { test, expect } from '@playwright/test';

const account = '00000000-0000-4000-8000-000000000005';
const requestId = '00000000-0000-4000-8000-000000000010';
const certificateId = '00000000-0000-4000-8000-000000000011';
const token = 'a'.repeat(32);
const request = {
  id: requestId, applicant_id: account, kind: 'nikah', recipient_name: 'Example private recipient',
  notes: 'Private office details', event_date: '2026-01-01', status: 'pending',
  created_at: '2026-10-15T09:00:00Z',
};
const certificate = {
  id: certificateId, request_id: requestId, recipient_id: account, kind: 'nikah',
  recipient_name: 'Example private recipient', event_date: '2026-01-01',
  statement: 'Approved ceremony record.', issuer_name: 'Jamatia Islamic Centre',
  approved_by_name: 'Example issuer', issued_at: '2026-10-15T09:00:00Z',
  reference: 'JIC-2026-EXAMPLE', verification_token: token,
};
async function setup(page, { signedIn = true, staff = false, handle = () => undefined } = {}) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(({ signedIn, account }) => {
    sessionStorage.setItem('jic-salawat-shown', '1');
    if (signedIn) sessionStorage.setItem('sb-127-auth-token', JSON.stringify({
      access_token: 'preview-jwt', refresh_token: 'preview-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer',
      user: { id: account, email: 'example@example.org' },
    }));
  }, { signedIn, account });
  await page.route('**/preview-api/**', async (route) => {
    const url = new URL(route.request().url());
    let body;
    try { body = route.request().postDataJSON(); } catch { /* GET */ }
    if (await handle(url, body, route)) return;
    const name = url.pathname.split('/').at(-1);
    const data = name === 'get_my_profile' ? {
      id: account, display_name: 'Example member', is_active: true,
      is_owner: false, permissions: staff ? ['certificates'] : [], staff_kinds: [],
    } : name === 'certificates' ? [certificate] : name === 'certificate_requests' ? [] : [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data), headers: { 'content-range': '0-0/1' } });
  });
  return errors;
}

test('member submits a certificate request and retry reuses the same request key', async ({ page }) => {
  const attempts = [];
  let received = false;
  const errors = await setup(page, { handle: async (url, body, route) => {
    if (url.pathname.endsWith('/request_certificate')) {
      attempts.push(body);
      received = attempts.length > 1;
      await route.fulfill({ status: received ? 200 : 503, contentType: 'application/json',
        body: JSON.stringify(received ? requestId : { message: 'Temporary failure' }) });
      return true;
    }
    if (url.pathname.endsWith('/certificate_requests')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(received ? [request] : []), headers: { 'content-range': received ? '0-0/1' : '*/0' } });
      return true;
    }
  } });
  await page.goto('/account/certificates');
  await page.getByRole('button', { name: 'Request a certificate', exact: true }).click();
  await page.getByLabel('Names to appear on the certificate').fill('Example private recipient');
  await page.getByLabel('Event or completion date (if known)').fill('2026-01-01');
  await page.getByLabel('Details for the office').fill('Private office details');
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Check your request' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'I have checked the names and details.' }).check();
  await page.getByRole('button', { name: 'Send request', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('could not be sent');
  await page.getByRole('button', { name: 'Send request', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Request sent' })).toBeVisible();
  await expect(page.locator('.certificate-list')).toContainText('Awaiting review');
  expect(attempts).toHaveLength(2);
  expect(attempts[0].p_client_key).toBe(attempts[1].p_client_key);
  expect(attempts[1].p_kind).toBe('nikah');
  expect(errors).toEqual([]);
});

test('recipient opens the private certificate and its limited verification link', async ({ page }, testInfo) => {
  const errors = await setup(page, { handle: async (url, body, route) => {
    if (url.pathname.endsWith('/certificates') && url.searchParams.has('id')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(certificate) });
      return true;
    }
  } });
  await page.goto('/account/certificates');
  await page.getByRole('button', { name: 'View certificate', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Certificate', exact: true })).toContainText('Example private recipient');
  await expect(page.getByRole('link', { name: 'Open verification', exact: true })).toHaveAttribute('href', '/verify/' + token);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
  await expect(page.getByText('Revoke this certificate', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('private-certificate.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('certificate staff review a request only after checking the record', async ({ page }) => {
  const decisions = [];
  const errors = await setup(page, { staff: true, handle: async (url, body, route) => {
    if (url.pathname.endsWith('/certificate_requests')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(decisions.length ? [] : [request]), headers: { 'content-range': decisions.length ? '*/0' : '0-0/1' } });
      return true;
    }
    if (url.pathname.endsWith('/review_certificate_request')) {
      decisions.push(body);
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(certificateId) });
      return true;
    }
  } });
  await page.goto('/admin?section=certificates');
  await page.getByText('Review request', { exact: true }).click();
  await page.getByLabel('Approved wording').fill('Approved ceremony record.');
  await page.getByRole('button', { name: 'Issue certificate', exact: true }).click();
  expect(decisions).toHaveLength(0);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Issue certificate', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Decision saved.' })).toBeVisible();
  expect(decisions).toEqual([{ p_request_id: requestId, p_decision: 'issue', p_statement: 'Approved ceremony record.', p_note: '' }]);
  expect(errors).toEqual([]);
});

test('verification displays revocation without exposing private certificate data', async ({ page }, testInfo) => {
  let calls = 0;
  const errors = await setup(page, { signedIn: false, handle: async (url, body, route) => {
    if (url.pathname.endsWith('/verify_certificate')) {
      calls++;
      expect(body).toEqual({ p_token: token });
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        reference: certificate.reference, kind: 'nikah', issuer_name: certificate.issuer_name,
        issued_on: '2026-10-15', status: 'revoked',
      }) });
      return true;
    }
  } });
  await page.goto('/verify/' + token);
  await expect(page.getByRole('heading', { name: 'Certificate revoked', exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Example private recipient');
  await expect(page.locator('main')).not.toContainText('Private office details');
  await page.screenshot({ path: testInfo.outputPath('public-verification.png'), fullPage: true });
  await page.goto('/verify/not-a-token');
  await expect(page.getByRole('heading', { name: 'Certificate not found', exact: true })).toBeVisible();
  expect(calls).toBe(1);
  expect(errors).toEqual([]);
});

test('an unavailable verification service offers retry without claiming validity', async ({ page }) => {
  let attempts = 0;
  const errors = await setup(page, { signedIn: false, handle: async (url, body, route) => {
    if (!url.pathname.endsWith('/verify_certificate')) return;
    attempts++;
    await route.fulfill({ status: attempts === 1 ? 503 : 200, contentType: 'application/json',
      body: attempts === 1 ? '{"message":"Unavailable"}' : 'null' });
    return true;
  } });
  await page.goto('/verify/' + token);
  await expect(page.getByRole('alert')).toContainText('Verification is unavailable');
  await expect(page.getByRole('heading', { name: 'Verified issuing record' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Certificate not found', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
