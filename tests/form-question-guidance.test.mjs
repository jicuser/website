import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';

test('published form hints retain their version and reject malformed metadata without changing permissions', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  t.after(() => db.close());
  const dir = new URL('../supabase/migrations/', import.meta.url);
  const name = (await readdir(dir)).find((file) => file.endsWith('_form_question_guidance.sql'));
  await db.exec(await readFile(new URL(name, dir), 'utf8'));
  const schema = {
    fields: [
      {
        id: 'name',
        label: 'Your name',
        type: 'text',
        required: true,
        help: 'As you would like it displayed',
        placeholder: 'Full name',
      },
    ],
  };
  const draft = {
    slug: 'editable-registration',
    title: 'Editable registration',
    schema,
    responsible_ids: [id(3)],
  };
  const form = await as(id(2), () => rpc('save_custom_form', [draft]));
  await as(id(2), () => rpc('publish_custom_form', [form]));
  const live = await as(null, () => rpc('get_public_form', [draft.slug]), 'anon');
  assert.deepEqual(live.schema, schema);
  await as(id(5), () =>
    assert.rejects(() => rpc('save_custom_form', [{ ...draft, id: form }]), /permission/i),
  );
  await as(id(2), () =>
    assert.rejects(
      () =>
        rpc('save_custom_form', [
          {
            ...draft,
            id: form,
            schema: { fields: [{ ...schema.fields[0], help: { hidden: 'bad' } }] },
          },
        ]),
      /short text/i,
    ),
  );
  const next = { fields: [{ ...schema.fields[0], label: 'Full name', help: 'Updated guidance' }] };
  await as(id(2), () => rpc('save_custom_form', [{ ...draft, id: form, schema: next }]));
  assert.deepEqual(
    (await as(null, () => rpc('get_public_form', [draft.slug]), 'anon')).schema,
    schema,
  );
  await as(id(2), () => rpc('publish_custom_form', [form]));
  assert.deepEqual(
    (await as(null, () => rpc('get_public_form', [draft.slug]), 'anon')).schema,
    next,
  );
  const stored = await db.query(
    'select schema from custom_form_versions where form_id=$1 and version=1',
    [form],
  );
  assert.deepEqual(stored.rows[0].schema, schema);
  assert.equal(
    (
      await db.query(
        "select prosecdef from pg_proc where oid='private.validate_custom_schema(jsonb)'::regprocedure",
      )
    ).rows[0].prosecdef,
    false,
  );
});
