import test from 'node:test';
import assert from 'node:assert/strict';
import { lockPageScroll } from '../src/lib/pageScrollLock.js';

function browserFixture() {
  const values = new Map();
  const style = new Proxy(
    {
      getPropertyValue: (name) => values.get(name)?.[0] || '',
      getPropertyPriority: (name) => values.get(name)?.[1] || '',
      setProperty: (name, value, priority = '') => values.set(name, [value, priority]),
      removeProperty: (name) => values.delete(name),
    },
    {
      set(target, key, value) {
        values.set(
          key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
          [value, ''],
        );
        return true;
      },
    },
  );
  const moves = [];
  return {
    style,
    moves,
    browser: {
      scrollX: 0,
      scrollY: 1250,
      innerWidth: 390,
      document: { body: { style }, documentElement: { clientWidth: 390 } },
      getComputedStyle: () => ({ paddingRight: '0px' }),
      scrollTo: (value) => moves.push(value),
    },
  };
}

test('closing a preview restores page position and pre-existing styles exactly', () => {
  const { browser, style, moves } = browserFixture();
  style.setProperty('overflow', 'clip');
  style.setProperty('padding-right', '8px');
  const unlock = lockPageScroll(browser);
  assert.equal(style.getPropertyValue('position'), 'fixed');
  assert.equal(style.getPropertyValue('top'), '-1250px');
  assert.equal(style.getPropertyValue('width'), '100%');
  unlock();
  assert.equal(style.getPropertyValue('position'), '');
  assert.equal(style.getPropertyValue('width'), '');
  assert.equal(style.getPropertyValue('overflow'), 'clip');
  assert.equal(style.getPropertyValue('padding-right'), '8px');
  assert.deepEqual(moves, [{ left: 0, top: 1250, behavior: 'instant' }]);
  unlock();
  assert.equal(moves.length, 1);
});

test('closing one nested dialog cannot unlock the page behind another', () => {
  const { browser, style, moves } = browserFixture();
  const first = lockPageScroll(browser);
  const second = lockPageScroll(browser);
  first();
  assert.equal(style.getPropertyValue('position'), 'fixed');
  assert.equal(moves.length, 0);
  second();
  assert.equal(style.getPropertyValue('position'), '');
  assert.equal(moves.length, 1);
});

test('desktop scrollbar space is preserved and then restored', () => {
  const { browser, style } = browserFixture();
  browser.document.documentElement.clientWidth = 375;
  const unlock = lockPageScroll(browser);
  assert.equal(style.getPropertyValue('padding-right'), '15px');
  unlock();
  assert.equal(style.getPropertyValue('padding-right'), '');
});
