import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const bootstrap = readFileSync(new URL('../public/appearance.js', import.meta.url), 'utf8');

function startAppearance(saved = {}, blocked = false) {
  const classes = new Set();
  const root = {
    dataset: {},
    style: {},
    classList: { toggle: (name, enabled) => (enabled ? classes.add(name) : classes.delete(name)) },
  };
  runInNewContext(bootstrap, {
    document: { documentElement: root },
    localStorage: {
      getItem(key) {
        if (blocked) throw new Error('Storage unavailable');
        return saved[key] ?? null;
      },
    },
  });
  return { root, classes };
}

test('saved theme and glass preference are applied before React starts', () => {
  for (const theme of ['light', 'dark']) {
    for (const glass of ['true', 'false']) {
      const { root, classes } = startAppearance({
        'jic-theme': theme,
        jic_glass_enabled: glass,
      });
      assert.equal(root.dataset.theme, theme);
      assert.equal(classes.has('dark'), theme === 'dark');
      assert.equal(root.dataset.surface, glass === 'true' ? 'glass' : 'solid');
      assert.equal(root.style.colorScheme, theme);
      assert.equal(root.style.backgroundColor, theme === 'dark' ? '#080f1d' : '#fafbfd');
    }
  }
});

test('missing, malformed or blocked storage leaves a usable default appearance', () => {
  for (const [saved, blocked] of [
    [{}, false],
    [{ 'jic-theme': 'invalid', jic_glass_enabled: 'invalid' }, false],
    [{}, true],
  ]) {
    const { root, classes } = startAppearance(saved, blocked);
    assert.equal(root.dataset.theme, 'dark');
    assert.equal(root.dataset.surface, 'glass');
    assert.equal(classes.has('dark'), true);
  }
});
