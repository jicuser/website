import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url).pathname;
async function render(file, props = {}, content = {}, can = () => false) {
  const stubs = {
    '@/context/AuthContext': 'export const useAuth=()=>({can:globalThis.can});',
    '@/context/ContentContext':
      'export const useContent=()=>({getContent:(key,fallback)=>globalThis.content[key]??fallback});',
    'react-router-dom':
      'export const Link=({to,children,...props})=>globalThis.React.createElement("a",{href:to,...props},children); export const useLocation=()=>({pathname:"/education",hash:""});',
    '@/features/guidance/GuidancePanel': 'export default function Guide(){return null}',
  };
  const result = await build({
    entryPoints: [`${root}${file}`],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    write: false,
    alias: { '@': `${root}src` },
    plugins: [
      {
        name: 'fixture',
        setup(b) {
          b.onResolve({ filter: /.*/ }, ({ path }) =>
            Object.hasOwn(stubs, path)
              ? { path, namespace: 'fixture' }
              : path.endsWith('.css')
                ? { path, namespace: 'style' }
                : null,
          );
          b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
            contents: stubs[path],
            resolveDir: root,
          }));
          b.onLoad({ filter: /.*/, namespace: 'style' }, () => ({ contents: '' }));
        },
      },
    ],
  });
  const context = { module: { exports: {} }, require, console, React, URL, content, can };
  runInNewContext(result.outputFiles[0].text, context);
  return renderToStaticMarkup(React.createElement(context.module.exports.default, props));
}
test('page headings render optional context without another heading or fabricated artwork', async () => {
  const html = await render('src/components/PageHeading.jsx', {
    title: 'Madrassah',
    eyebrow: 'Learning at JIC',
    children: 'Choose the next step for your child.',
  });
  assert.match(html, /jic-page-eyebrow/);
  assert.match(html, /Learning at JIC/);
  assert.equal((html.match(/<h1/g) || []).length, 1);
  assert.doesNotMatch(html, /<img/);
});
test('featured choices preserve page visibility and accessible destination names', async () => {
  const items = [
    {
      path: '/madrassah/enrolment',
      title: 'Apply for a place',
      description: 'Pupil enrolment',
      featured: true,
    },
    { path: '/youth', title: 'Youth' },
  ];
  const html = await render(
    'src/components/PageChoices.jsx',
    { items, label: 'Next steps' },
    { 'page-visibility:/youth': 'false' },
  );
  assert.match(html, /jic-page-choice is-featured/);
  assert.match(html, /Apply for a place/);
  assert.doesNotMatch(html, /href="\/youth"/);
});
test('Madrasah makes admissions and parent information immediate and keeps adult learning separate', async () => {
  const html = await render('src/pages/MadrassahPage.jsx');
  assert.match(html, /Learning at JIC/);
  assert.match(html, /href="\/madrassah\/enrolment"[^>]*is-featured/);
  assert.match(html, /href="\/madrassah\/student-portal"/);
  assert.match(html, /About our Madrassah/);
});
test('pupil class content no longer mixes an adult course tab into Madrasah', () => {
  const source = readFileSync(
    `${root}src/components/sections/madrassah/ProgramsSection.jsx`,
    'utf8',
  );
  assert.doesNotMatch(source, /<TabsTrigger value="adults"/);
  assert.doesNotMatch(source, /images\.unsplash\.com/);
  assert.match(source, /\/education\/courses/);
});

test('staff quick finder exposes permitted tools only and keeps the section selector independent', async () => {
  const path = 'src/features/admin/AdminQuickFind.jsx';
  assert.ok(existsSync(`${root}${path}`), 'Quick finder component is missing');
  const html = await render(
    path,
    { onChoose: () => {}, active: 'forms' },
    {},
    (permission) => permission === 'forms',
  );
  assert.match(html, /Find a staff tool/);
  assert.match(html, /Forms/);
  assert.doesNotMatch(html, /Website pages|Finance|User access/);
});
test('learning sections expose keyboard-ready tabs without replacing course data', async () => {
  const path = 'src/components/workspace/LearningTabs.jsx';
  assert.ok(existsSync(`${root}${path}`), 'Learning navigation is missing');
  const html = await render(path, { value: 'progress', onChange: () => {} });
  assert.match(html, /role="tablist" aria-label="Course sections"/);
  assert.equal((html.match(/role="tab"/g) || []).length, 6);
  assert.match(html, /id="learning-tab-progress"[^>]*aria-selected="true"/);
  for (const title of ['Progress', 'Resources', 'Attendance', 'Meetings', 'Student work', 'Fees'])
    assert.ok(html.includes(title), title);
});
