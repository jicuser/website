import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSchema,
  validateAnswers,
  isFieldVisible,
  validateUpload,
  hasExpectedSignature,
  safeFilename,
  csvCell,
  responsesCsv,
} from '../supabase/functions/custom-forms/validation.mjs';
import { createZip, crc32 } from '../supabase/functions/custom-forms/zip.mjs';

const schema = {
  fields: [
    { id: 'contact', type: 'checkbox', label: 'Contact me' },
    {
      id: 'email',
      type: 'email',
      label: 'Email',
      required: true,
      show_when: { field: 'contact', operator: 'equals', value: true },
    },
    { id: 'date', type: 'date', label: 'Date' },
    { id: 'topics', type: 'multiselect', label: 'Topics', options: ['Classes', 'Prayer'] },
    { id: 'amount', type: 'number', label: 'Amount' },
    { id: 'file', type: 'file', label: 'Evidence' },
  ],
};

test('declarative visibility ignores hidden values and requires visible fields', () => {
  assert.equal(isFieldVisible(schema.fields[1], { contact: false }), false);
  assert.deepEqual(validateAnswers(schema, { contact: false }), { contact: false });
  assert.throws(
    () => validateAnswers(schema, { contact: false, email: 'secret@example.org' }),
    /hidden/,
  );
  assert.throws(() => validateAnswers(schema, { contact: true }), /required/);
  assert.throws(() => validateAnswers(schema, { contact: true, email: '   ' }), /required/);
  assert.deepEqual(
    validateAnswers(schema, { contact: true, email: 'person@example.org', topics: ['Classes'] }),
    { contact: true, email: 'person@example.org', topics: ['Classes'] },
  );
});

test('schemas reject duplicate fields, cycles, chained visibility and duplicate options', () => {
  assert.throws(() => validateSchema({ fields: [schema.fields[0], schema.fields[0]] }), /unique/);
  assert.throws(() => validateSchema({ fields: [schema.fields[1], schema.fields[0]] }), /earlier/);
  assert.throws(
    () =>
      validateSchema({
        fields: [
          ...schema.fields,
          {
            id: 'followup',
            type: 'text',
            label: 'Follow up',
            show_when: { field: 'email', operator: 'equals', value: 'x' },
          },
        ],
      }),
    /earlier/,
  );
  assert.throws(
    () =>
      validateSchema({
        fields: [{ id: 'choices', type: 'select', label: 'Pick', options: ['Same', 'Same'] }],
      }),
    /different/,
  );
  assert.throws(
    () =>
      validateSchema({
        fields: Array.from({ length: 6 }, (_, i) => ({
          id: `file_${i}`,
          type: 'file',
          label: 'Upload',
        })),
      }),
    /five/,
  );
});

test('answer validation rejects impossible dates, nonfinite numbers and unlisted values', () => {
  for (const answer of [
    { date: '2026-02-30' },
    { date: '2026-13-01' },
    { amount: Infinity },
    { amount: '12' },
    { amount: 1e13 },
    { topics: ['Other'] },
    { topics: ['Classes', 'Classes'] },
    { file: '../../secret' },
    { unknown: 'extra' },
  ])
    assert.throws(() => validateAnswers(schema, answer));
  assert.deepEqual(validateAnswers(schema, { date: '2028-02-29', amount: 12.5 }), {
    date: '2028-02-29',
    amount: 12.5,
  });
});

test('file limits use a narrow allowlist and signatures reject HTML disguised as a picture', () => {
  const field = { type: 'image' };
  assert.throws(
    () =>
      validateUpload(field, {
        mime_type: 'application/pdf',
        size_bytes: 20,
        file_name: 'evidence.pdf',
      }),
    /Choose/,
  );
  assert.throws(
    () =>
      validateUpload(field, {
        mime_type: 'image/png',
        size_bytes: 10485761,
        file_name: 'photo.png',
      }),
    /smaller/,
  );
  assert.throws(
    () =>
      validateUpload(
        { type: 'file' },
        { mime_type: 'text/html', size_bytes: 20, file_name: 'page.html' },
      ),
    /Choose/,
  );
  const file = validateUpload(field, {
    mime_type: 'image/png',
    size_bytes: 40,
    file_name: '../test\\evil.png',
  });
  assert.equal(file.file_name, '_test_evil.png');
  assert.equal(
    hasExpectedSignature(new TextEncoder().encode('<html>hello</html>'), 'image/png'),
    false,
  );
  const png = new Uint8Array(24);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(hasExpectedSignature(png, 'image/png'), true);
  assert.equal(hasExpectedSignature(new TextEncoder().encode('%PDF-1.7'), 'application/pdf'), true);
  assert.equal(safeFilename('..\\..\\file.pdf'), '_.._file.pdf');
});

test('CSV protects formulas while preserving commas, quotes and version field IDs', () => {
  for (const text of ['=SUM(A1:A4)', ' +SUM(A1)', '\t@formula', '-2+3'])
    assert.ok(csvCell(text).startsWith('"\''));
  assert.equal(csvCell('Name, "quoted"'), '"Name, ""quoted"""');
  const csv = responsesCsv([
    {
      id: 'a',
      created_at: 'now',
      status: 'new',
      form_version: 1,
      schema_snapshot: { fields: [{ id: 'name', label: 'Old name' }] },
      payload: { name: '=cmd' },
    },
    {
      id: 'b',
      created_at: 'later',
      status: 'done',
      form_version: 2,
      schema_snapshot: { fields: [{ id: 'new_name', label: 'New name' }] },
      payload: { new_name: 'Ali' },
    },
  ]);
  assert.match(csv, /Old name \[name\]/);
  assert.match(csv, /New name \[new_name\]/);
  assert.match(csv, /'=cmd/);
});

test('ZIP emits standard CRC and safe bounded UTF8 stored entries', () => {
  const bytes = new TextEncoder().encode('123456789');
  assert.equal(crc32(bytes), 0xcbf43926);
  const archive = createZip([
    { name: 'responses.csv', bytes },
    { name: 'response/صورة.png', bytes: new Uint8Array([1, 2, 3]) },
  ]);
  const view = new DataView(archive.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(archive.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(archive.length - 14, true), 2);
  for (const name of ['../escape', '/absolute', 'safe/../escape', 'safe\\escape'])
    assert.throws(() => createZip([{ name, bytes }]), /Invalid/);
  assert.throws(
    () => createZip(Array.from({ length: 52 }, (_, i) => ({ name: `f${i}`, bytes }))),
    /many/,
  );
});
