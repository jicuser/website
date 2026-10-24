import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { funeralMigration, funeralSchema } from './helpers/funeralForm.mjs';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';
import { visibleAnswers, visibleFields } from '../src/lib/customForms.js';
import { formSteps } from '../src/lib/smartForm.js';
import { validateAnswers, validateSchema } from '../supabase/functions/custom-forms/validation.mjs';
import { readFuneralFacilities } from '../src/features/funerals/facilities.js';

test('funeral branches retain relevant answers and phone contact without requiring email', () => {
  assert.doesNotThrow(() => validateSchema(funeralSchema));
  const answers = {
    request: 'Collection or transport',
    when_passed: 'Today',
    current_location: 'Hospital',
    location_details: 'Example hospital',
    collection_needed: 'Yes',
    transport: 'Ambulance collection',
    name: 'Test visitor',
    phone: '0121 000 0000',
  };
  assert.deepEqual(validateAnswers(funeralSchema, answers), answers);
  const planned = visibleAnswers(funeralSchema.fields, {
    ...answers,
    request: 'Advice or planning ahead',
  });
  assert.deepEqual(Object.keys(planned).sort(), ['name', 'phone', 'request']);
  assert.doesNotThrow(() => validateAnswers(funeralSchema, planned));
  assert.throws(
    () => validateAnswers(funeralSchema, { ...planned, location_details: 'Stale private answer' }),
    /hidden/,
  );
  const facilityFields = visibleFields(funeralSchema.fields, {
    request: 'Washing or other facilities',
  });
  assert.ok(facilityFields.some((field) => field.id === 'facilities'));
  assert.ok(!facilityFields.some((field) => field.id === 'transport'));
  const steps = formSteps(funeralSchema.fields, answers);
  assert.deepEqual(
    steps.at(-1).fields.map((field) => field.id),
    ['name', 'phone', 'email'],
  );
  assert.deepEqual(
    steps
      .find((step) => step.title === 'Where is your loved one now?')
      .fields.map((field) => field.id),
    ['current_location', 'location_details'],
  );
});

test('facility content keeps fixed identities and discards unsafe images', () => {
  assert.equal(readFuneralFacilities('{broken').length, 5);
  for (const image of [
    'javascript:alert(1)',
    '//evil.test/photo',
    'data:image/svg+xml,hello',
    'https://user:pass@host.test/a.jpg',
    '/\\evil.test/a.jpg',
  ])
    assert.equal(readFuneralFacilities([{ id: 'ambulance', image }])[0].image, '');
  const cards = readFuneralFacilities([
    {
      id: 'ambulance',
      image: '/ambulance.webp',
      visible: false,
      title: 'A'.repeat(100),
      private_note: 'private',
    },
  ]);
  assert.equal(cards[0].title.length, 80);
  assert.equal(cards[0].image, '/ambulance.webp');
  assert.equal(cards[0].visible, false);
  assert.equal(cards[0].private_note, undefined);
});

test('funeral upgrade preserves published history, closure and recipients; it is repeatable', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  t.after(() => db.close());
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/20261023183820_form_question_guidance.sql', import.meta.url),
      'utf8',
    ),
  );
  const schema = {
    fields: [
      { id: 'name', type: 'text', label: 'Your name', required: true },
      { id: 'message', type: 'textarea', label: 'How can we help?', required: true },
    ],
  };
  const formId = await as(id(1), () =>
    rpc('save_custom_form', [
      {
        slug: 'funeral-enquiry',
        title: 'Funeral support',
        description: 'Original description',
        schema,
        enabled: true,
        task_title: 'Follow up',
        due_hours: 24,
        manager_ids: [id(1)],
        responsible_ids: [id(3)],
        watcher_ids: [],
      },
    ]),
  );
  await as(id(1), () => rpc('publish_custom_form', [formId]));
  const version = (await db.query('select * from custom_form_versions where form_id=$1', [formId]))
    .rows;
  const staff = (
    await db.query('select * from custom_form_staff where form_id=$1 order by role', [formId])
  ).rows;
  await as(
    null,
    () =>
      rpc('submit_custom_form', [
        'funeral-enquiry',
        1,
        { name: 'Previous visitor', message: 'Original request' },
        'a'.repeat(64),
        id(200),
        null,
        [],
      ]),
    'service_role',
  );
  const history = (await db.query('select * from form_submissions')).rows;
  await db.query('update custom_forms set enabled=false where id=$1', [formId]);
  await db.exec(funeralMigration);
  assert.deepEqual(
    (await db.query('select * from custom_form_versions where form_id=$1 and version=1', [formId]))
      .rows,
    version,
  );
  assert.deepEqual(
    (await db.query('select * from custom_form_staff where form_id=$1 order by role', [formId]))
      .rows,
    staff,
  );
  assert.deepEqual((await db.query('select * from form_submissions')).rows, history);
  assert.equal(await rpc('get_public_form', ['funeral-enquiry']), null);
  await db.exec(funeralMigration);
  assert.equal(
    (
      await db.query('select count(*)::int as count from custom_form_versions where form_id=$1', [
        formId,
      ])
    ).rows[0].count,
    2,
  );
  await db.query('update custom_forms set enabled=true where id=$1', [formId]);
  const published = await as(null, () => rpc('get_public_form', ['funeral-enquiry']), 'anon');
  assert.equal(published.version, 2);
  assert.deepEqual(published.schema, funeralSchema);
  // A normal visitor still cannot read the private response inbox.
  await assert.rejects(
    () => as(null, () => db.query('select * from form_submissions'), 'anon'),
    /permission denied/,
  );
  assert.deepEqual((await as(id(5), () => db.query('select * from form_submissions'))).rows, []);
  await db.query('update custom_forms set schema=$2 where id=$1', [
    formId,
    {
      fields: [
        ...funeralSchema.fields,
        { id: 'custom_note', type: 'text', label: 'Staff draft question' },
      ],
    },
  ]);
  await assert.rejects(() => db.exec(funeralMigration), /unpublished changes/);
  await db.exec('rollback');
});
