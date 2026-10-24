import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';
import { GUIDED_HELP } from '../src/content/guidedHelp.js';
import { DEFAULT_SITE_DESIGN } from '../src/lib/siteDesign.js';

test('website drafts, publishing, validation and concurrent saves use server boundaries', async () => {
  const { db, as, rpc } = await formsDatabase();
  try {
    await db.exec(
      'create table public.page_content(content_key text unique,content_value text,content_type text,page text); grant select on page_content to anon,authenticated;',
    );
    await db.exec(
      await readFile(
        new URL(
          '../supabase/migrations/20261024153000_website_design_and_guidance.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const design = { ...DEFAULT_SITE_DESIGN, palette: 'forest' };
    await assert.rejects(
      as(id(5), () => rpc('save_website_design', [JSON.stringify(design), 0, false])),
      /access required/i,
    );
    assert.equal(
      await as(id(6), () => rpc('save_website_design', [JSON.stringify(design), 0, false])),
      1,
    );
    assert.equal((await as(id(5), () => db.query('select * from website_design'))).rows.length, 0);
    await assert.rejects(
      as(null, () => db.query('select * from website_design'), 'anon'),
      /permission denied/i,
    );
    assert.equal(
      (
        await as(
          null,
          () => db.query("select * from page_content where content_key='site_design'"),
          'anon',
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      as(id(6), () => rpc('save_website_design', [JSON.stringify(design), 0, true])),
      /Another editor/,
    );
    assert.equal(
      await as(id(6), () => rpc('save_website_design', [JSON.stringify(design), 1, true])),
      2,
    );
    assert.equal(
      JSON.parse(
        (await db.query("select content_value from page_content where content_key='site_design'"))
          .rows[0].content_value,
      ).palette,
      'forest',
    );
    await assert.rejects(
      as(id(6), () =>
        rpc('save_website_design', [JSON.stringify({ ...design, palette: 'script' }), 2, true]),
      ),
      /supported/,
    );
    for (const [path, guide] of Object.entries(GUIDED_HELP)) {
      const content = JSON.stringify({ title: 'Guide', guidedJourney: guide });
      await as(id(6), () => rpc('save_website_page', [path, content, null]));
      await assert.rejects(
        as(id(6), () => rpc('save_website_page', [path, content, null])),
        /Another editor/,
      );
      const looping = structuredClone(guide);
      looping.questions[0].choices[0].next = guide.start;
      await assert.rejects(
        as(id(6), () =>
          rpc('save_website_page', [path, JSON.stringify({ guidedJourney: looping }), content]),
        ),
        /looping branch/,
      );
      assert.equal(
        (
          await db.query('select content_value from page_content where content_key=$1', [
            `page:${path}`,
          ])
        ).rows[0].content_value,
        content,
      );
    }
    await assert.rejects(
      as(id(5), () => rpc('save_website_page', ['/education', '{}', null])),
      /access required/i,
    );
  } finally {
    await db.close();
  }
});
