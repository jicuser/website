import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const result = await build({
  entryPoints: [new URL('../src/context/AdminSaveContext.jsx', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
});
const context = {
  module: { exports: {} },
  require: createRequire(import.meta.url),
  window: { setTimeout: () => 0 },
};
runInNewContext(result.outputFiles[0].text, context);
const { AdminSaveProvider, useAdminSave } = context.module.exports;

// Server rendering creates the real provider and context without a browser.
// These checks exercise its registered save callbacks and return contract.
function saveWorkspace(handlers) {
  let workspace;
  function Capture() {
    workspace = useAdminSave();
    return null;
  }
  renderToStaticMarkup(React.createElement(AdminSaveProvider, null, React.createElement(Capture)));
  handlers.forEach((handler) => workspace.register(Symbol(), handler, { dirty: true }));
  return workspace;
}

test('cancelling an editor save is not reported as success and stops remaining saves', async () => {
  const calls = [];
  const workspace = saveWorkspace([
    async () => {
      calls.push('cancelled');
      return false;
    },
    async () => {
      calls.push('later editor');
    },
  ]);
  assert.equal(await workspace.saveCurrent(), false);
  assert.deepEqual(calls, ['cancelled']);
});

test('editors that resolve without a return value still count as successful saves', async () => {
  const calls = [];
  const workspace = saveWorkspace([
    async () => {
      calls.push('first');
    },
    async () => {
      calls.push('second');
      return { id: 'saved' };
    },
  ]);
  assert.equal(await workspace.saveCurrent(), true);
  assert.deepEqual(calls, ['first', 'second']);
});

test('a failed request leaves the save action available to retry', async () => {
  let attempts = 0;
  const workspace = saveWorkspace([
    async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('Connection interrupted');
    },
  ]);
  await assert.rejects(workspace.saveCurrent(), /Connection interrupted/);
  assert.equal(await workspace.saveCurrent(), true);
  assert.equal(attempts, 2);
});

test('repeated save clicks do not send the same request twice', async () => {
  let finish;
  let calls = 0;
  const workspace = saveWorkspace([
    () => {
      calls += 1;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  ]);
  const first = workspace.saveCurrent();
  assert.equal(await workspace.saveCurrent(), false);
  finish();
  assert.equal(await first, true);
  assert.equal(calls, 1);
});
