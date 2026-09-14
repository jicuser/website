import test from 'node:test';
import assert from 'node:assert/strict';
import { EDUCATION_TABS, MADRASSAH_TABS } from '../src/content/nav.js';
test('adult course navigation belongs to Education and retains separate Madrasah routes', () => {
  assert.ok(EDUCATION_TABS.some(item=>item.path==='/education/courses' && item.name.includes('Adult')));
  assert.ok(EDUCATION_TABS.some(item=>item.path==='/madrassah'));
  assert.ok(MADRASSAH_TABS.some(item=>item.path==='/madrassah/enrolment'));
});
