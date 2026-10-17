import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAdminOverview, summariseForms } from '../src/features/admin/overview.js';

test('overview skips unauthorised and disabled areas entirely', async () => {
  const client = new Proxy(
    {},
    {
      get: () => {
        throw new Error('No requests permitted');
      },
    },
  );
  assert.deepEqual(
    await loadAdminOverview(client, { can: () => false, certificatesEnabled: true }),
    {},
  );
  assert.deepEqual(
    await loadAdminOverview(client, {
      can: (permission) => permission === 'certificates',
      certificatesEnabled: false,
    }),
    {},
  );
});

test('a failed queue is unavailable while other queues keep their real counts', async () => {
  const seen = [];
  const client = {
    from(table) {
      seen.push(table);
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        abortSignal() {
          return Promise.resolve({ error: { message: 'Unavailable' }, count: null });
        },
      };
    },
    rpc(name) {
      seen.push(name);
      return {
        abortSignal() {
          return Promise.resolve({ data: [{ new_count: 3, done_count: 5, open_actions: 2 }] });
        },
      };
    },
  };
  const result = await loadAdminOverview(client, { can: () => true, certificatesEnabled: false });
  assert.deepEqual(result.messages, { value: null, error: true });
  assert.deepEqual(result.forms, {
    value: { waiting: 3, complete: 5, actions: 2, forms: 1 },
    error: false,
  });
  assert.deepEqual(seen, ['form_submissions', 'admin_forms_overview']);
  assert.deepEqual(summariseForms([]), { waiting: 0, complete: 0, actions: 0, forms: 0 });
});
