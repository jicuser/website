import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import {
  createSessionCode,
  isActivePresentation,
} from '../supabase/functions/_shared/tv-session.js';
import { DEFAULT_TV_SETTINGS } from '../supabase/functions/_shared/tv.js';

const hall = 'mens-main';
const presentationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const viewerId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const token = 'a'.repeat(64);
const tokenHash = (value) => createHash('sha256').update(value).digest('hex');
const future = () => new Date(Date.now() + 3600000).toISOString();
const past = () => new Date(Date.now() - 3600000).toISOString();
const teaching = () => ({
  ...DEFAULT_TV_SETTINGS,
  scene_mode: 'teaching',
  scenes: [
    {
      id: 'scene-1',
      name: 'Private lesson',
      overlap: true,
      layers: [
        {
          id: 'notice',
          type: 'text',
          text: 'Private lesson text',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        },
      ],
    },
  ],
});

// Exercise the real Edge handler without network calls or a Deno installation.
// The database stand-in applies the query filters; SQL lifecycle behavior has its own tests.
const compiled = await build({
  entryPoints: [new URL('../supabase/functions/tv-control/index.ts', import.meta.url).pathname],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  plugins: [
    {
      name: 'test-supabase',
      setup(builder) {
        builder.onResolve({ filter: /^npm:@supabase\/supabase-js/ }, () => ({
          path: 'database',
          namespace: 'test',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
          contents: 'export const createClient = () => globalThis.testDatabase;',
          loader: 'js',
        }));
      },
    },
  ],
});

