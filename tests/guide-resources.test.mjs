import test from 'node:test';
import assert from 'node:assert/strict';
import { WORSHIP_RESOURCES } from '../src/content/worshipResources.js';

test('Salah and Janazah resource links stay on the verified publisher hosts', () => {
  assert.deepEqual(Object.keys(WORSHIP_RESOURCES), ['salah', 'janazah']);
  for (const resource of Object.values(WORSHIP_RESOURCES)) {
    for (const key of ['source', 'urdu', 'pdf', 'cover']) {
      const url = new URL(resource[key]);
      assert.equal(url.protocol, 'https:');
      assert.ok(['www.dawateislami.net', 'data2.dawateislami.net'].includes(url.hostname));
    }
    assert.ok(new URL(resource.pdf).pathname.endsWith('.pdf'));
    assert.ok(resource.urdu.includes('/bookslibrary/ur/'));
  }
});
