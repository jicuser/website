import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Vite's default HTML discovery includes archived backup applications. Keep
// the live SPA entry explicit so obsolete imports cannot break dev/test startup.
test('Vite scans only the live SPA entry, not archived HTML applications', async () => {
  const config = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
  assert.match(
    config,
    /optimizeDeps:\s*\{\s*entries:\s*\[\s*['"]index\.html['"]\s*,?\s*\]\s*,?\s*\}/,
    'Set optimizeDeps.entries to index.html instead of discovering backup HTML files',
  );
});
