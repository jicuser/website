import test from 'node:test';
import assert from 'node:assert/strict';
import { formSteps, formStepProblem, reviewAnswer } from '../src/lib/smartForm.js';
import { visibleAnswers } from '../src/lib/customForms.js';
import { starterQuestions } from '../src/lib/formBuilder.js';
import { validateAnswers, validateSchema } from '../supabase/functions/custom-forms/validation.mjs';

const fields = [
  { id: 'name', label: 'Your name', type: 'text', required: true },
  {
    id: 'contact_by',
    label: 'Reply by',
    type: 'select',
    required: true,
    options: ['Email', 'Phone'],
  },
  {
    id: 'phone',
    label: 'Telephone',
    type: 'phone',
    required: true,
    show_when: { field: 'contact_by', operator: 'equals', value: 'Phone' },
  },
  {
    id: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    show_when: { field: 'contact_by', operator: 'equals', value: 'Email' },
  },
  { id: 'confirm', label: 'Confirm details', type: 'checkbox', required: true },
];

test('guided forms keep branch controls first and contact details before confirmation', () => {
  const steps = formSteps(fields, { contact_by: 'Email' });
  assert.deepEqual(
    steps.flatMap((step) => step.fields.map((field) => field.id)),
    ['contact_by', 'email', 'name', 'confirm'],
  );
  assert.ok(steps.every((step) => step.fields.length <= 3));
  const controlsName = [
    { ...fields[0] },
    {
      id: 'details',
      type: 'text',
      label: 'Details',
      show_when: { field: 'name', operator: 'equals', value: 'Other' },
    },
  ];
  assert.deepEqual(
    formSteps(controlsName, { name: 'Other' }).flatMap((step) =>
      step.fields.map((field) => field.id),
    ),
    ['name', 'details'],
  );
});

test('current-step validation ignores later required fields and follows published conditions', () => {
  assert.equal(formStepProblem(fields, { contact_by: 'Email' }, [fields[1]]), null);
  assert.equal(
    formStepProblem(fields, { contact_by: 'Email', email: 'bad' }, [fields[3]]).field,
    'email',
  );
  assert.equal(
    formStepProblem(fields, { contact_by: 'Email', email: 'person@example.org' }, [fields[3]]),
    null,
  );
  assert.equal(
    formStepProblem(fields, { contact_by: 'Phone', phone: '01217786612' }, [fields[2]]),
    null,
  );
});

test('changed branches discard old answers and file claims rather than restoring them later', () => {
  const branched = [
    ...fields,
    {
      id: 'document',
      type: 'file',
      label: 'Document',
      show_when: { field: 'contact_by', operator: 'equals', value: 'Phone' },
    },
  ];
  const clean = visibleAnswers(branched, {
    name: 'Visitor',
    contact_by: 'Email',
    phone: '01234',
    document: '00000000-0000-4000-8000-000000000001',
    email: 'visitor@example.org',
    confirm: true,
  });
  assert.deepEqual(clean, {
    name: 'Visitor',
    contact_by: 'Email',
    email: 'visitor@example.org',
    confirm: true,
  });
  assert.equal(visibleAnswers(branched, { ...clean, contact_by: 'Phone' }).phone, undefined);
  assert.deepEqual(validateAnswers({ fields: branched }, clean), clean);
});

test('zero, optional false, required consent and multi-select are validated without truthiness shortcuts', () => {
  const schema = [
    {
      id: 'count',
      label: 'Count',
      type: 'number',
      required: true,
      minimum: 0,
      maximum: 10,
      integer: true,
    },
    { id: 'updates', label: 'Updates', type: 'checkbox' },
    { id: 'agree', label: 'Agreement', type: 'checkbox', required: true },
    {
      id: 'days',
      label: 'Days',
      type: 'multiselect',
      required: true,
      options: ['Monday', 'Tuesday'],
    },
  ];
  const answers = { count: 0, updates: false, agree: true, days: ['Monday'] };
  assert.equal(formStepProblem(schema, answers), null);
  assert.equal(formStepProblem(schema, { ...answers, agree: false }).field, 'agree');
  assert.equal(formStepProblem(schema, { ...answers, days: [] }).field, 'days');
  assert.equal(formStepProblem(schema, { ...answers, count: 1.5 }).field, 'count');
});

test('age branches add and remove the complete guardian step at the existing consent boundaries', () => {
  const schema = [
    { id: 'attendee_age', label: 'Age', type: 'number', required: true },
    ...['name', 'phone', 'email', 'consent_signature', 'consent_date'].map((key) => ({
      id: `parent_${key}`,
      label: key,
      type: 'text',
      required: true,
      show_when: { field: 'attendee_age', operator: 'between', value: 11, maximum: 16 },
    })),
  ];
  for (const age of [11, 16]) assert.equal(formSteps(schema, { attendee_age: age }).length, 3);
  for (const age of [10, 17]) assert.equal(formSteps(schema, { attendee_age: age }).length, 1);
});

test('review shows filenames and plain values, never upload tokens or identifiers', () => {
  assert.equal(
    reviewAnswer(
      { id: 'upload', type: 'file' },
      { upload: 'private-id' },
      { upload: { name: 'notes.pdf', upload_token: 'secret' } },
    ),
    'notes.pdf',
  );
  assert.equal(reviewAnswer({ id: 'updates', type: 'checkbox' }, { updates: false }), 'No');
  assert.equal(reviewAnswer({ id: 'optional', type: 'text' }, {}), 'Not provided');
});

test('guided enquiry starter uses the existing schema and branches only for existing requests', () => {
  const schema = { fields: starterQuestions('triage') };
  validateSchema(schema);
  assert.equal(
    formSteps(schema.fields, { request_type: 'Start a new enquiry' })
      .flatMap((step) => step.fields)
      .some((field) => field.id === 'reference'),
    false,
  );
  assert.equal(
    formSteps(schema.fields, { request_type: 'Follow up an existing request' })
      .flatMap((step) => step.fields)
      .some((field) => field.id === 'reference'),
    true,
  );
});
