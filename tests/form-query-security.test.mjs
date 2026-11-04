import test from 'node:test';
import assert from 'node:assert/strict';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';

test('SQL-shaped answers and searches remain data and cannot bypass form permissions', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  t.after(() => db.close());
  const form = await as(id(2), () => rpc('save_custom_form', [{
    slug: 'security-check',
    title: 'Security check',
    schema: { fields: [{ id: 'message', type: 'textarea', label: 'Message', required: true }] },
    responsible_ids: [id(3)],
  }]));
  await as(id(2), () => rpc('publish_custom_form', [form]));
  const message = "O'Brien'); UPDATE public.profiles SET is_owner = true; --";
  const entry = await as(null, () => rpc('submit_custom_form', [
    'security-check', 1, { message }, 'a'.repeat(64), id(100), null, [],
  ]), 'service_role');

  const stored = await as(id(3), () => db.query(
    'select payload from public.form_submissions where id = $1', [entry],
  ));
  assert.equal(stored.rows[0].payload.message, message);
  const profiles = await db.query('select id from public.profiles where is_owner');
  assert.deepEqual(profiles.rows.map((row) => row.id), [id(1)]);

  const visible = await as(id(3), () => rpc('search_form_submissions', ["O'Brien"]));
  assert.deepEqual(visible.rows.map((row) => row.id), [entry]);
  for (const search of ['', "' OR 1=1 --", '%']) {
    const hidden = await as(id(5), () => rpc('search_form_submissions', [search]));
    assert.equal(hidden.total, 0);
    assert.deepEqual(hidden.rows, []);
  }
  await as(null, () => assert.rejects(
    () => rpc('submit_custom_form', ['security-check', 1, { message }, 'b'.repeat(64), id(101), null, []]),
    /permission denied/,
  ), 'anon');
});
