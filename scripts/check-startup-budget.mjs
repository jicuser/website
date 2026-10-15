import fs from 'node:fs';
import { gzipSync } from 'node:zlib';

// Run after `npm run build -- --manifest`. main.jsx loads these bootstrap
// modules together; page-level dynamic imports are deliberately not counted.
const manifest = JSON.parse(fs.readFileSync('dist/.vite/manifest.json', 'utf8'));
const entry = Object.keys(manifest).find((key) => manifest[key].isEntry);
const visited = new Set();
function visit(key) {
  if (visited.has(key)) return;
  visited.add(key);
  for (const dependency of manifest[key]?.imports || []) visit(dependency);
}
for (const key of [entry, ...(manifest[entry].dynamicImports || [])]) visit(key);
const files = [...visited].map((key) => manifest[key]?.file).filter(Boolean);
const gzipBytes = files.reduce(
  (total, file) => total + gzipSync(fs.readFileSync(`dist/${file}`)).length,
  0,
);
console.log(`Startup JavaScript: ${gzipBytes} gzip bytes (budget: 240000).`);
if (gzipBytes > 240000)
  throw new Error('Startup JavaScript exceeded its budget. Inspect eager imports.');
