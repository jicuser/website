import test from 'node:test';
import postcss from 'postcss';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { communityUrl } from '../src/lib/community.js';
import { internalPath } from '../src/lib/navigation.js';
import {
  createWallpaperCanvas,
  createMonthlyTimetableCanvas,
} from '../src/lib/timetableWallpaper.js';
import { buildMonthlyTimetable } from '../src/lib/monthlyTimetable.js';
import { PROGRAMMES } from '../src/content/programmes.js';

const invite = 'https://chat.whatsapp.com/EQFjZwFapIxEBWHPk6tfXB';

test('community invite survives missing, malformed and unsafe CMS settings', () => {
  for (const value of [
    null,
    '',
    'not a URL',
    'javascript:alert(1)',
    'http://chat.whatsapp.com/EQFjZwFapIxEBWHPk6tfXB',
    'https://chat.whatsapp.com.evil.test/abc',
    'https://user:password@chat.whatsapp.com/EQFjZwFapIxEBWHPk6tfXB',
  ])
    assert.equal(communityUrl(value), invite);
  assert.equal(communityUrl('  ' + invite + '  '), invite);
  assert.equal(communityUrl(invite + '?mode=invite'), invite + '?mode=invite');
  assert.equal(communityUrl('https://wa.me/441217786612'), 'https://wa.me/441217786612');
});

test('CMS navigation accepts local routes without protocol-relative or backslash redirects', () => {
  for (const value of [
    'https://example.com',
    '//example.com',
    '/\\example.com',
    '/%5cexample.com',
    '/%2fexample.com',
    '/\nexample.com',
    null,
  ])
    assert.equal(internalPath(value), '/');
  assert.equal(internalPath('/projects/gallery'), '/projects/gallery');
  assert.equal(internalPath('/contact#map'), '/contact#map');
});