function harness({
  settings = teaching(),
  presentation = { id: presentationId, code: '12345678', expires_at: future() },
  devices = [],
  templates = [],
  staffProfile = { id: 'staff-id', is_active: true, is_owner: false, permissions: ['tv'] },
  rpcResult,
} = {}) {
  const rows = {
    tv_screens: [
      { id: hall, label: 'Men’s Main Hall', settings, updated_at: '2026-09-12T10:00:00.000Z' },
    ],
    tv_presentations: presentation ? [{ ...presentation, screen_id: hall }] : [],
    tv_devices: devices,
    tv_scene_templates: templates,
    tv_inputs: [
      {
        screen_id: hall,
        slot: 'input-1',
        session_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        kind: 'camera',
        expires_at: future(),
      },
    ],
    profiles: [staffProfile],
  };
  const calls = [];
  const database = {
    auth: {
      getUser: async (bearer) => {
        calls.push({ type: 'auth', bearer });
        return {
          data: { user: bearer === 'staff-token' ? { id: 'staff-id' } : null },
          error: null,
        };
      },
    },
    rpc: async (name, values) => {
      calls.push({ type: 'rpc', name, values });
      return {
        data: rpcResult ?? { deviceId: viewerId, presentationId, expiresAt: future() },
        error: null,
      };
    },
    from(table) {
      const filters = [];
      let operation = 'select';
      let values;
      let single = false;
      const query = {
        select() {
          return query;
        },
        eq(key, value) {
          filters.push((row) => row[key] === value);
          return query;
        },
        gt(key, value) {
          filters.push((row) => row[key] > value);
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return query;
        },
        single() {
          single = true;
          return query;
        },
        maybeSingle() {
          single = true;
          return query;
        },
        update(input) {
          operation = 'update';
          values = input;
          return query;
        },
        delete() {
          operation = 'delete';
          return query;
        },
        insert(input) {
          operation = 'insert';
          values = input;
          return query;
        },
        then(resolve, reject) {
          calls.push({ type: 'query', table, operation, values: structuredClone(values) });
          let selected = (rows[table] || []).filter((row) =>
            filters.every((filter) => filter(row)),
          );
          if (operation === 'update') selected.forEach((row) => Object.assign(row, values));
          if (operation === 'delete')
            rows[table] = (rows[table] || []).filter((row) => !selected.includes(row));
          if (operation === 'insert') {
            const created = { id: viewerId, ...values };
            rows[table] = [...(rows[table] || []), created];
            selected = [created];
          }
          return Promise.resolve({
            data: structuredClone(single ? selected[0] || null : selected),
            error: null,
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  let handler;
  runInNewContext(compiled.outputFiles[0].text, {
    testDatabase: database,
    crypto: webcrypto,
    TextEncoder,
    Response,
    URL,
    console,
    Deno: {
      env: { get: () => undefined },
      serve: (callback) => {
        handler = callback;
      },
    },
  });
  return {
    calls,
    rows,
    async request(action, values = {}, bearer) {
      const response = await handler(
        new Request('https://example.test/tv-control', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
          },
          body: JSON.stringify({ action, screenId: hall, ...values }),
        }),
      );
      return { status: response.status, data: await response.json() };
    },
  };
}

const viewer = (extra = {}) => ({
  id: viewerId,
  screen_id: hall,
  presentation_id: presentationId,
  token_hash: tokenHash(token),
  name: 'Classroom laptop',
  expires_at: future(),
  is_preview: false,
  ...extra,
});

test('session codes have eight digits and reject the biased end of the random range', () => {
  const values = [4294967295, 4290000000, 0, 99999999];
  const random = {
    getRandomValues(array) {
      array[0] = values.shift();
      return array;
    },
  };
  assert.equal(createSessionCode(random), '00000000');
  assert.equal(createSessionCode(random), '99999999');
  assert.equal(values.length, 0);
});

test('a presentation needs a nonempty active scene and an unexpired session and end time', () => {
  const now = Date.now();
  const presentation = { id: presentationId, expires_at: future() };
  assert.equal(isActivePresentation(presentation, teaching(), now), true);
  assert.equal(isActivePresentation(null, teaching(), now), false);
  assert.equal(
    isActivePresentation({ ...presentation, expires_at: past() }, teaching(), now),
    false,
  );
  assert.equal(
    isActivePresentation(presentation, { ...teaching(), class_until: past() }, now),
    false,
  );
  assert.equal(
    isActivePresentation(presentation, { ...teaching(), scene_mode: 'normal' }, now),
    false,
  );
  assert.equal(isActivePresentation(presentation, DEFAULT_TV_SETTINGS, now), false);
});

test('public status reports Present without revealing its scene, media inputs, or session code', async () => {
  const api = harness();
  const { status, data } = await api.request('status');
  assert.equal(status, 200);
  assert.equal(data.displayMode, 'teaching');
  assert.equal(data.paired, false);
  assert.deepEqual(data.inputs, []);
  assert.deepEqual(data.settings.scenes[0].layers, []);
  assert.equal(JSON.stringify(data).includes('Private lesson'), false);
  assert.equal(JSON.stringify(data).includes('12345678'), false);
  assert.equal(
    api.calls.some((call) => call.type === 'auth'),
    false,
  );
});

test('only a credential for this hall and this presentation receives private content', async () => {
  const api = harness({ devices: [viewer()] });
  const { status, data } = await api.request('status', { deviceToken: token });
  assert.equal(status, 200);
  assert.equal(data.paired, true);
  assert.equal(data.settings.scenes[0].layers[0].text, 'Private lesson text');
  assert.equal(data.inputs[0].slot, 'input-1');
  assert.equal(JSON.stringify(data).includes('12345678'), false);
  for (const extra of [{ presentation_id: 'another-session' }, { screen_id: 'ladies-upstairs' }]) {
    const other = harness({ devices: [viewer(extra)] });
    const response = await other.request('status', { deviceToken: token });
    assert.equal(response.data.paired, false);
    assert.deepEqual(response.data.inputs, []);
  }
});

test('expired or malformed viewer credentials retain the known mode but lose private access', async () => {
  for (const credential of [token, 'malformed']) {
    const api = harness({ devices: [viewer({ expires_at: past() })] });
    const response = await api.request('status', { deviceToken: credential });
    assert.equal(response.status, 200);
    assert.equal(response.data.displayMode, 'teaching');
    assert.equal(response.data.paired, false);
    assert.deepEqual(response.data.inputs, []);
    assert.deepEqual(response.data.settings.scenes[0].layers, []);
  }
});

test('Normal or an expired presentation invalidates an otherwise valid viewer credential', async () => {
  for (const options of [
    { settings: { ...teaching(), scene_mode: 'normal' } },
    { presentation: { id: presentationId, code: '12345678', expires_at: past() } },
  ]) {
    const api = harness({ ...options, devices: [viewer()] });
    const response = await api.request('status', { deviceToken: token });
    assert.equal(response.data.displayMode, 'normal');
    assert.equal(response.data.paired, false);
    assert.equal(response.data.presentationId, null);
    assert.equal(JSON.stringify(response.data).includes('Private lesson'), false);
  }
});

test('joining a session uses the public code RPC, a hashed credential and a validated name', async () => {
  const api = harness();
  const { status, data } = await api.request('join-session', {
    code: ' 12345678 ',
    name: ' Classroom laptop ',
  });
  assert.equal(status, 200);
  assert.match(data.deviceToken, /^[a-f0-9]{64}$/);
  assert.equal(data.deviceId, viewerId);
  assert.equal(
    api.calls.some((call) => call.type === 'auth'),
    false,
  );
  const call = api.calls.find((entry) => entry.type === 'rpc');
  assert.equal(call.name, 'join_tv_presentation');
  assert.equal(call.values.session_code, '12345678');
  assert.equal(call.values.viewer_name, 'Classroom laptop');
  assert.equal(call.values.credential_hash, tokenHash(data.deviceToken));
  assert.match(call.values.client_hash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(data).includes('12345678'), false);
  const unnamed = harness();
  const rejected = await unnamed.request('join-session', { code: '12345678', name: ' ' });
  assert.equal(rejected.status, 400);
  assert.match(rejected.data.error, /name/i);
  assert.equal(
    unnamed.calls.some((entry) => entry.type === 'rpc'),
    false,
  );
});

test('incorrect or throttled code responses never issue a viewer credential', async () => {
  for (const status of [403, 410, 429]) {
    const api = harness({ rpcResult: { error: 'Cannot join this presentation', status } });
    const response = await api.request('join-session', { code: '00000000', name: 'Student phone' });
    assert.equal(response.status, status);
    assert.equal(response.data.deviceToken, undefined);
  }
});

test('viewer credentials do not grant editing, publishing, preview or legacy pairing access', async () => {
  for (const action of [
    'admin',
    'save',
    'normal',
    'new-presentation',
    'save-background',
    'approve-display',
    'save-template',
    'delete-template',
    'start',
    'stop',
    'preview',
    'approve-setup',
    'pair-code',
    'pair',
    'begin-setup',
    'setup-status',
  ]) {
    const api = harness({ devices: [viewer()] });
    const response = await api.request(action, { deviceToken: token }, token);
    assert.equal(response.status, 401, action);
    assert.equal(
      api.calls.some((entry) => entry.type === 'rpc'),
      false,
      action,
    );
    assert.equal(
      api.calls.some((entry) => entry.type === 'query' && entry.operation !== 'select'),
      false,
      action,
    );
  }
});

test('retired pairing actions stay unavailable even to staff', async () => {
  for (const action of ['approve-setup', 'pair-code', 'pair', 'begin-setup', 'setup-status']) {
    const api = harness();
    const response = await api.request(action, {}, 'staff-token');
    assert.equal(response.status, 400);
    assert.match(response.data.error, /Unknown action/);
    assert.equal(
      api.calls.some((entry) => entry.type === 'rpc'),
      false,
    );
  }
});

test('a display can request its rolling code before a stream starts without exposing its credential', async () => {
  const expiresAt = new Date(Date.now() + 600000).toISOString();
  const api = harness({
    settings: DEFAULT_TV_SETTINGS,
    presentation: null,
    rpcResult: { code: '012345', expires_at: expiresAt },
  });
  const response = await api.request('display-code', { deviceToken: token });
  assert.equal(response.status, 200);
  assert.deepEqual(response.data, { code: '012345', expires_at: expiresAt });
  const call = api.calls.find((entry) => entry.type === 'rpc');
  assert.equal(call.name, 'request_display_code');
  assert.equal(call.values.hall, hall);
  assert.equal(call.values.credential_hash, tokenHash(token));
  assert.match(call.values.client_hash, /^[a-f0-9]{64}$/);
  assert.equal(
    api.calls.some((entry) => entry.type === 'auth'),
    false,
  );
  assert.equal(JSON.stringify(response.data).includes(token), false);
});

test('display-code rejects malformed credentials and preserves allocation limits', async () => {
  for (const deviceToken of [undefined, '', '123456', 'A'.repeat(64)]) {
    const api = harness();
    const response = await api.request('display-code', { deviceToken });
    assert.equal(response.status, 400);
    assert.equal(
      api.calls.some((entry) => entry.type === 'rpc'),
      false,
    );
  }
  const limited = harness({ rpcResult: { error: 'Try again shortly.', status: 429 } });
  const response = await limited.request('display-code', { deviceToken: token });
  assert.equal(response.status, 429);
  assert.equal(response.data.code, undefined);
});

test('staff approve the code from the display, with an optional name supplied only once', async () => {
  for (const name of [undefined, ' ', ' Main hall projector ']) {
    const api = harness({
      rpcResult: { deviceId: viewerId, name: 'Main hall projector', presentationId },
    });
    const response = await api.request(
      'approve-display',
      { code: ' 012345 ', name },
      'staff-token',
    );
    assert.equal(response.status, 200);
    assert.equal(response.data.deviceId, viewerId);
    const call = api.calls.find((entry) => entry.type === 'rpc');
    assert.equal(call.name, 'approve_display_code');
    assert.equal(call.values.actor, 'staff-id');
    assert.equal(call.values.hall, hall);
    assert.equal(call.values.connection_code, '012345');
    assert.equal(call.values.display_name, name?.trim() || null);
  }
});

test('approval validates fields and rejects staff without stream permission before database mutation', async () => {
  for (const values of [
    { code: '' },
    { code: '12345678' },
    { code: '123456', name: 'x'.repeat(61) },
  ]) {
    const api = harness();
    const response = await api.request('approve-display', values, 'staff-token');
    assert.equal(response.status, 400);
    assert.equal(
      api.calls.some((entry) => entry.type === 'rpc'),
      false,
    );
  }
  for (const action of ['approve-display', 'save-template', 'delete-template', 'admin']) {
    const api = harness({
      staffProfile: { id: 'staff-id', is_active: true, permissions: ['posters'] },
    });
    const response = await api.request(action, { code: '123456' }, 'staff-token');
    assert.equal(response.status, 403, action);
    assert.equal(
      api.calls.some((entry) => entry.type === 'rpc'),
      false,
      action,
    );
    assert.equal(
      api.calls.some((entry) => entry.type === 'query' && entry.operation !== 'select'),
      false,
      action,
    );
  }
  const expired = harness({ rpcResult: { error: 'This display code has expired.', status: 410 } });
  assert.equal(
    (await expired.request('approve-display', { code: '123456' }, 'staff-token')).status,
    410,
  );
});

test('watching links are bound to the current presentation even when another session reuses its code', async () => {
  const otherId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const current = harness();
  const joined = await current.request('join-session', {
    presentationId,
    code: '12345678',
    name: 'Shared-link viewer',
  });
  assert.equal(joined.status, 200);
  assert.match(joined.data.deviceToken, /^[a-f0-9]{64}$/);
  for (const options of [
    { suppliedId: otherId },
    { suppliedId: 'bad-id' },
    { suppliedId: null },
    { suppliedId: presentationId, presentation: null },
    {
      suppliedId: presentationId,
      presentation: { id: otherId, code: '12345678', expires_at: future() },
    },
  ]) {
    const { suppliedId, ...state } = options;
    const api = harness(state);
    const response = await api.request('join-session', {
      presentationId: suppliedId,
      code: '12345678',
      name: 'Shared-link viewer',
    });
    assert.equal(response.status, 410);
    assert.equal(response.data.deviceToken, undefined);
    assert.equal(
      api.calls.some((entry) => entry.type === 'rpc'),
      false,
    );
  }
});

test('Admin returns only saved scenes for the chosen hall', async () => {
  const api = harness({
    templates: [
      { id: viewerId, screen_id: hall, name: 'Main hall scene', scene: teaching().scenes[0] },
      {
        id: presentationId,
        screen_id: 'ladies-upstairs',
        name: 'Other hall scene',
        scene: teaching().scenes[0],
      },
    ],
  });
  const response = await api.request('admin', {}, 'staff-token');
  assert.equal(response.status, 200);
  assert.deepEqual(
    response.data.templates.map((item) => item.name),
    ['Main hall scene'],
  );
  assert.equal(
    api.calls.some((entry) => entry.table === 'tv_scene_templates'),
    true,
  );
});

test('saving a scene keeps source settings and positions but excludes live device credentials', async () => {
  const scene = {
    id: 'scene-template',
    name: 'Camera with video',
    overlap: true,
    deviceToken: token,
    presentationId,
    layers: [
      {
        id: 'camera',
        type: 'input',
        name: 'Lectern camera',
        slot: 'input-1',
        capture: 'camera',
        audio: true,
        x: 0,
        y: 0,
        width: 70,
        height: 100,
        sessionId: viewerId,
        deviceToken: token,
      },
      {
        id: 'video',
        type: 'video',
        url: 'https://media.example.test/lesson.mp4',
        audio: false,
        x: 70,
        y: 0,
        width: 30,
        height: 100,
      },
    ],
  };
  const api = harness();
  const response = await api.request(
    'save-template',
    { name: ' Camera with video ', scene },
    'staff-token',
  );
  assert.equal(response.status, 200);
  const stored = api.rows.tv_scene_templates[0];
  assert.equal(stored.name, 'Camera with video');
  assert.equal(stored.screen_id, hall);
  assert.equal(stored.created_by, 'staff-id');
  assert.equal(stored.scene.layers[0].slot, 'input-1');
  assert.equal(stored.scene.layers[0].audio, true);
  assert.equal(stored.scene.layers[1].url, 'https://media.example.test/lesson.mp4');
  assert.equal(stored.scene.layers[1].width, 30);
  assert.equal(JSON.stringify(stored.scene).includes(token), false);
  assert.equal(JSON.stringify(stored.scene).includes(viewerId), false);
  assert.equal(JSON.stringify(stored.scene).includes(presentationId), false);
});

test('invalid saved scene fields are rejected before a template write', async () => {
  const scene = teaching().scenes[0];
  const invalidSources = [
    { ...scene.layers[0], type: 'unknown' },
    { ...scene.layers[0], x: 90 },
    {
      ...scene.layers[0],
      type: 'video',
      url: 'http://media.example.test/lesson.mp4',
      audio: false,
    },
    { ...scene.layers[0], type: 'input', slot: 'input-1', capture: 'camera' },
  ];
  const invalid = [
    { name: '', scene },
    { name: 'x'.repeat(81), scene },
    ...invalidSources.map((source) => ({ name: 'Scene', scene: { ...scene, layers: [source] } })),
  ];
  for (const values of invalid) {
    const api = harness();
    const response = await api.request('save-template', values, 'staff-token');
    assert.equal(response.status, 400);
    assert.equal(
      api.calls.some(
        (entry) => entry.table === 'tv_scene_templates' && entry.operation !== 'select',
      ),
      false,
    );
  }
});

test('blank region presets can be saved for reuse without starting a presentation', async () => {
  const api = harness({ settings: DEFAULT_TV_SETTINGS, presentation: null });
  const scene = {
    id: 'blank-scene',
    name: 'Blank canvas',
    overlap: true,
    layers: [{ id: 'area-1', type: 'empty', x: 0, y: 0, width: 100, height: 100 }],
  };
  const response = await api.request(
    'save-template',
    { name: 'Blank canvas', scene },
    'staff-token',
  );
  assert.equal(response.status, 200);
  assert.equal(response.data.template.scene.layers[0].type, 'empty');
  assert.equal(
    api.calls.some((entry) => entry.type === 'rpc'),
    false,
  );
  assert.equal(api.rows.tv_presentations.length, 0);
});

test('template replacement checks its revision and both replacement and deletion stay within the hall', async () => {
  const revision = '2026-09-12T10:00:00.000Z';
  const template = () => ({
    id: viewerId,
    screen_id: hall,
    name: 'Original',
    updated_at: revision,
    scene: teaching().scenes[0],
  });
  const values = {
    templateId: viewerId,
    expectedUpdatedAt: revision,
    name: 'Updated',
    scene: teaching().scenes[0],
  };
  const api = harness({ templates: [template()] });
  assert.equal((await api.request('save-template', values, 'staff-token')).status, 200);
  assert.equal(api.rows.tv_scene_templates[0].name, 'Updated');

  const stale = harness({ templates: [template()] });
  assert.equal(
    (await stale.request('save-template', { ...values, expectedUpdatedAt: past() }, 'staff-token'))
      .status,
    409,
  );
  assert.equal(stale.rows.tv_scene_templates[0].name, 'Original');

  const otherHall = harness({ templates: [{ ...template(), screen_id: 'ladies-upstairs' }] });
  assert.equal((await otherHall.request('save-template', values, 'staff-token')).status, 409);
  assert.equal(
    (await otherHall.request('delete-template', { templateId: viewerId }, 'staff-token')).status,
    200,
  );
  assert.equal(otherHall.rows.tv_scene_templates.length, 1);
  assert.equal(otherHall.rows.tv_scene_templates[0].name, 'Original');
});

test('whole stream templates save all scenes privately without changing the live presentation', async () => {
  const api = harness();
  const settings = teaching();
  settings.scenes.push({ ...settings.scenes[0], id: 'welcome', name: 'Welcome' });
  settings.active_scene_id = 'welcome';
  settings.muted = false;
  const response = await api.request(
    'save-template',
    { name: 'Private lesson', settings },
    'staff-token',
  );
  assert.equal(response.status, 200);
  assert.equal(response.data.template.settings.scenes.length, 2);
  assert.equal(response.data.template.settings.active_scene_id, 'welcome');
  assert.equal(response.data.template.settings.muted, false);
  assert.equal(
    api.calls.some((entry) => entry.type === 'rpc'),
    false,
  );
  settings.scenes[1].name = 'Stream 1';
  assert.equal(
    (await api.request('save-template', { name: 'Private lesson', settings }, 'staff-token'))
      .status,
    400,
  );
});
