// Run `npm run build -- --manifest` first. Measures the imports awaited by
// src/main.jsx and their static dependencies, not optional route chunks.
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const manifest = JSON.parse(
  await readFile(new URL('../dist/.vite/manifest.json', import.meta.url), 'utf8'),
);
const included = new Set();
function visit(key) {
  if (included.has(key)) return;
  included.add(key);
  for (const dependency of manifest[key].imports || []) visit(dependency);
}
visit('index.html');
for (const key of manifest['index.html'].dynamicImports || []) visit(key);
const files = await Promise.all(
  [...included].map(async (key) => {
    const file = manifest[key].file;
    const bytes = await readFile(new URL(`../dist/${file}`, import.meta.url));
    return { file, bytes: bytes.length, gzip: gzipSync(bytes).length };
  }),
);
console.log(
  JSON.stringify(
    {
      initialJs: files.reduce(
        (total, file) => ({ bytes: total.bytes + file.bytes, gzip: total.gzip + file.gzip }),
        { bytes: 0, gzip: 0 },
      ),
      files,
    },
    null,
    2,
  ),
);
