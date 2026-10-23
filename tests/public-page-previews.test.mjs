import test from 'node:test';
import assert from 'node:assert/strict';
import { pageMetadata } from '../src/lib/pageMetadata.js';
import { pagePreviews, withPageHead } from '../scripts/page-previews.mjs';

const env = {
  VITE_SUPABASE_URL: 'https://previews-test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_public-preview-test',
};
const html =
  '<html><head><!-- jic:metadata:start --><title>Old</title><!-- jic:metadata:end --></head><body><div id="root"></div><script src="/assets/site.js"></script></body></html>';

// Match the existing anonymous RPC contracts, including the fields the build
// must discard. Form titles/descriptions belong to the published version.
const responses = {
  list_public_forms: [
    {
      id: 'form-id',
      slug: 'hall-booking',
      title: 'Hall & event booking',
      description: 'Ask about <b>hall availability</b> and tell us about your event.',
      version: 2,
      schema: { private_marker: 'discard-form-schema' },
      created_by: 'discard-form-owner',
    },
    { slug: 'draft-form', title: 'Draft form', description: 'Hidden', version: 1, enabled: false },
  ],
  list_site_pages: [
    {
      id: 'programme-id',
      slug: 'weekly-quran',
      title: 'Weekly Qur’an',
      image_url: '/posters/weekly-quran.jpg',
      placement: '/education',
      kind: 'course',
      schedule: 'Every Saturday at 10am',
      registration: 'registration',
      source_poster_id: 'quran-poster',
    },
    { slug: 'withdrawn-page', title: 'Was public', placement: '/education' },
    { slug: 'draft-page', title: 'Private draft', published: false },
  ],
  get_site_page: {
    id: 'programme-id',
    slug: 'weekly-quran',
    title: 'Weekly Qur’an',
    body: 'Learn together at Jamatia Islamic Centre.',
    image_url: '/posters/weekly-quran.jpg',
    placement: '/education',
    kind: 'course',
    schedule: 'Every Saturday at 10am',
    registration: 'registration',
    source_poster_id: 'quran-poster',
    form: { id: 'form-id', slug: 'quran-application', open: true },
    created_by: 'discard-page-owner',
  },
  public_community_campaigns: [
    {
      id: 'campaign-id',
      slug: 'support-the-centre',
      reference: 'JIC-EXAMPLE',
      title: 'Support our centre',
      organiser: 'Public organiser',
      story: 'Help sustain our centre and its community work in Birmingham.',
      category: 'community',
      target_pence: 100000,
      status: 'published',
      raised_pence: 0,
      created_at: '2026-10-01T00:00:00Z',
      review_note: 'discard-private-review',
      owner_id: 'discard-campaign-owner',
    },
    { slug: 'pending-campaign', title: 'Private pending campaign', status: 'pending' },
  ],
};

function publicApi(overrides = {}) {
  return async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, 'https://previews-test.supabase.co');
    assert.equal(options.method, 'POST');
    assert.equal(new Headers(options.headers).get('apikey'), env.VITE_SUPABASE_ANON_KEY);
    assert.notEqual(
      new Headers(options.headers).get('authorization'),
      `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
    );
    const name = url.pathname.split('/').pop();
    assert.ok(name in responses, `Unexpected RPC: ${name}`);
    const body = JSON.parse(options.body);
    if (name === 'get_site_page') {
      assert.ok(['weekly-quran', 'withdrawn-page'].includes(body.p_slug));
      if (body.p_slug === 'withdrawn-page') return Response.json(null);
    }
    return Response.json(Object.hasOwn(overrides, name) ? overrides[name] : responses[name]);
  };
}

async function generate(options = {}) {
  const files = new Map();
  const warnings = [];
  const plugin = pagePreviews({ env, fetchImpl: publicApi(), ...options });
  await plugin.generateBundle.call(
    {
      emitFile: ({ fileName, source }) => files.set(fileName, String(source)),
      warn: (message) => warnings.push(String(message)),
      error: (message) => {
        throw new Error(message);
      },
    },
    {},
    { 'index.html': { type: 'asset', source: html } },
  );
  return { files, warnings };
}

test('published forms, programme details and approved campaigns are present in crawler HTML', async () => {
  const { files } = await generate();
  const form = files.get('forms/hall-booking/index.html');
  assert.ok(form, 'The public form needs its own HTML document');
  assert.match(form, /<title>Hall &amp; event booking \| Jamatia Islamic Centre<\/title>/);
  assert.match(form, /content="Ask about hall availability and tell us about your event\."/);
  assert.match(form, /rel="canonical" href="https:\/\/www\.jicmasjid\.org\/forms\/hall-booking"/);
  assert.match(form, /property="og:title" content="Hall &amp; event booking/);
  assert.match(form, /name="twitter:title" content="Hall &amp; event booking/);
  assert.match(form, /src="\/assets\/site.js"/);
  assert.equal((form.match(/rel="canonical"/g) || []).length, 1);

  const programme = files.get('pages/weekly-quran/index.html');
  assert.match(programme, /Every Saturday at 10am Learn together at Jamatia Islamic Centre\./);
  assert.match(programme, /https:\/\/www\.jicmasjid\.org\/posters\/weekly-quran\.jpg/);
  assert.match(files.get('fundraise/support-the-centre/index.html'), /Support our centre \|/);

  const sitemap = files.get('sitemap.xml');
  for (const path of [
    '/forms/hall-booking',
    '/pages/weekly-quran',
    '/fundraise/support-the-centre',
  ])
    assert.ok(sitemap.includes(`https://www.jicmasjid.org${path}</loc>`));
  for (const slug of ['draft-form', 'draft-page', 'withdrawn-page', 'pending-campaign']) {
    assert.ok(![...files.keys()].some((path) => path.includes(slug)));
    assert.ok(!sitemap.includes(slug));
  }
});

