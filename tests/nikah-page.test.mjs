import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const stubs = {
  '@/context/ContentContext':
    'export const useContent=()=>({getContent:(key,fallback)=>globalThis.content[key] ?? fallback});',
  'react-router-dom':
    'export const Link=({to,children,...props})=>globalThis.React.createElement("a",{href:to,...props},children); export const useLocation=()=>({pathname:"/services/nikah",hash:""});',
  '@/components/ManagedPageSections': 'export default function Sections(){return null;}',
  '@/components/sections/BuiltInForm': 'export default function Form(){return null;}',
};
const root = new URL('../', import.meta.url).pathname;
const result = await build({
  entryPoints: [`${root}src/features/nikah/NikahPage.jsx`],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  alias: { '@': `${root}src` },
  plugins: [
    {
      name: 'nikah-render-fixture',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, ({ path }) =>
          Object.hasOwn(stubs, path)
            ? { path, namespace: 'fixture' }
            : path.endsWith('.css')
              ? { path, namespace: 'css' }
              : null,
        );
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
          contents: stubs[path],
          resolveDir: root,
        }));
        builder.onLoad({ filter: /.*/, namespace: 'css' }, () => ({ contents: '' }));
      },
    },
  ],
});

test('Nikah renders its real icons, compact heading, photo slots and on-demand booking controls', () => {
  for (const content of [
    {},
    {
      nikah_venue: JSON.stringify({
        mens_hall: {
          photos: [{ url: '/actual-hall.jpg', alt: 'Published men’s hall photograph' }],
        },
        ladies_hall: { visible: false },
      }),
    },
  ]) {
    const context = { module: { exports: {} }, require, content, console, React, URL };
    runInNewContext(result.outputFiles[0].text, context);
    const html = renderToStaticMarkup(React.createElement(context.module.exports.default));
    assert.equal((html.match(/<h1/g) || []).length, 1);
    assert.ok(
      html.includes('Book Nikah') && html.includes('Book hall') && html.includes('View facilities'),
    );
    assert.match(html, /id="enquire"[^>]*hidden=""/);
    assert.ok(
      !html.includes('tel:') &&
        !html.includes('Guide me') &&
        !html.includes('Plan your Nikah with a clear conversation'),
    );
    assert.ok(html.includes('Kitchen &amp; serving area'));
    if (content.nikah_venue) {
      assert.ok(html.includes('/actual-hall.jpg'));
      assert.ok(!html.includes('Ladies’ hall'));
    }
  }
});
