import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission } from '../supabase/functions/submit-form/validation.mjs';

const contact = {
  kind: 'contact',
  payload: {
    name: ' Example ',
    email: 'example@example.org',
    question: 'A question',
    role: 'super_admin',
    status: 'done',
  },
};
const registration = {
  kind: 'itikaaf',
  payload: {
    attendee_name: 'Example',
    attendee_age: 12,
    attendee_address: 'Example address',
    attendee_phone: '000000',
    attendee_email: 'example@example.org',
    emergency_contact_name: 'Guardian',
    emergency_contact_phone: '000001',
    emergency_contact_relationship: 'Parent',
    parent_name: 'Guardian',
    parent_phone: '000001',
    parent_email: 'guardian@example.org',
    parent_consent_signature: 'Guardian',
    parent_consent_date: '2026-09-12',
  },
};

test('form input whitelists fields and preserves plain text without executing markup or SQL', () => {
  const input = structuredClone(contact);
  input.payload.question = "<script>alert(1)</script> '); drop table profiles; --";
  const result = validateSubmission(input);
  assert.equal(result.payload.name, 'Example');
  assert.equal(result.payload.question, input.payload.question);
  assert.equal(result.payload.role, undefined);
  assert.equal(result.payload.status, undefined);
});

test('invalid kinds, field types, missing fields and oversize messages are rejected', () => {
  for (const input of [
    null,
    [],
    { kind: '__proto__', payload: {} },
    { kind: 'constructor', payload: {} },
    { kind: 'contact', payload: { ...contact.payload, email: 'not-email' } },
    { kind: 'contact', payload: { ...contact.payload, name: {} } },
    { kind: 'contact', payload: { ...contact.payload, question: ' ' } },
    { kind: 'contact', payload: { ...contact.payload, question: 'a'.repeat(4001) } },
  ])
    assert.throws(() => validateSubmission(input));
});

test('Madrassah accepts optional phone and keeps its enquiry field', () => {
  const result = validateSubmission({
    kind: 'madrassah',
    payload: {
      name: 'Guardian',
      email: 'guardian@example.org',
      query: 'Please tell me about classes.',
    },
  });
  assert.equal(result.payload.phone, '');
  assert.equal(result.payload.query, 'Please tell me about classes.');
});

test('I’tikaf requires a valid whole age and the existing 11–16 parent consent fields', () => {
  assert.equal(validateSubmission(registration).payload.attendee_age, 12);
  for (const updates of [
    { attendee_age: 0 },
    { attendee_age: 121 },
    { attendee_age: 12.5 },
    { attendee_age: '12' },
    { parent_consent_signature: '' },
    { parent_consent_date: '2026-02-30' },
  ]) {
    assert.throws(() =>
      validateSubmission({ ...registration, payload: { ...registration.payload, ...updates } }),
    );
  }
  const adult = {
    ...registration,
    payload: {
      ...registration.payload,
      attendee_age: 30,
      parent_consent_signature: '',
      parent_consent_date: '',
    },
  };
  assert.equal(validateSubmission(adult).payload.attendee_age, 30);
});
