import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { communityUrl } from '../src/lib/community.js';
import { internalPath } from '../src/lib/navigation.js';
import { createWallpaperCanvas } from '../src/lib/timetableWallpaper.js';
import { PROGRAMMES } from '../src/content/programmes.js';

const invite = 'https://chat.whatsapp.com/EQFjZwFapIxEBWHPk6tfXB';

test('community invite survives missing, malformed and unsafe CMS settings', () => {
  for (const value of [null, '', 'not a URL', 'javascript:alert(1)', 'http://chat.whatsapp.com/EQFjZwFapIxEBWHPk6tfXB', 'https://chat.whatsapp.com.evil.test/abc', 'https://user:password@chat.whatsapp.com/EQFjZwFapIxEBWHPk6tfXB']) assert.equal(communityUrl(value), invite);
  assert.equal(communityUrl('  ' + invite + '  '), invite);
  assert.equal(communityUrl(invite + '?mode=invite'), invite + '?mode=invite');
  assert.equal(communityUrl('https://wa.me/441217786612'), 'https://wa.me/441217786612');
});

test('CMS navigation accepts local routes without protocol-relative or backslash redirects', () => {
  for (const value of ['https://example.com', '//example.com', '/\\example.com', '/%5cexample.com', '/%2fexample.com', '/\nexample.com', null]) assert.equal(internalPath(value), '/');
  assert.equal(internalPath('/projects/gallery'), '/projects/gallery');
  assert.equal(internalPath('/contact#map'), '/contact#map');
});

test('approved logo variations have paired, self-contained vector exports', () => {
  for (const name of ['horizontal', 'centred', 'compact', 'wordmark', 'entrance', 'minaret', 'minaret-compact', 'pillars', 'arch']) {
    for (const theme of ['light', 'dark']) {
      const svg = readFileSync(new URL(`../public/brand/jic-${name}-${theme}.svg`, import.meta.url), 'utf8');
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
  assert.equal(PROGRAMMES.length, 4);
  const destinations = ['/youth/classes-skills', '/madrassah/classes-courses', '/worship'];
  for (const programme of PROGRAMMES) {
    assert.ok(existsSync(new URL(`../public${programme.image}`, import.meta.url)));
    assert.ok(destinations.includes(programme.to));
    assert.ok(programme.alt.length > 80);
    assert.ok(programme.groups.includes('home'));
  }
});

function contrast(first, second) {
  const luminance = hex => {
    const rgb = hex.match(/[a-f0-9]{2}/gi).map(part => parseInt(part, 16) / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
test('main solid-surface text and filled-button pairs meet 4.5:1 contrast', () => {
  for (const pair of [['#0C1930','#FAFBFD'], ['#89501B','#FAFBFD'], ['#697486','#FAFBFD'], ['#F4F6FA','#152238'], ['#B7C3D5','#152238'], ['#D6AF62','#152238'], ['#0C1930','#D6AF62']]) assert.ok(contrast(...pair) >= 4.5, `${pair.join(' / ')} must be readable`);
});

test('glass text retains 4.5:1 contrast at both background extremes', () => {
  const css = readFileSync(new URL('../src/styles/liquid-glass.css', import.meta.url), 'utf8');
  for (const selector of ['html[data-theme]', 'html[data-theme=dark]']) {
    const block = css.slice(css.indexOf(selector + ' {')).split('}')[0];
    const [, r, g, b, alpha] = block.match(/--jic-glass-surface:rgba\((\d+),(\d+),(\d+),([.\d]+)\)/);
    const colours = ['ink','secondary','accent'].map(role => block.match(new RegExp(`--jic-glass-${role}:(#[A-Fa-f0-9]{6})`))[1]);
    for (const background of [0, 255]) {
      const composite = '#' + [r,g,b].map(channel => Math.round(Number(channel) * Number(alpha) + background * (1 - Number(alpha))).toString(16).padStart(2,'0')).join('');
      for (const colour of colours) assert.ok(contrast(colour, composite) >= 4.5, `${selector}: ${colour} over ${composite}`);
    }
  }
});

test('31-day wallpaper fits the canvas, includes Sunrise, and never invents a Jamaah time', () => {
  const calls = [];
  const gradient = { addColorStop() {} };
  const ctx = { createLinearGradient: () => gradient, createRadialGradient: () => gradient, fillText: (...args) => calls.push(args) };
  for (const method of ['fillRect','beginPath','moveTo','arcTo','closePath','fill','stroke','quadraticCurveTo','lineTo']) ctx[method] = () => {};
  const canvas = { getContext: () => ctx };
  const previous = globalThis.document;
  globalThis.document = { createElement: () => canvas };
  try {
    assert.equal(createWallpaperCanvas([], 'October 2026'), undefined);
    const rows = Array.from({ length: 31 }, (_, index) => ({ day: index + 1, dayName: 'Thu', d_date: `${index + 1} Oct 2026`, fajr_begins: '05:15 AM', fajr_jamah: null, sunrise: '06:30 AM', zuhr_begins: '01:09 PM', zuhr_jamah: '01:45 PM' }));
    assert.equal(createWallpaperCanvas(rows, 'October 2026'), canvas);
    assert.equal(canvas.width, 1290);
    assert.equal(canvas.height, 2796);
    assert.ok(calls.some(([text]) => text === 'SUNRISE'));
    assert.ok(calls.some(([text]) => text === 'October 2026 Prayer Times'));
    assert.ok(calls.some(([text]) => text === 'Thu 31'));
    assert.ok(calls.some(([text]) => text === 'J —'));
    assert.ok(!calls.some(([text]) => text === 'J 5:15'));
    assert.ok(calls.every(([, x, y]) => x >= 0 && x <= 1290 && y >= 300 && y < 2796));
  } finally {
    if (previous === undefined) delete globalThis.document; else globalThis.document = previous;
  }
});
