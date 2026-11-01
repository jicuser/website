import test from 'node:test';
import assert from 'node:assert/strict';

test('staff dashboard groups preserve ordered tools without adding hidden ones', async () => {
  const dashboard = await import('../src/features/dashboard/model.js');
  assert.equal(typeof dashboard.groupWidgets, 'function');
  const groups = dashboard.groupWidgets([
    {id:'prayer',group:'Prayer times'},
    {id:'menus',group:'Website content'},
    {id:'posters',group:'Website content'},
  ]);
  assert.deepEqual(groups.map(group=>group.name),['Prayer times','Website content']);
  assert.deepEqual(groups[1].items.map(item=>item.id),['menus','posters']);
});
