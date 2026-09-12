import test from 'node:test';
import assert from 'node:assert/strict';
import { withRequestTimeout } from '../src/lib/requestTimeout.js';

test('the deadline includes a hanging auth lookup before the HTTP request starts', async () => {
  let sent = false;
  let requestSignal;
  await assert.rejects(
    withRequestTimeout(
      async (signal) => {
        requestSignal = signal;
        await new Promise(() => {});
        sent = true;
      },
      { timeoutMs: 5, message: 'Hall stream timed out. Retry.' },
    ),
    { name: 'TimeoutError', message: 'Hall stream timed out. Retry.' },
  );
  assert.equal(requestSignal.aborted, true);
  assert.equal(sent, false);
});

test('timeout remains distinguishable from a manual stop, even when fetch rejects on abort', async () => {
  await assert.rejects(
    withRequestTimeout(
      (signal) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () =>
            reject(new DOMException('Fetch aborted', 'AbortError')),
          );
        }),
      { timeoutMs: 5 },
    ),
    { name: 'TimeoutError' },
  );
  const controller = new AbortController();
  const pending = withRequestTimeout(() => new Promise(() => {}), { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('an already stopped operation does not send another API request', async () => {
  const controller = new AbortController();
  controller.abort();
  let sent = false;
  await assert.rejects(
    withRequestTimeout(
      () => {
        sent = true;
      },
      { signal: controller.signal },
    ),
    { name: 'AbortError' },
  );
  assert.equal(sent, false);
});

test('successful operations settle normally and remove their abort listener', async () => {
  const controller = new AbortController();
  let cleaned = 0;
  const remove = controller.signal.removeEventListener.bind(controller.signal);
  controller.signal.removeEventListener = (...args) => {
    cleaned++;
    remove(...args);
  };
  assert.equal(
    await withRequestTimeout(async () => 'saved', { signal: controller.signal, timeoutMs: 5 }),
    'saved',
  );
  assert.equal(cleaned, 1);
});