test('the emitted metadata manifest exposes only normalized public preview fields', async () => {
  const { files } = await generate();
  const json = files.get('page-metadata.json');
  assert.ok(json, 'Publish a reviewable metadata manifest');
  const manifest = JSON.parse(json);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.source, 'public-api');
  assert.equal(manifest.pages.length, 3);
  assert.deepEqual(
    manifest.pages.find(({ path }) => path === '/forms/hall-booking'),
    {
      path: '/forms/hall-booking',
      title: 'Hall & event booking | Jamatia Islamic Centre',
      description: 'Ask about hall availability and tell us about your event.',
      url: 'https://www.jicmasjid.org/forms/hall-booking',
      image: 'https://www.jicmasjid.org/jic-aerial-sunset.jpg',
      imageAlt: 'Jamatia Islamic Centre, Woodlands Road, Birmingham',
      noindex: false,
    },
  );
  assert.ok(![...files.values()].join('').includes('discard-'));
  assert.ok(!json.includes(env.VITE_SUPABASE_ANON_KEY));
});

test('a public API error stops the build without disclosing the response or credentials', async () => {
  await assert.rejects(
    generate({
      fetchImpl: async () =>
        new Response(`private-debug ${env.VITE_SUPABASE_ANON_KEY}`, { status: 503 }),
    }),
    (error) => {
      assert.match(error.message, /public.*preview/i);
      assert.match(error.message, /HTTP 503/);
      assert.ok(!error.message.includes('private-debug'));
      assert.ok(!error.message.includes(env.VITE_SUPABASE_ANON_KEY));
      return true;
    },
  );
});

test('network errors and invalid JSON stop publication without leaking upstream diagnostics', async () => {
  for (const fetchImpl of [
    async () => {
      throw new Error(`network-debug ${env.VITE_SUPABASE_ANON_KEY}`);
    },
    async () => new Response('private-invalid-json'),
  ])
    await assert.rejects(generate({ fetchImpl }), (error) => {
      assert.match(error.message, /Public page previews:/);
      assert.ok(!error.message.includes(env.VITE_SUPABASE_ANON_KEY));
      assert.ok(!error.message.includes('private-invalid-json'));
      assert.ok(!error.message.includes('network-debug'));
      return true;
    });
});

test('a slow public API is bounded by the build request timeout', async () => {
  await assert.rejects(
    generate({
      timeoutMs: 10,
      fetchImpl: (_url, { signal }) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(Response.json([])), 1000);
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              reject(signal.reason);
            },
            { once: true },
          );
        }),
    }),
    /Public page previews:.*timeout/,
  );
});

test('closed approved campaigns remain discoverable while rejected campaigns stay out', async () => {
  const { files } = await generate({
    fetchImpl: publicApi({
      public_community_campaigns: [
        {
          slug: 'closed-campaign',
          title: 'A completed fundraiser',
          story: 'Thank you for supporting our centre.',
          status: 'closed',
        },
        {
          slug: 'rejected-campaign',
          title: 'Private rejected title',
          story: 'Private story',
          status: 'rejected',
        },
      ],
    }),
  });
  assert.match(files.get('fundraise/closed-campaign/index.html'), /A completed fundraiser/);
  assert.ok(files.get('sitemap.xml').includes('/fundraise/closed-campaign'));
  assert.ok(![...files.values()].join('').includes('Private rejected title'));
});

