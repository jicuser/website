import test from 'node:test';
import assert from 'node:assert/strict';
import { drawerNavigation } from '../src/lib/drawerNavigation.js';

const visible = [
  { name: 'Home', path: '/', children: [] },
  { name: 'Salah Times', path: '/prayer-times', children: [] },
  { name: 'Worship', path: '/worship', children: [{ name: 'Adhkar', path: '/worship/daily-duas' }] },
  { name: 'Community Hub', path: '/services', children: [
    { name: 'Funeral Services', path: '/funerals' },
    { name: 'Nikah', path: '/services/nikah' },
    { name: 'Hall Booking', path: '/services/hall-booking' },
  ] },
  { name: 'Education', path: '/education', children: [{name: 'Madrassah', path: '/madrassah'}] },
  { name: 'Our Masjid Project', path: '/projects', children: [] },
  { name: 'About JIC', path: '/about', children: [{name: 'Contact Us', path:'/contact'}] },
  { name: 'Giving', path:'/donate', children: [] },
];
const compact = visible.filter(g => !['/education','/projects','/donate'].includes(g.path));

test('promotes important visible destinations without losing worship or hub links', () => {
  const output = drawerNavigation(compact, visible);
  assert.deepEqual(output.map(g=>g.path), ['/', '/prayer-times', '/funerals', '/services/nikah', '/worship', '/education', '/services', '/projects', '/donate', '/about', '/contact']);
  assert.ok(output.find(g=>g.path==='/services').children.some(g=>g.path==='/services/hall-booking'));
  assert.ok(output.find(g=>g.path==='/worship').children.some(g=>g.path==='/worship/daily-duas'));
});
test('never invents or resurrects hidden destinations', () => {
  const hidden = visible.filter(g=>!['/education','/projects','/donate'].includes(g.path)).map(g=>({...g, children:g.children.filter(c=>!['/funerals','/contact'].includes(c.path))}));
  const output = drawerNavigation(hidden, hidden);
  for(const path of ['/funerals','/contact','/education','/projects','/donate']) assert.ok(!output.some(g=>g.path===path));
});
test('preserves configured labels and root order', () => {
  const renamed = visible.map(g=>g.path==='/education'? {...g,name:'Learn with us'}:g);
  const roots = [...compact].reverse();
  const output = drawerNavigation(roots, renamed);
  assert.equal(output.find(g=>g.path==='/education').name,'Learn with us');
  assert.deepEqual(output.filter(g=>roots.some(root=>root.path===g.path)).map(g=>g.path),roots.map(g=>g.path));
});
test('deduplicates promoted roots and leaves inputs unchanged', () => {
  const before = JSON.stringify(visible);
  const output = drawerNavigation(visible, visible);
  assert.equal(new Set(output.map(g=>g.path)).size,output.length);
  assert.equal(JSON.stringify(visible),before);
  const roots = new Set(output.map(g=>g.path));
  for(const group of output) assert.ok(group.children.every(c=>c.path===group.path || !roots.has(c.path)));
});
test('handles an empty visible menu without adding dead links', () => {
  assert.deepEqual(drawerNavigation([], []), []);
});

test('active destination uses the most specific route, including aliased child paths', async () => {
  const { activeDrawerPath } = await import('../src/lib/drawerNavigation.js');
  const groups = drawerNavigation(compact, visible);
  assert.equal(activeDrawerPath(groups, '/services/nikah/booking'), '/services/nikah');
  assert.equal(activeDrawerPath(groups, '/madrassah/'), '/education');
  assert.equal(activeDrawerPath(groups, '/'), '/');
  assert.equal(activeDrawerPath(groups, '/not-a-page'), undefined);
});
