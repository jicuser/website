import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const bootstrap = readFileSync(new URL('../public/appearance.js', import.meta.url), 'utf8');
const provider = readFileSync(
  new URL('../src/context/AppearanceContext.jsx', import.meta.url),
  'utf8',
);
const glass = readFileSync(new URL('../src/styles/liquid-glass.css', import.meta.url), 'utf8');

function createRoot() {
  const classes = new Set();
  return {
    dataset: {},
    style: {},
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      contains: (name) => classes.has(name),
    },
  };
}

function assertAppearance(root, theme, surface) {
  assert.equal(root.dataset.theme, theme);
  assert.equal(root.dataset.surface, surface);
  assert.equal(root.classList.contains('dark'), theme === 'dark');
  assert.equal(root.style.colorScheme, `only ${theme}`);
  assert.equal(root.style.backgroundColor, theme === 'dark' ? '#080f1d' : '#f9f7f1');
}

for (const theme of ['light', 'dark']) {
  for (const surface of ['glass', 'solid']) {
    test(`startup preserves ${theme}/${surface} without browser auto-recolouring`, () => {
      const root = createRoot();
      const values = {
        'jic-theme': theme,
        jic_glass_enabled: String(surface === 'glass'),
      };
      runInNewContext(bootstrap, {
        document: { documentElement: root },
        localStorage: { getItem: (key) => values[key] ?? null },
      });
      assertAppearance(root, theme, surface);
    });
  }
}

test('startup still works when storage is blocked', () => {
  const root = createRoot();
  runInNewContext(bootstrap, {
    document: { documentElement: root },
    localStorage: {
      getItem() {
        throw new Error('Storage is unavailable');
      },
    },
  });
  assertAppearance(root, 'light', 'glass');
});

test('invalid saved preferences fall back to the supported default appearance', () => {
  const root = createRoot();
  runInNewContext(bootstrap, {
    document: { documentElement: root },
    localStorage: { getItem: () => 'invalid' },
  });
  assertAppearance(root, 'light', 'glass');
});

test('runtime theme changes keep the same browser colour-scheme contract as startup', () => {
  // Exercise the actual layout-effect body without requiring a DOM or React renderer.
  const effect = provider.match(
    /useLayoutEffect\(\(\) => \{([\s\S]*?)\n  \}, \[theme, glassEnabled\]\);/,
  );
  assert.ok(effect, 'The appearance layout effect must remain covered by this test');
  const root = createRoot();
  for (const theme of ['dark', 'light', 'dark']) {
    for (const glassEnabled of [true, false]) {
      runInNewContext(effect[1], {
        document: { documentElement: root },
        theme,
        glassEnabled,
      });
      assertAppearance(root, theme, glassEnabled ? 'glass' : 'solid');
    }
  }
});

test('contrast and transparency preferences use opaque theme-aware material tokens', () => {
  const fallback = glass.match(
    /@media \(prefers-contrast: more\), \(prefers-reduced-transparency: reduce\) \{\s*html\[data-theme\]\[data-surface\] \{([^}]+)\}/,
  );
  assert.ok(fallback, 'Both accessibility preferences must have a shared material fallback');
  for (const material of ['control', 'tile', 'panel', 'panel-strong']) {
    assert.ok(fallback[1].includes(`--jic-glass-${material}: var(--jic-surface);`));
  }
  for (const material of ['overlay', 'control', 'panel', 'dense']) {
    assert.ok(fallback[1].includes(`--jic-glass-${material}-filter: none;`));
  }
  for (const material of ['control', 'tile', 'panel', 'action']) {
    assert.ok(fallback[1].includes(`--jic-glass-${material}-sheen: none;`));
  }
  assert.match(glass, /html\[data-theme='light'\]\[data-surface\]/);
  assert.match(glass, /html\[data-theme='dark'\]\[data-surface\]/);
  assert.doesNotMatch(glass, /forced-color-adjust:\s*none|!important/);
});