test('public catalogue caps warn instead of silently claiming complete discovery', async () => {
  const { warnings } = await generate({
    fetchImpl: publicApi({
      list_public_forms: Array.from({ length: 200 }, (_, index) => ({
        slug: `public-form-${index}`,
        title: `Form ${index}`,
        description: 'A published introduction.',
        version: 1,
      })),
    }),
  });
  assert.ok(warnings.some((message) => /list_public_forms.*200-record API limit/.test(message)));
});

test('malformed API data cannot emit traversal routes or silently omit a broken catalogue', async () => {
  for (const value of [null, {}, [{ slug: '../admin', title: 'Unsafe form', version: 1 }]])
    await assert.rejects(
      generate({ fetchImpl: publicApi({ list_public_forms: value }) }),
      /list_public_forms.*(response|metadata)/,
    );
});

test('offline validation explicitly disables public fetching and records the omission', async () => {
  const { files, warnings } = await generate({
    env: { ...env, JIC_PUBLIC_PREVIEWS: 'off' },
    fetchImpl: async () => assert.fail('An offline build must not fetch public metadata'),
  });
  assert.ok(files.has('page-metadata.json'));
  const manifest = JSON.parse(files.get('page-metadata.json'));
  assert.equal(manifest.source, 'disabled');
  assert.deepEqual(manifest.pages, []);
  assert.ok(warnings.some((message) => /disabled/.test(message)));
  assert.ok(files.has('education/index.html'));
});

test('the offline switch cannot silently accept a typo', async () => {
  await assert.rejects(
    generate({ env: { ...env, JIC_PUBLIC_PREVIEWS: 'false' } }),
    /JIC_PUBLIC_PREVIEWS.*on or off/,
  );
});

test('a public record cannot replace a reserved private route', async () => {
  await assert.rejects(
    generate({
      fetchImpl: publicApi({
        public_community_campaigns: [
          {
            slug: 'new',
            title: 'Reserved route',
            story: 'Do not replace the private fundraiser editor.',
            status: 'published',
          },
        ],
      }),
    }),
    /reserved.*path/,
  );
});

test('unknown and unpublished routes have a generic noindex fallback without a false canonical', async () => {
  const { files } = await generate();
  const fallback = files.get('metadata-fallback/index.html');
  assert.ok(fallback);
  assert.match(fallback, /name="robots" content="noindex, nofollow"/);
  assert.ok(!fallback.includes('rel="canonical"'));
  assert.ok(!fallback.includes('property="og:url"'));
  assert.ok(!fallback.includes('application/ld+json'));
});

test('dynamic preview overrides preserve a clean canonical when links include query context', () => {
  const output = withPageHead(html, '/forms/hall-booking?programme=weekly-quran#apply', {
    title: 'Hall booking',
    description: 'Send your enquiry.',
  });
  assert.match(output, /Hall booking \| Jamatia Islamic Centre/);
  assert.match(output, /href="https:\/\/www\.jicmasjid\.org\/forms\/hall-booking"/);
  assert.ok(!output.includes('?programme='));
  assert.ok(!output.includes('#apply'));
});

test('published dollar signs and markup are escaped as text without duplicating the HTML head', () => {
  const output = withPageHead(html, '/forms/hall-booking', {
    title: 'Hall $& <booking>',
    description: 'Use $& for your enquiry.',
  });
  assert.match(output, /<title>Hall \$&amp; &lt;booking&gt; \| Jamatia Islamic Centre<\/title>/);
  assert.ok(!output.includes('<title>Old'));
  assert.equal((output.match(/rel="canonical"/g) || []).length, 1);
});

test('a caller cannot turn off private-route noindex or mislabel a rejected preview image', () => {
  assert.equal(pageMetadata('/admin/login', { title: 'Admin', noindex: false }).noindex, true);
  const meta = pageMetadata('/forms/hall-booking', {
    title: 'Hall booking',
    image: 'javascript:bad()',
  });
  assert.equal(meta.imageAlt, 'Jamatia Islamic Centre, Woodlands Road, Birmingham');
});
