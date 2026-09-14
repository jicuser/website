import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const kind of ['invite', 'recovery']) {
  test(`${kind} email is branded and preserves the Auth verification link`, async () => {
    const html = await readFile(new URL(`../supabase/email-templates/${kind}.html`, import.meta.url), 'utf8');
    assert.match(html, /Jamatia Islamic Centre/);
    assert.match(html, /lang="en"/);
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(links, ['{{ .ConfirmationURL }}']);
    assert.doesNotMatch(html, /vercel|hostingersite|powered by|supabase auth|<script|<img/i);
    assert.doesNotMatch(html, /\{\{\s*\.(?:Token|Data)/);
  });
}
