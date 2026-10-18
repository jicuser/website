import test from 'node:test';
import assert from 'node:assert/strict';
import { observePrayerDockScroll } from '../src/lib/prayerDockScroll.js';

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    emit(type, event = {}) {
      listeners.get(type)?.forEach((listener) => listener(event));
    },
    listenerCount() {
      return [...listeners.values()].reduce((count, entries) => count + entries.size, 0);
    },
  };
}

function fixture(options = {}) {
  let now = 0;
  let timerId = 0;
  const timers = new Map();
  const changes = [];
  const footer = {};
  let intersect;
  let disconnected = false;
  const document = { ...eventTarget(), activeElement: null, querySelector: () => footer };
  const panelControl = {};
  const panel = { ...eventTarget(), contains: (node) => node === panelControl };
  const media = { ...eventTarget(), matches: false };
  const browser = {
    ...eventTarget(),
    document,
    innerWidth: 390,
    scrollY: 100,
    matchMedia: () => media,
    IntersectionObserver: class {
      constructor(callback) {
        intersect = callback;
      }
      observe(element) {
        assert.equal(element, footer);
      }
      disconnect() {
        disconnected = true;
      }
    },
    setTimeout(callback, delay) {
      timers.set(++timerId, { callback, at: now + delay });
      return timerId;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  const cleanup = observePrayerDockScroll({
    panel,
    browser,
    onChange: (value) => changes.push(value),
    ...options,
  });
  return {
    browser,
    document,
    panel,
    panelControl,
    media,
    changes,
    cleanup,
    toggle: () => cleanup.toggle(),
    footer: (visible) => intersect([{ isIntersecting: visible }]),
    disconnected: () => disconnected,
    scroll(y, target = document) {
      browser.scrollY = y;
      browser.emit('scroll', { target });
    },
    advance(ms) {
      now += ms;
      for (const [id, timer] of timers) {
        if (timer.at <= now) {
          timers.delete(id);
          timer.callback();
        }
      }
    },
  };
}

test('small movements do not hide the panel; sustained scrolling hides it once', () => {
  const f = fixture();
  f.scroll(105);
  f.advance(700);
  f.scroll(111);
  assert.deepEqual(f.changes, []);
  f.scroll(117);
  f.scroll(250);
  assert.deepEqual(f.changes, [true]);
});

test('a pause and small momentum corrections keep the bars hidden until scrolling up', () => {
  const f = fixture();
  f.scroll(130);
  f.advance(650);
  f.scroll(120);
  f.advance(2000);
  assert.deepEqual(f.changes, [true]);
  f.scroll(115);
  assert.deepEqual(f.changes, [true, false]);
});

test('scrolling back up reveals the mobile timetable pill without waiting for idle', () => {
  const f = fixture();
  f.scroll(200);
  f.scroll(195);
  assert.deepEqual(f.changes, [true]);
  f.scroll(185);
  assert.deepEqual(f.changes, [true, false]);
});

test('nested rails and horizontal-only scroll events do not hide or delay the panel', () => {
  const f = fixture();
  f.scroll(100, {});
  f.scroll(100);
  assert.deepEqual(f.changes, []);
  f.scroll(150);
  f.advance(500);
  f.scroll(150);
  f.scroll(150, {});
  f.advance(200);
  assert.deepEqual(f.changes, [true]);
  f.scroll(130);
  assert.deepEqual(f.changes, [true, false]);
});

test('focused and pressed prayer controls stay available during page movements', () => {
  const f = fixture();
  f.document.activeElement = f.panelControl;
  f.document.emit('keydown', { key: 'Tab' });
  f.scroll(200);
  assert.deepEqual(f.changes, []);
  f.document.activeElement = null;
  f.panel.emit('pointerdown');
  f.scroll(300);
  assert.deepEqual(f.changes, []);
  f.browser.emit('pointercancel');
  f.scroll(320);
  assert.deepEqual(f.changes, [true]);
  f.document.activeElement = f.panelControl;
  f.panel.emit('focusin');
  assert.deepEqual(f.changes, [true, false]);
});

test('short landscape keeps the in-flow panel visible and orientation changes restore it', () => {
  const f = fixture();
  f.scroll(200);
  f.media.matches = true;
  f.media.emit('change');
  f.scroll(300);
  f.advance(1000);
  assert.deepEqual(f.changes, [true, false]);
});

test('returning to the page top, resizing and reopening a tab restore the panel', () => {
  const f = fixture();
  f.scroll(200);
  f.scroll(0);
  f.scroll(-20);
  assert.deepEqual(f.changes, [true, false]);
  f.scroll(100);
  f.browser.innerWidth = 700;
  f.browser.emit('resize');
  f.scroll(200);
  f.document.emit('visibilitychange');
  assert.deepEqual(f.changes, [true, false, true, false, true, false]);
});

test('height-only browser-bar resizing cannot make the panel flicker during a gesture', () => {
  const f = fixture();
  f.scroll(200);
  f.advance(300);
  f.browser.emit('resize');
  assert.deepEqual(f.changes, [true]);
  f.scroll(250);
  f.advance(699);
  assert.deepEqual(f.changes, [true]);
  f.advance(1);
  assert.deepEqual(f.changes, [true]);
  f.scroll(230);
  assert.deepEqual(f.changes, [true, false]);
});

test('route changes and unmount can cancel all pending callbacks and listeners', () => {
  const f = fixture();
  f.scroll(200);
  f.cleanup();
  f.advance(1000);
  f.scroll(400);
  assert.deepEqual(f.changes, [true]);
  for (const target of [f.browser, f.panel, f.document, f.media]) {
    assert.equal(target.listenerCount(), 0);
  }
  assert.equal(f.disconnected(), true);
});

test('the mobile footer remains clear at rest, with an explicit tap to reveal times', () => {
  const f = fixture();
  f.footer(true);
  f.advance(1000);
  assert.deepEqual(f.changes, [true]);
  f.toggle();
  assert.deepEqual(f.changes, [true, false]);
  f.scroll(200);
  f.advance(700);
  assert.deepEqual(f.changes, [true, false, true]);
  f.footer(false);
  assert.deepEqual(f.changes, [true, false, true]);
  f.scroll(180);
  assert.deepEqual(f.changes, [true, false, true, false]);
});

test('typing hides the prayer panel and scrolling down keeps it hidden after focus leaves', () => {
  const f = fixture();
  f.document.activeElement = { matches: () => true };
  f.document.emit('focusin');
  f.advance(0);
  f.scroll(200);
  f.advance(1000);
  assert.deepEqual(f.changes, [true]);
  f.document.activeElement = null;
  f.document.emit('focusout');
  f.advance(0);
  assert.deepEqual(f.changes, [true]);
  f.scroll(180);
  assert.deepEqual(f.changes, [true, false]);
});

test('a tap can collapse the panel, while desktop footer visibility does not hide it', () => {
  const f = fixture();
  f.toggle();
  f.advance(1000);
  assert.deepEqual(f.changes, [true]);
  f.toggle();
  f.browser.innerWidth = 1280;
  f.footer(true);
  assert.deepEqual(f.changes, [true, false]);
});

test('a previous touch focus does not pin the bars while reading the page', () => {
  const f = fixture();
  f.document.activeElement = f.panelControl;
  f.document.emit('pointerdown');
  f.scroll(200);
  f.advance(3000);
  assert.deepEqual(f.changes, [true]);
  f.scroll(180);
  assert.deepEqual(f.changes, [true, false]);
});

test('desktop bars also stay hidden until a deliberate upward scroll', () => {
  const f = fixture();
  f.browser.innerWidth = 1280;
  f.scroll(200);
  f.advance(3000);
  assert.deepEqual(f.changes, [true]);
  f.scroll(195);
  assert.deepEqual(f.changes, [true]);
  f.scroll(180);
  assert.deepEqual(f.changes, [true, false]);
});

test('alert setup keeps floating bars tucked away until explicitly requested', () => {
  const f = fixture({ quiet: true });
  assert.deepEqual(f.changes, [true]);
  f.scroll(0);
  f.scroll(200);
  f.scroll(180);
  assert.deepEqual(f.changes, [true]);
  f.toggle();
  assert.deepEqual(f.changes, [true, false]);
  f.scroll(200);
  assert.deepEqual(f.changes, [true, false, true]);
});
