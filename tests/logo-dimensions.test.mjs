import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const compiled = await build({
  entryPoints: [new URL('../src/components/shell/JamatiaLogo.jsx', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  plugins: [
    {
      name: 'appearance-fixture',
      setup(builder) {
        builder.onResolve({ filter: /^@\/context\/AppearanceContext$/ }, () => ({
          path: 'appearance',
          namespace: 'fixture',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
          contents: 'export const useAppearance = () => ({theme:"dark"});',
        }));
        builder.onResolve({ filter: /^@\/lib\/utils$/ }, () => ({
          path: new URL('../src/lib/utils.js', import.meta.url).pathname,
        }));
      },
    },
  ],
});
const context = { module: { exports: {} }, require: createRequire(import.meta.url) };
runInNewContext(compiled.outputFiles[0].text, context);
const Logo = context.module.exports.default;

test('every logo reserves its actual SVG proportions before the image loads', () => {
  for (const variant of [
    'horizontal',
    'centred',
    'compact',
    'wordmark',
    'entrance',
    'minaret',
    'minaret-compact',
    'pillars',
    'arch',
  ]) {
    const markup = renderToStaticMarkup(React.createElement(Logo, { variant }));
    for (const theme of ['dark', 'light']) {
      const svg = readFileSync(
        new URL(`../public/brand/jic-${variant}-${theme}.svg`, import.meta.url),
        'utf8',
      );
      const [, width, height] = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
      assert.ok(markup.includes(`width="${width}"`), variant);
      assert.ok(markup.includes(`height="${height}"`), variant);
    }
  }
});

test('unknown logo names use the complete default logo', () => {
  for (const variant of ['unknown', 'constructor', '__proto__']) {
    const markup = renderToStaticMarkup(React.createElement(Logo, { variant }));
    assert.ok(markup.includes('jic-horizontal-dark.svg'));
    assert.ok(markup.includes('width="2620"'));
    assert.ok(markup.includes('height="1144"'));
  }
});
