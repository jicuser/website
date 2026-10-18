import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import React from 'react';
import { activeNavigation } from '../src/lib/publicNavigation.js';

const bundled = await build({
  entryPoints: [new URL('../src/components/shell/DesktopNavigation.jsx', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  alias: { '@': new URL('../src', import.meta.url).pathname },
});

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}

// Exercise disclosure and focus handlers without a browser or network services.
function navigationFixture(pathname = '/') {
  const slots = [];
  const listeners = new Map();
  const mediaListeners = new Set();
  const animationFrames = [];
  const elements = new Map();
  let cursor = 0;
  let effects = [];
  let dirty = false;
  let location = { pathname, search: '', hash: '', key: 'initial' };
  const document = {
    activeElement: null,
    addEventListener: (type, callback) => listeners.set(type, callback),
    removeEventListener: (type, callback) => {
      if (listeners.get(type) === callback) listeners.delete(type);
    },
  };
  const media = {
    matches: true,
    addEventListener: (_type, callback) => mediaListeners.add(callback),
    removeEventListener: (_type, callback) => mediaListeners.delete(callback),
  };
  const effectHook = (effect, dependencies) => {
    const index = cursor++;
    const previous = slots[index];
    if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
      slots[index] = { dependencies };
      effects.push(() => {
        previous?.cleanup?.();
        slots[index].cleanup = effect();
      });
    }
  };
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (value) => {
          const next = typeof value === 'function' ? value(slots[index]) : value;
          if (!Object.is(next, slots[index])) {
            slots[index] = next;
            dirty = true;
          }
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      slots[index] ||= { current: initial };
      return slots[index];
    },
    useEffect: effectHook,
    useLayoutEffect: effectHook,
  };
  function Link() {}
  const require = createRequire(import.meta.url);
  const context = {
    module: { exports: {} },
    require: (name) =>
      name === 'react'
        ? hooks
        : name === 'react-router-dom'
          ? { Link, useLocation: () => location }
          : require(name),
    window: { matchMedia: () => media },
    document,
    requestAnimationFrame: (callback) => animationFrames.push(callback),
  };
  runInNewContext(bundled.outputFiles[0].text, context);
  const Navigation = context.module.exports.default;
  const element = (key) => {
    if (!elements.has(key)) {
      const item = { key, isConnected: true };
      item.focus = () => {
        document.activeElement = item;
      };
      item.closest = (selector) =>
        selector === '.jic-desktop-dropdown' && key.includes(':link:') ? item : null;
      elements.set(key, item);
    }
    return elements.get(key);
  };
  const root = element('root');
  root.contains = (target) => target?.key?.startsWith('group:') || target === root;
  root.querySelector = (selector) => {
    if (selector === '.jic-desktop-dropdown:focus-within') {
      return document.activeElement?.key?.includes(':link:') ? document.activeElement : null;
    }
    return null;
  };
  let tree;
  function render() {
    let passes = 0;
    do {
      dirty = false;
      cursor = 0;
      effects = [];
      tree = Navigation({ navigation: activeNavigation(location.pathname) });
      tree.ref.current = root;
      for (const group of tree.props.children) {
        const dom = element(`group:${group.key}`);
        const trigger = nodes(group).find((node) => node.type === 'button');
        const links = nodes(group).filter((node) => node.type === Link);
        dom.contains = (target) => target?.key?.startsWith(`${dom.key}:`) || target === dom;
        dom.querySelector = (selector) =>
          selector === 'button' && trigger ? element(`${dom.key}:button`) : null;
        dom.querySelectorAll = () =>
          links.map((link) => element(`${dom.key}:link:${link.props.to}`));
      }
      effects.forEach((effect) => effect());
      assert.ok(++passes < 10, 'navigation effects settle');
    } while (dirty);
    return tree;
  }
  function group(path) {
    return tree.props.children.find((node) => node.key === path);
  }
  function trigger(path) {
    return nodes(group(path)).find((node) => node.type === 'button');
  }
  function dropdown(path) {
    return nodes(group(path)).find((node) => node.props?.className === 'jic-desktop-dropdown');
  }
  function link(path, target) {
    return nodes(group(path)).find((node) => node.type === Link && node.props.to === target);
  }
  function event(path, extra = {}) {
    const currentTarget = element(`group:${path}`);
    return {
      currentTarget,
      target: currentTarget.querySelector('button'),
      pointerType: 'mouse',
      preventDefault() {},
      stopPropagation() {},
      ...extra,
    };
  }
  return {
    render,
    group,
    trigger,
    dropdown,
    link,
    event,
    document,
    element,
    get open() {
      return tree.props.children.find((node) => trigger(node.key)?.props['aria-expanded'])?.key;
    },
    click(path) {
      trigger(path).props.onClick(event(path, { detail: 1 }));
      render();
    },
    keys(path, key, extra = {}) {
      group(path).props.onKeyDown(event(path, { key, ...extra }));
      render();
      animationFrames.splice(0).forEach((callback) => callback());
    },
    outside() {
      listeners.get('pointerdown')?.({ target: {} });
      render();
    },
    resize(matches) {
      media.matches = matches;
      mediaListeners.forEach((callback) => callback());
      render();
    },
    navigate(next) {
      location = { ...location, ...next };
      render();
    },
  };
}

