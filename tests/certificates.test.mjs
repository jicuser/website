import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';
import { certificateKind, isVerificationToken, verificationPath, certificateDate } from '../src/lib/certificates.js';
import { hasPermission, validateAccess } from '../supabase/functions/_shared/access.js';

test('certificate links use exact opaque tokens and staff labels confer no issuing access', () => {
  for (const value of ['', '1234', 'a'.repeat(31), '../account', 'javascript:alert(1)', 'a'.repeat(32) + '?x=1']) {
    assert.equal(isVerificationToken(value), false);
    assert.equal(verificationPath(value), null);
  }
  assert.equal(verificationPath('a'.repeat(32)), '/verify/' + 'a'.repeat(32));
  assert.equal(certificateKind('nikah'), 'Nikah');
  assert.equal(certificateDate('invalid'), 'Not recorded');
  assert.equal(hasPermission({ is_active: true, staff_kinds: ['imam'], permissions: [] }, 'certificates'), false);
  assert.deepEqual(validateAccess({ permissions: ['certificates'], staff_kinds: [] }).permissions, ['certificates']);
});

test('certificate requests, immutable issuance and minimal public verification are enforced by SQL', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  t.after(() => db.close());
  await db.exec(await readFile(new URL('../supabase/features/certificates.sql', import.meta.url), 'utf8'));
  await db.query("update profiles set permissions='{certificates}',display_name='Authorised issuer' where id=$1", [id(3)]);
  await db.query("update profiles set staff_kinds='{imam}' where id=$1", [id(4)]);
  const request = (key, name = 'Private recipient') => rpc('request_certificate', ['nikah', name, '2026-01-01', 'Private ceremony details', id(key)]);
  let requestId, certificateId, token;

  await t.test('anonymous callers cannot read private tables or make requests', async () => {
    for (const table of ['certificate_requests', 'certificates', 'certificate_events'])
      await as(null, () => assert.rejects(db.query('select * from ' + table), /permission denied/), 'anon');
    await as(null, () => assert.rejects(request(100), /permission denied/), 'anon');
  });

  await t.test('an active applicant can request once and only see their own records', async () => {
    requestId = await as(id(5), () => request(100));
    assert.equal(await as(id(5), () => request(100)), requestId);
    await as(id(5), () => assert.rejects(request(100, 'Changed recipient'), /different details/));
    assert.equal((await as(id(5), () => db.query('select * from certificate_requests'))).rows.length, 1);
    assert.equal((await as(id(4), () => db.query('select * from certificate_requests'))).rows.length, 0);
    await as(id(5), () => assert.rejects(db.query("update certificate_requests set status='issued'"), /permission denied/));
    await as(id(5), () => assert.rejects(rpc('review_certificate_request', [requestId, 'issue', 'Forged certificate text', '']), /permission/));
    await as(id(4), () => assert.rejects(rpc('review_certificate_request', [requestId, 'issue', 'Forged certificate text', '']), /permission/));
  });

  await t.test('explicit issuing permission creates one immutable snapshot and private audit record', async () => {
    certificateId = await as(id(3), () => rpc('review_certificate_request', [requestId, 'issue', 'Approved ceremony record from JIC.', 'Approved after review']));
    assert.equal(await as(id(3), () => rpc('review_certificate_request', [requestId, 'issue', 'Retry cannot alter text.', ''])), certificateId);
    const row = (await as(id(5), () => db.query('select * from certificates'))).rows[0];
    assert.equal(row.recipient_name, 'Private recipient');
    assert.equal(row.statement, 'Approved ceremony record from JIC.');
    assert.equal(row.approved_by_name, 'Authorised issuer');
    token = row.verification_token;
    assert.equal(token.length, 32);
    assert.equal((await as(id(4), () => db.query('select * from certificates'))).rows.length, 0);
    assert.equal((await as(id(5), () => db.query('select * from certificate_events'))).rows.length, 0);
    assert.equal((await as(id(3), () => db.query('select * from certificate_events'))).rows.length, 2);
    await as(id(3), () => assert.rejects(db.query("update certificates set statement='changed'"), /permission denied/));
    await assert.rejects(db.query("update certificates set statement='changed by a privileged client' where id=$1", [certificateId]), /cannot be changed/);
    await assert.rejects(db.query('delete from certificates where id=$1', [certificateId]), /cannot be deleted/);
  });

  await t.test('public verification returns only allowed metadata, never the private certificate', async () => {
    const record = await as(null, () => rpc('verify_certificate', [token]), 'anon');
    assert.deepEqual(Object.keys(record).sort(), ['reference', 'kind', 'issuer_name', 'issued_on', 'status'].sort());
    assert.equal(record.status, 'valid');
    assert.equal(record.kind, 'nikah');
    assert.equal(JSON.stringify(record).includes('Private'), false);
    assert.equal(await as(null, () => rpc('verify_certificate', ['b'.repeat(32)]), 'anon'), null);
    assert.equal(await as(null, () => rpc('verify_certificate', [certificateId]), 'anon'), null);
    assert.equal(await as(null, () => rpc('verify_certificate', [token + 'extra']), 'anon'), null);
  });

  await t.test('revocation changes the verification result but preserves the issued details', async () => {
    await as(id(5), () => assert.rejects(rpc('revoke_certificate', [certificateId, 'Unauthorised']), /permission/));
    await as(id(3), () => rpc('revoke_certificate', [certificateId, 'Incorrect source record']));
    const record = await as(null, () => rpc('verify_certificate', [token]), 'anon');
    assert.equal(record.status, 'revoked');
    assert.equal('revocation_reason' in record, false);
    const row = (await as(id(5), () => db.query('select * from certificates'))).rows[0];
    assert.equal(row.statement, 'Approved ceremony record from JIC.');
    assert.equal(row.revocation_reason, 'Incorrect source record');
    await as(id(3), () => rpc('revoke_certificate', [certificateId, 'Retry']));
    assert.equal((await db.query("select count(*)::int n from certificate_events where action='revoked'")).rows[0].n, 1);
    await assert.rejects(db.query('update certificates set revoked_at=null, revoked_by=null, revocation_reason=null'), /cannot be changed/);
  });

  await t.test('review is atomic, cannot be self-approved, and disabled accounts lose access', async () => {
    const own = await as(id(3), () => request(101, 'Issuer own request'));
    await as(id(3), () => assert.rejects(rpc('review_certificate_request', [own, 'issue', 'Self issued certificate.', '']), /Another authorised/));
    const other = await as(id(5), () => request(102));
    await as(id(3), () => assert.rejects(rpc('review_certificate_request', [other, 'issue', '', '']), /check constraint/));
    assert.equal((await db.query('select status from certificate_requests where id=$1', [other])).rows[0].status, 'pending');
    await as(id(3), () => rpc('review_certificate_request', [other, 'decline', '', 'Please check the names']));
    await as(id(3), () => assert.rejects(rpc('review_certificate_request', [other, 'issue', 'Later attempt should fail.', '']), /already been reviewed/));
    await db.query('update profiles set is_active=false where id=$1', [id(5)]);
    assert.equal((await as(id(5), () => db.query('select * from certificates'))).rows.length, 0);
    assert.equal((await as(id(5), () => db.query('select * from certificate_requests'))).rows.length, 0);
    await as(id(5), () => assert.rejects(request(103), /active account/));
    await db.query("update profiles set permissions='{}' where id=$1", [id(3)]);
    await as(id(3), () => assert.rejects(rpc('review_certificate_request', [own, 'decline', '', 'No access now']), /permission/));
  });

  await t.test('request rate limits and validation are applied in the database', async () => {
    for (let n = 0; n < 5; n++) await as(id(4), () => request(200 + n));
    await as(id(4), () => assert.rejects(request(205), /daily request limit/));
    await as(id(6), () => assert.rejects(rpc('request_certificate', ['unknown', 'Example', null, '', id(300)]), /check constraint/));
    await as(id(6), () => assert.rejects(rpc('request_certificate', ['nikah', 'Example', '2099-01-01', '', id(301)]), /future/));
    await as(id(6), () => assert.rejects(rpc('request_certificate', ['nikah', 'Example', null, 'x'.repeat(2001), id(302)]), /check constraint/));
  });
});
