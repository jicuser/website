import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TV_SCREENS,
  DEFAULT_TV_SETTINGS,
  validateSettings,
  publicSettings,
  activeSession,
  validDescription,
  isTvStaff,
  normaliseTvSettings,
  tvPanels,
} from '../supabase/functions/_shared/tv.js';

test('four TV destinations have stable unique addresses', () => {
  assert.deepEqual(
    TV_SCREENS.map((screen) => screen.id),
    ['mens-main', 'mens-upstairs', 'ladies-upstairs', 'shoe-area'],
  );
  assert.equal(new Set(TV_SCREENS.map((screen) => screen.label)).size, 4);
});

test('multiple sources keep their order and independent overlay switches', () => {
  const settings = validateSettings({
    panels: ['camera', 'share', 'poster', 'poster-next'],
    layout: 'focus-right',
    camera_url: 'https://camera.local/live.m3u8',
    show_times: false,
    show_next: true,
    show_clock: false,
  });
  assert.deepEqual(settings.panels, ['camera', 'share', 'poster', 'poster-next']);
  const view = publicSettings(settings);
  assert.equal(view.layout, 'focus-right');
  assert.equal(view.show_times, false);
  assert.equal(view.show_next, true);
  assert.equal(view.show_clock, false);
  assert.equal('camera_url' in view, false);
  assert.equal(publicSettings(settings, true).camera_url, settings.camera_url);
});

test('invalid panel combinations and display options are rejected at the API boundary', () => {
  for (const input of [
    { panels: [] },
    { panels: ['poster', 'poster'] },
    { panels: ['html'] },
    { panels: ['poster', 'poster-next', 'share', 'schedule', 'youtube'] },
    { panels: ['camera'] },
    { panels: ['youtube'] },
    { panels: 'poster' },
    { layout: 'javascript:alert(1)' },
    { show_times: 'false' },
    { show_next: 0 },
    { show_clock: null },
    { auto_jummah: 'yes' },
    { ramadan_calendar: 'invalid' },
    { calendar_offset: 3 },
    { calendar_offset: 0.5 },
  ])
    assert.throws(() => validateSettings(input));
});

test('old sources migrate and timed modes return to two posters at expiry', () => {
  const old = normaliseTvSettings({ mode: 'camera' });
  assert.deepEqual(old.panels, ['camera', 'poster']);
  const settings = { ...old, scene_mode: 'class', class_until: '2026-09-12T18:00:00Z' };
  const end = Date.parse(settings.class_until);
  assert.deepEqual(tvPanels(settings, end - 1), ['camera', 'poster']);
  assert.deepEqual(tvPanels(settings, end), ['poster', 'poster-next']);
  const shoe = validateSettings(
    { panels: ['camera', 'share'], ramadan_calendar: 'on' },
    'shoe-area',
  );
  assert.deepEqual(shoe.panels, ['poster', 'poster-next']);
  assert.equal(shoe.ramadan_calendar, 'off');
  assert.equal(shoe.auto_jummah, false);
  assert.deepEqual(tvPanels(settings, end - 1, 'shoe-area'), ['poster', 'poster-next']);
});
test('screen settings validate modes, poster choices and rotation', () => {
  assert.deepEqual(validateSettings(DEFAULT_TV_SETTINGS), DEFAULT_TV_SETTINGS);
  for (const change of [
    { mode: 'other' },
    { rotation_seconds: 4 },
    { rotation_seconds: 301 },
    { rotation_seconds: 5.5 },
    { poster_ids: ['missing'] },
    { poster_ids: [], include_events: false },
    { muted: 'false' },
    { mode: 'youtube' },
    { mode: 'camera' },
  ]) {
    assert.throws(() => validateSettings({ ...DEFAULT_TV_SETTINGS, ...change }));
  }
});
test('camera URLs require HTTPS and reject embedded credentials', () => {
  for (const url of [
    'http://camera.local/live.m3u8',
    'rtsp://camera.local/stream',
    'javascript:alert(1)',
    'https://admin:password@camera.local/stream',
    'https://camera.local/live#secret',
  ]) {
    assert.throws(() =>
      validateSettings({ ...DEFAULT_TV_SETTINGS, mode: 'camera', camera_url: url }),
    );
  }
  assert.equal(
    validateSettings({
      ...DEFAULT_TV_SETTINGS,
      mode: 'camera',
      camera_url: 'https://camera.local/live.m3u8',
    }).camera_url,
    'https://camera.local/live.m3u8',
  );
});
test('public screen data never contains camera URLs or extra private fields', () => {
  const settings = {
    ...DEFAULT_TV_SETTINGS,
    mode: 'camera',
    camera_url: 'https://camera.local/private.m3u8',
    deviceToken: 'secret',
    share_session: 'secret',
  };
  const publicView = publicSettings(settings);
  assert.equal(publicView.mode, 'posters');
  assert.equal(JSON.stringify(publicView).includes('secret'), false);
  assert.equal('camera_url' in publicView, false);
  const pairedView = publicSettings(settings, true);
  assert.equal(pairedView.camera_url, settings.camera_url);
  assert.equal('deviceToken' in pairedView, false);
});
test('only active trusted staff roles can manage TV screens', () => {
  for (const role of ['super_admin', 'admin', 'content_editor'])
    assert.equal(isTvStaff({ role, is_active: true }), true);
  for (const profile of [
    null,
    { role: 'viewer', is_active: true },
    { role: 'admin', is_active: false },
    { user_metadata: { role: 'admin' }, is_active: true },
  ])
    assert.equal(isTvStaff(profile), false);
});
test('expired sharing sessions and invalid SDP are rejected', () => {
  const now = Date.parse('2026-09-11T12:00:00Z');
  assert.equal(
    activeSession({ share_session: 'id', share_expires: '2026-09-11T12:01:00Z' }, now),
    true,
  );
  assert.equal(
    activeSession({ share_session: 'id', share_expires: '2026-09-11T11:59:00Z' }, now),
    false,
  );
  assert.equal(
    activeSession({ share_session: null, share_expires: '2026-09-11T12:01:00Z' }, now),
    false,
  );
  assert.equal(validDescription({ type: 'offer', sdp: 'v=0\r\n' }, 'offer'), true);
  for (const description of [
    null,
    { type: 'answer', sdp: 'v=0' },
    { type: 'offer', sdp: 'not sdp' },
    { type: 'offer', sdp: 'v=0' + 'a'.repeat(65536) },
  ])
    assert.equal(validDescription(description, 'offer'), false);
});