test('desktop sections disclose their own links while Home remains a direct destination', () => {
  const fixture = navigationFixture();
  fixture.render();
  assert.equal(fixture.trigger('/'), undefined);
  assert.equal(fixture.link('/', '/').props['aria-current'], 'page');
  for (const path of [
    '/about',
    '/prayer-times',
    '/worship',
    '/services',
    '/projects',
    '/education',
    '/youth',
  ]) {
    assert.equal(fixture.trigger(path).props['aria-expanded'], false);
    assert.equal(fixture.dropdown(path).props.hidden, true);
    assert.equal(fixture.trigger(path).props['aria-controls'], fixture.dropdown(path).props.id);
    assert.ok(fixture.link(path, path), `${path} overview remains reachable`);
  }
  fixture.click('/about');
  assert.equal(fixture.open, '/about');
  fixture.click('/prayer-times');
  assert.equal(fixture.open, '/prayer-times');
  fixture.click('/prayer-times');
  assert.equal(fixture.open, undefined);
});

test('mouse hover opens, pointer departure closes, and touch hover does not open', () => {
  const fixture = navigationFixture();
  fixture.render();
  fixture.group('/about').props.onPointerEnter(fixture.event('/about', { pointerType: 'touch' }));
  fixture.render();
  assert.equal(fixture.open, undefined);
  fixture.group('/about').props.onPointerEnter(fixture.event('/about'));
  fixture.render();
  assert.equal(fixture.open, '/about');
  fixture.group('/about').props.onPointerLeave(fixture.event('/about'));
  fixture.render();
  assert.equal(fixture.open, undefined);
});

test('first click keeps a hovered section open and a second click closes it', () => {
  const fixture = navigationFixture();
  fixture.render();
  fixture.group('/about').props.onPointerEnter(fixture.event('/about'));
  fixture.render();
  fixture.click('/about');
  assert.equal(fixture.open, '/about');
  fixture.click('/about');
  assert.equal(fixture.open, undefined);
});

test('hover over another section does not hide the link currently being used by keyboard', () => {
  const fixture = navigationFixture();
  fixture.render();
  fixture.click('/about');
  fixture.element('group:/about:link:/team').focus();
  fixture.group('/prayer-times').props.onPointerEnter(fixture.event('/prayer-times'));
  fixture.render();
  assert.equal(fixture.open, '/about');
  assert.equal(fixture.document.activeElement, fixture.element('group:/about:link:/team'));
});

test('keyboard focus keeps a dropdown open across pointer departure and closes on outside blur', () => {
  const fixture = navigationFixture();
  fixture.render();
  fixture.click('/about');
  fixture.element('group:/about:link:/team').focus();
  fixture.group('/about').props.onPointerLeave(fixture.event('/about'));
  fixture.render();
  assert.equal(fixture.open, '/about');
  fixture
    .group('/about')
    .props.onBlur(
      fixture.event('/about', { relatedTarget: fixture.element('group:/about:button') }),
    );
  fixture.render();
  assert.equal(fixture.open, '/about');
  fixture.group('/about').props.onBlur(fixture.event('/about', { relatedTarget: null }));
  fixture.render();
  assert.equal(fixture.open, undefined);
});

test('Escape closes and returns focus; outside press and mobile breakpoint also close', () => {
  const fixture = navigationFixture();
  fixture.render();
  fixture.click('/services');
  fixture.keys('/services', 'Escape');
  assert.equal(fixture.open, undefined);
  assert.equal(fixture.document.activeElement, fixture.element('group:/services:button'));
  fixture.click('/services');
  fixture.outside();
  assert.equal(fixture.open, undefined);
  fixture.click('/services');
  fixture.resize(false);
  assert.equal(fixture.open, undefined);
});

