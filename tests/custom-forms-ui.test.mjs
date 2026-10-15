import test from 'node:test';
import assert from 'node:assert/strict';
import { collectPages, submissionsCsv } from '../src/lib/formDownloads.js';
import {
  safeDownloadUrl,
  validateDraft,
  visibleAnswers,
  visibleFields,
} from '../src/lib/customForms.js';

const draft = () => ({
  slug: 'volunteer-registration',
  title: 'Volunteer registration',
  task_title: 'Call back',
  due_hours: 48,
  schema: {
    fields: [
      {
        id: 'contact',
        type: 'select',
        label: 'Contact by',
        required: true,
        options: ['Phone', 'Email'],
      },
      {
        id: 'phone',
        type: 'phone',
        label: 'Phone',
        required: true,
        show_when: { field: 'contact', operator: 'equals', value: 'Phone' },
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email',
        required: true,
        show_when: { field: 'contact', operator: 'not_equals', value: 'Phone' },
      },
    ],
  },
});

test('conditional questions omit stale hidden answers before submitting', () => {
  const fields = draft().schema.fields;
  const answers = {
    contact: 'Email',
    phone: '0123456789',
    email: 'example@example.org',
    injected: 'ignored',
  };
  assert.deepEqual(
    visibleFields(fields, answers).map((field) => field.id),
    ['contact', 'email'],
  );
  assert.deepEqual(visibleAnswers(fields, answers), {
    contact: 'Email',
    email: 'example@example.org',
  });
  const bool = [
    { id: 'consent', type: 'checkbox' },
    { id: 'name', show_when: { field: 'consent', operator: 'equals', value: true } },
  ];
  assert.equal(visibleFields(bool, { consent: false }).length, 1);
  assert.equal(visibleFields(bool, { consent: true }).length, 2);
});

test('builder validates unique fields, choices, previous unconditional references and upload count', () => {
  assert.equal(validateDraft(draft()), '');
  for (const mutate of [
    (value) => {
      value.slug = '../form';
    },
    (value) => {
      value.schema.fields[1].id = 'contact';
    },
    (value) => {
      value.schema.fields[0].options = ['Phone', 'Phone'];
    },
    (value) => {
      value.schema.fields[1].show_when.field = 'email';
    },
    (value) => {
      value.schema.fields[2].show_when.field = 'phone';
    },
    (value) => {
      value.due_hours = 0;
    },
    (value) => {
      value.schema.fields = Array.from({ length: 6 }, (_, i) => ({
        id: `image_${i}`,
        type: 'image',
        label: 'Photo',
      }));
    },
  ]) {
    const value = draft();
    mutate(value);
    assert.notEqual(validateDraft(value), '');
  }
});

test('all matching CSV fetches every page, keeps answer columns and neutralises formulas', async () => {
  const calls = [];
  const progress = [];
  const rows = await collectPages(
    async (offset, limit) => {
      calls.push([offset, limit]);
      return Array.from({ length: offset === 0 ? 100 : 2 }, (_, index) => ({
        id: String(offset + index),
        title: 'Volunteer form',
        payload: { name: index === 0 ? '=HYPERLINK("bad")' : 'Example', notes: 'a, b\nnext' },
      }));
    },
    { onProgress: (count) => progress.push(count) },
  );
  assert.deepEqual(calls, [
    [0, 100],
    [100, 100],
  ]);
  assert.deepEqual(progress, [100, 102]);
  const csv = submissionsCsv(rows);
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"a, b\nnext"'));
  assert.equal(rows.length, 102);
});

test('export cancellation and row limit fail explicitly without a partial download', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    collectPages(
      async () => {
        throw new Error('Must not fetch');
      },
      { signal: controller.signal },
    ),
    { name: 'AbortError' },
  );
  await assert.rejects(
    collectPages(async () => Array.from({ length: 100 }, () => ({})), { maxRows: 150 }),
    /Narrow the date or form filters/,
  );
});

test('attachment download links reject script URLs, HTTP and embedded credentials', () => {
  assert.equal(
    safeDownloadUrl('https://example.org/private/file?token=opaque'),
    'https://example.org/private/file?token=opaque',
  );
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,hello',
    'http://example.org/a',
    'https://user:secret@example.org/a',
    '/relative',
  ])
    assert.equal(safeDownloadUrl(value), null);
});
