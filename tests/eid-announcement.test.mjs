import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { parseEidAnnouncement, publishedEidAnnouncement } from '../src/lib/eidAnnouncement.js';
import * as model from '../src/lib/eidAnnouncement.js';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/shell/EidAnnouncement.jsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

function render(raw) {
  const mod = { exports: {} };
  const dependencies = {
    react: React,
    'lucide-react': require('lucide-react'),
    '@/context/ContentContext': { useContent: () => ({ getContent: () => raw }) },
    '@/lib/eidAnnouncement': model,
    '@/styles/eid-announcement.css': {},
  };
  new Function('require', 'module', 'exports', compiled)((name) => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  }, mod, mod.exports);
  return renderToStaticMarkup(React.createElement(mod.exports.default));
}

test('Eid announcement is hidden by default and malformed values cannot enable it', () => {
  for (const raw of [undefined, '', '{}', 'invalid', 'null', '[]', '{"enabled":"true","message":"Test"}', '{"enabled":1,"message":"Test"}']) {
    assert.equal(publishedEidAnnouncement(raw), null);
    assert.equal(render(raw), '');
  }
});

test('enabled Eid text is rendered, and switching off retains the saved message privately', () => {
  const announcement = { enabled: true, title: 'Eid update', message: 'Please check the confirmed Salah times.' };
  const html = render(JSON.stringify(announcement));
  assert.match(html, /aria-label="Eid announcement"/);
  assert.match(html, /Eid update/);
  assert.match(html, /Please check the confirmed Salah times\./);
  const disabled = JSON.stringify({ ...announcement, enabled: false });
  assert.equal(render(disabled), '');
  assert.equal(parseEidAnnouncement(disabled).message, announcement.message);
});

test('enabled but blank notices stay hidden and no dates or prayer times are supplied by defaults', () => {
  assert.equal(render('{"enabled":true,"message":"  "}'), '');
  assert.deepEqual(parseEidAnnouncement(''), {
    enabled: false,
    title: 'Eid announcement',
    message: '',
  });
});

test('Eid announcements remain bounded plain text and cannot create links or scripts', () => {
  const raw = JSON.stringify({ enabled: true, title: 'x'.repeat(100), message: '<script>alert(1)</script><a href="https://example.com">Eid</a>' });
  assert.equal(parseEidAnnouncement(raw).title.length, 80);
  assert.equal(parseEidAnnouncement(JSON.stringify({ message: 'x'.repeat(500) })).message.length, 360);
  const html = render(raw);
  assert.doesNotMatch(html, /<script|<a /);
  assert.match(html, /&lt;script&gt;/);
});
