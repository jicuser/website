import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

test('public forms Edge entry has a self-contained website-only import graph', async () => {
  const result = await build({
    entryPoints: ['supabase/functions/custom-forms/index.ts'],
    bundle: true,
    write: false,
    platform: 'neutral',
    format: 'esm',
    external: ['npm:*'],
    metafile: true,
  });
  assert.ok(result.outputFiles[0].text.includes('Deno.serve'));
  assert.equal(
    Object.keys(result.metafile.inputs).some((path) => /push-worker|learning|payment/.test(path)),
    false,
  );
});
test('public forms do not direct visitors to a deferred account portal', async () => {
  const source = await readFile('src/pages/PublicFormPage.jsx', 'utf8');
  assert.doesNotMatch(source, /to="\/portal"/);
});