test('approved logo variations have paired, self-contained vector exports', () => {
  for (const name of [
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
    for (const theme of ['light', 'dark']) {
      const svg = readFileSync(
        new URL(`../public/brand/jic-${name}-${theme}.svg`, import.meta.url),
        'utf8',
      );
      assert.match(svg, /<svg[^>]+viewBox="0 0 \d+ \d+"/);
      assert.match(svg, /<title[^>]*>Jamatia Islamic Centre/);
      assert.match(svg, /<path /);
      assert.doesNotMatch(svg, /<(?:image|text|script|foreignObject)\b|data:image|@font-face/);
      assert.doesNotMatch(svg, /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)/);
      assert.doesNotMatch(svg, /#89501B|#D6AF62/);
      assert.ok(existsSync(new URL(`../public/brand/jic-${name}-${theme}.png`, import.meta.url)));
      if (['horizontal', 'centred', 'compact', 'wordmark', 'pillars'].includes(name)) {
        assert.ok(svg.includes(theme === 'light' ? '#06162f' : '#F4F6FA'));
      }
    }
  }
});

test('each programme uses a real local poster and an existing content destination', () => {
  assert.equal(new Set(PROGRAMMES.map((programme) => programme.id)).size, PROGRAMMES.length);
  const destinations = ['/youth/classes-skills', '/madrassah/classes-courses', '/worship'];
  for (const programme of PROGRAMMES) {
    assert.ok(existsSync(new URL(`../public${programme.image}`, import.meta.url)));
    assert.ok(destinations.includes(programme.to));
    assert.ok(programme.alt.length > 80);
    assert.ok(Array.isArray(programme.groups));
    assert.ok(
      programme.groups.every((group) =>
        ['home', 'worship', 'education', 'youth', 'madrassah', 'services', 'about'].includes(group),
      ),
    );
  }
});

function contrast(first, second) {
  const luminance = (hex) => {
    const rgb = hex
      .match(/[a-f0-9]{2}/gi)
      .map((part) => parseInt(part, 16) / 255)
      .map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
      );
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
test('main solid-surface text and filled-button pairs meet 4.5:1 contrast', () => {
  for (const pair of [
    ['#0C1930', '#FAFBFD'],
    ['#89501B', '#FAFBFD'],
    ['#697486', '#FAFBFD'],
    ['#F4F6FA', '#152238'],
    ['#B7C3D5', '#152238'],
    ['#D6AF62', '#152238'],
    ['#0C1930', '#D6AF62'],
  ])
    assert.ok(contrast(...pair) >= 4.5, `${pair.join(' / ')} must be readable`);
});

test('coloured actions keep readable text over dark and bright backgrounds in both modes', () => {
  const readRules = (file) =>
    postcss.parse(readFileSync(new URL(file, import.meta.url), 'utf8')).nodes;
  const rules = [
    ...readRules('../src/styles/theme.css'),
    ...readRules('../src/styles/liquid-glass.css'),
    ...readRules('../src/styles/footer.css'),
  ];
  const normalise = (selector) => selector.replace(/["']/g, '').replace(/\s+/g, ' ').trim();
  const tokensFor = (selector) =>
    Object.assign(
      {},
      ...rules
        .filter((rule) => rule.type === 'rule' && normalise(rule.selector) === selector)
        .map((rule) =>
          Object.fromEntries(
            rule.nodes
              .filter((node) => node.type === 'decl')
              .map((node) => [node.prop, node.value]),
          ),
        ),
    );
  const selectors = [
    'html[data-theme] .jic-community-join',
    'html[data-theme] .jic-watch-live',
    'html[data-theme] .jic-menu-trigger',
    'html[data-theme] :is(.jic-hall-contact a, .jic-public-route .bg-primary)',
    'html[data-theme] .jic-public-route .bg-destructive',
    '.jic-footer-donate',
  ];
  const rgb = (hex) => {
    const value = hex.slice(1);
    return (value.length === 3 ? [...value].map((part) => part + part).join('') : value)
      .match(/../g)
      .map((part) => parseInt(part, 16));
  };
  for (const theme of ['light', 'dark']) {
    for (const surface of ['glass', 'solid']) {
      for (const selector of selectors) {
        const tokens = {
          ...tokensFor(':root'),
          ...(theme === 'dark' ? tokensFor('.dark') : {}),
          ...tokensFor('html[data-theme]'),
          ...(theme === 'dark' ? tokensFor('html[data-theme=dark]') : {}),
          ...(surface === 'solid' ? tokensFor('html[data-theme][data-surface=solid]') : {}),
          ...tokensFor(selector),
        };
        const resolve = (value) =>
          value.replace(/var\((--[\w-]+)\)/g, (_, name) => resolve(tokens[name]));
        const tint = rgb(resolve(tokens['--jic-button-tint']));
        const ink = resolve(tokens['--jic-button-ink']);
        const alpha = parseFloat(resolve(tokens['--jic-button-tint-strength'])) / 100;
        const sheen = tokens['--jic-glass-action-sheen'];
        const sheenAlpha =
          sheen === 'none' ? 0 : Number(sheen.match(/rgba\(255,\s*255,\s*255,\s*([\d.]+)/)[1]);
        for (const background of [0, 255]) {
          for (const highlight of [0, sheenAlpha]) {
            const composite =
              '#' +
              tint
                .map((channel) =>
                  Math.round(
                    (channel * alpha + background * (1 - alpha)) * (1 - highlight) +
                      255 * highlight,
                  )
                    .toString(16)
                    .padStart(2, '0'),
                )
                .join('');
            const inkHex =
              '#' +
              rgb(ink)
                .map((channel) => channel.toString(16).padStart(2, '0'))
                .join('');
            assert.ok(
              contrast(inkHex, composite) >= 4.5,
              `${theme}/${surface} ${selector}: ${inkHex} over ${composite}`,
            );
          }
        }
      }
    }
  }
});

test('glass text retains 4.5:1 contrast over the page veil at both photo extremes', () => {
  const css = readFileSync(new URL('../src/styles/liquid-glass.css', import.meta.url), 'utf8');
  for (const selector of ['html[data-theme]', 'html[data-theme=dark]']) {
    const rule = postcss
      .parse(css)
      .nodes.find(
        (node) => node.type === 'rule' && node.selector.replace(/["']/g, '') === selector,
      );
    assert.ok(rule, `Missing glass palette: ${selector}`);
    const tokens = Object.fromEntries(
      rule.nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value]),
    );
    for (const route of ['', ' .jic-inner-route']) {
      const veilSelector =
        route && selector === 'html[data-theme]' ? 'html[data-theme=light]' : selector;
      const veilRule = postcss
        .parse(readFileSync(new URL('../src/styles/home.css', import.meta.url), 'utf8'))
        .nodes.find(
          (node) =>
            node.type === 'rule' && node.selector.replace(/[\"']/g, '') === veilSelector + route,
        );
      const veil = veilRule.nodes
        .find((node) => node.prop === '--jic-photo-veil')
        .value.match(/[\d.]+/g)
        .map(Number);
      for (const material of [
        '--jic-glass-control',
        '--jic-glass-tile',
        '--jic-glass-panel',
        '--jic-glass-panel-strong',
      ]) {
        const [r, g, b, alpha] = tokens[material].match(/[\d.]+/g).map(Number);
        const colours = ['ink', 'muted', 'accent'].map((role) => tokens[`--jic-glass-${role}`]);
        const sheenAlpha = 0.18;
        for (const sheen of [0, sheenAlpha]) {
          for (const background of [0, 255]) {
            const composite =
              '#' +
              [r, g, b]
                .map((channel, index) =>
                  Math.round(
                    (Number(channel) * Number(alpha) +
                      (veil[index] * veil[3] + background * (1 - veil[3])) * (1 - Number(alpha))) *
                      (1 - sheen) +
                      255 * sheen,
                  )
                    .toString(16)
                    .padStart(2, '0'),
                )
                .join('');
            for (const colour of colours)
              assert.ok(
                contrast(colour, composite) >= 4.5,
                `${selector}: ${colour} over ${composite}`,
              );
          }
        }
      }
    }
  }
});

test('31-day wallpaper fits the canvas, includes Sunrise, and never invents a Jamaah time', () => {
  const calls = [];
  const gradient = { addColorStop() {} };
  const ctx = {
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    fillText: (...args) => calls.push(args),
  };
  for (const method of [
    'fillRect',
    'beginPath',
    'moveTo',
    'arcTo',
    'closePath',
    'fill',
    'stroke',
    'quadraticCurveTo',
    'lineTo',
  ])
    ctx[method] = () => {};
  const canvas = { getContext: () => ctx };
  const previous = globalThis.document;
  globalThis.document = { createElement: () => canvas };
  try {
    assert.equal(createWallpaperCanvas([], 'October 2026'), undefined);
    const rows = Array.from({ length: 31 }, (_, index) => ({
      day: index + 1,
      dayName: 'Thu',
      d_date: `${index + 1} Oct 2026`,
      fajr_begins: '05:15 AM',
      fajr_jamah: null,
      sunrise: '06:30 AM',
      zuhr_begins: '01:09 PM',
      zuhr_jamah: '01:45 PM',
    }));
    assert.equal(createWallpaperCanvas(rows, 'October 2026'), canvas);
    assert.equal(canvas.width, 1290);
    assert.equal(canvas.height, 2796);
    assert.ok(calls.some(([text]) => text === 'SUNRISE'));
    assert.ok(calls.some(([text]) => text === 'October 2026 Prayer Times'));
    assert.ok(calls.some(([text]) => text === '31'));
    const model = buildMonthlyTimetable(rows);
    const timeCalls = calls.filter(([, , y]) => y > 650 && y < 2510);
    assert.equal(timeCalls.filter(([text]) => text === '5:15').length, 31);
    assert.equal(
      model.rows.filter((row) => row.cells.find((cell) => cell.key === 'fajr_jamah').value === '—')
        .length,
      31,
    );
    assert.ok(timeCalls.filter(([text]) => text === '—').length >= 31);
    assert.ok(calls.every(([, x, y]) => x >= 0 && x <= 1290 && y >= 300 && y < 2796));
    calls.length = 0;
    assert.equal(createMonthlyTimetableCanvas(rows, 'October 2026'), canvas);
    assert.equal(canvas.width, 1800);
    assert.equal(canvas.height, 2220);
    assert.ok(calls.some(([text]) => text === '31'));
    assert.ok(calls.every(([, x, y]) => x >= 0 && x <= 1800 && y >= 0 && y < 2220));
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});