test('arrow keys open and traverse children while Home and End select endpoints', () => {
  const fixture = navigationFixture();
  fixture.render();
  fixture.element('group:/about:button').focus();
  fixture.keys('/about', 'ArrowDown');
  assert.equal(fixture.open, '/about');
  assert.equal(fixture.document.activeElement, fixture.element('group:/about:link:/about'));
  fixture.keys('/about', 'ArrowDown', { target: fixture.document.activeElement });
  assert.equal(fixture.document.activeElement, fixture.element('group:/about:link:/team'));
  fixture.keys('/about', 'End', { target: fixture.document.activeElement });
  assert.equal(fixture.document.activeElement, fixture.element('group:/about:link:/social-media'));
  fixture.keys('/about', 'ArrowDown', { target: fixture.document.activeElement });
  assert.equal(fixture.document.activeElement, fixture.element('group:/about:link:/about'));
  fixture.keys('/about', 'Home', { target: fixture.document.activeElement });
  assert.equal(fixture.document.activeElement, fixture.element('group:/about:link:/about'));
  fixture.keys('/about', 'Escape');
  fixture.keys('/about', 'ArrowUp');
  assert.equal(fixture.document.activeElement, fixture.element('group:/about:link:/social-media'));
});

test('current and nested destinations select the correct section and dropdown child', () => {
  for (const [path, primary, child, current] of [
    ['/about', '/about', '/about', 'page'],
    ['/contact', '/about', '/contact', 'page'],
    ['/prayer-times/monthly', '/prayer-times', '/prayer-times/monthly', 'page'],
    ['/funerals/what-to-do', '/services', '/funerals', 'location'],
    ['/madrassah/policies', '/education', '/madrassah', 'location'],
    ['/projects/masjid-extension', '/projects', '/projects', 'location'],
    ['/projects/masjid-extension/timeline', '/projects', '/projects', 'location'],
    ['/projects/main-prayer-hall', '/projects', '/projects', 'location'],
    ['/projects/main-prayer-hall/', '/projects', '/projects', 'location'],
    ['/projects/wudu-area', '/projects', '/projects', 'location'],
    ['/projects/community-hall', '/projects', '/projects', 'location'],
    ['/projects/madrassah-floor', '/projects', '/projects', 'location'],
    ['/projects/timeline', '/projects', '/projects', 'location'],
    ['/projects/madrassah-building', '/projects', '/projects', 'location'],
  ]) {
    const fixture = navigationFixture(path);
    fixture.render();
    assert.equal(fixture.trigger(primary).props['aria-current'], 'location', path);
    assert.equal(fixture.link(primary, child).props['aria-current'], current, path);
    const selectedLinks = nodes(fixture.dropdown(primary)).filter(
      (node) => node.props?.['aria-current'],
    );
    assert.equal(selectedLinks.length, 1, path);
  }
});

test('project stage aliases select the single project overview instead of duplicate tabs', () => {
  for (const path of [
    '/projects/masjid-extension/timeline',
    '/projects/main-prayer-hall',
    '/projects/wudu-area',
    '/projects/community-hall',
    '/projects/madrassah-floor',
    '/projects/timeline',
    '/projects/madrassah-building',
  ]) {
    const navigation = activeNavigation(path);
    assert.equal(navigation.path, '/projects', path);
    assert.equal(navigation.current?.path, '/projects', path);
  }
  const donation = activeNavigation('/donate');
  assert.equal(donation.path, '/donate');
  assert.equal(donation.current?.path, '/donate');
  const fixture = navigationFixture('/donate');
  fixture.render();
  assert.equal(fixture.trigger('/projects').props['aria-current'], undefined);
  assert.equal(fixture.link('/projects', '/donate').props['aria-current'], undefined);
});

test('clicking the current child closes without depending on a pathname change', () => {
  const fixture = navigationFixture('/prayer-times');
  fixture.render();
  fixture.click('/prayer-times');
  fixture.link('/prayer-times', '/prayer-times').props.onClick();
  fixture.render();
  assert.equal(fixture.open, undefined);
  fixture.click('/prayer-times');
  fixture.navigate({ pathname: '/contact', key: 'contact' });
  assert.equal(fixture.open, undefined);
});

test('same-page hash and search navigation close open sections', () => {
  const fixture = navigationFixture('/prayer-times/monthly');
  fixture.render();
  fixture.click('/prayer-times');
  fixture.navigate({ hash: '#phone-wallpaper', key: 'wallpaper' });
  assert.equal(fixture.open, undefined);
  fixture.click('/prayer-times');
  fixture.navigate({ search: '?month=11', key: 'next-month' });
  assert.equal(fixture.open, undefined);
});
