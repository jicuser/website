import test from 'node:test';
import assert from 'node:assert/strict';
import { installPlatform, isInstalledApp } from '../src/lib/appInstall.js';

test('installation instructions recognise iPhone, desktop-mode iPad and Android', () => {
  assert.equal(installPlatform({ userAgent: 'iPhone' }), 'ios');
  assert.equal(installPlatform({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 }), 'ios');
  assert.equal(installPlatform({ userAgent: 'Android Chrome' }), 'android');
  assert.equal(installPlatform({ platform: 'MacIntel', maxTouchPoints: 0 }), 'other');
  assert.equal(installPlatform(), 'other');
});
test('installed detection distinguishes normal tabs from standalone launches', () => {
  assert.equal(isInstalledApp({ navigator: {}, matchMedia: () => ({ matches: false }) }), false);
  assert.equal(isInstalledApp({ navigator: { standalone: true } }), true);
  assert.equal(isInstalledApp({ navigator: {}, matchMedia: () => ({ matches: true }) }), true);
});
