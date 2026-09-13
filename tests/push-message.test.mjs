import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushMessage, validWorkerSecret } from '../supabase/functions/push-worker/message.mjs';

test('FCM payload excludes private fields and arbitrary deep links', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const message = pushMessage(
    {
      id,
      kind: 'task',
      title: 'Private student name',
      body: 'Payment details',
      entity_id: 'Private form ID',
      url: 'https://evil.example',
    },
    'opaque-token',
  );
  const serialised = JSON.stringify(message);
  for (const privateValue of ['Private student', 'Payment details', 'Private form', 'evil.example'])
    assert.equal(serialised.includes(privateValue), false);
  assert.deepEqual(message.message.data, { notification_id: id, kind: 'task' });
  assert.equal(message.message.android.notification.tag, id);
  assert.throws(() => pushMessage({ id: 'bad', kind: 'task' }, 'token'), /Invalid/);
  assert.throws(() => pushMessage({ id, kind: 'arbitrary' }, 'token'), /Invalid/);
});

test('only exact dedicated server bearer authorizes worker', async () => {
  const secret = 'dedicated-server-secret-at-least-32-characters';
  assert.equal(await validWorkerSecret(`Bearer ${secret}`, secret), true);
  for (const header of [
    null,
    '',
    secret,
    `Bearer ${secret}x`,
    `Bearer ${secret.slice(0, -1)}`,
    'Bearer public-anon-key',
  ])
    assert.equal(await validWorkerSecret(header, secret), false);
  assert.equal(await validWorkerSecret('Bearer short', 'short'), false);
});
