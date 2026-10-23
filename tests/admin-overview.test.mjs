import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAdminOverview, summariseForms } from '../src/features/admin/overview.js';
import { findAdminTasks, getAdminEntrySections } from '../src/features/admin/taskNavigation.js';
import { ADMIN_SECTIONS, ADMIN_GROUPS } from '../src/content/adminNavigation.js';
import { hasPermission } from '../supabase/functions/_shared/access.js';
import {
  activityActionLabel,
  activityAreaLabel,
  loadAdminActivity,
} from '../src/features/admin/activity.js';

test('Contact Us and registration responses share one permitted forms total', async () => {
  const calls = [];
  const client = {
    rpc(name, args) {
      calls.push([name, args?.p_kind]);
      return {
        abortSignal: async () => ({
          data:
            name === 'admin_forms_overview'
              ? [{ new_count: 3, done_count: 1, open_actions: 1 }]
              : { new_count: 9, done_count: 2 },
        }),
      };
    },
  };
  const result = await loadAdminOverview(client, {
    can: (permission) => ['forms', 'forms_contact'].includes(permission),
    certificatesEnabled: false,
  });
  assert.deepEqual(result, {
    forms: { value: { waiting: 12, complete: 3, actions: 1, forms: 2 }, error: false },
  });
  assert.deepEqual(calls, [
    ['admin_forms_overview', undefined],
    ['search_form_submissions', 'contact'],
  ]);
});

test('overview skips unauthorised and disabled areas entirely', async () => {
  const client = new Proxy(
    {},
    {
      get: () => {
        throw new Error('No requests permitted');
      },
    },
  );
  assert.deepEqual(
    await loadAdminOverview(client, { can: () => false, certificatesEnabled: true }),
    {},
  );
  assert.deepEqual(
    await loadAdminOverview(client, {
      can: (permission) => permission === 'certificates',
      certificatesEnabled: false,
    }),
    {},
  );
});

test('a failed queue is unavailable while other queues keep their real counts', async () => {
  const seen = [];
  const client = {
    from(table) {
      seen.push(table);
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        abortSignal() {
          return Promise.resolve({ count: 7 });
        },
      };
    },
    rpc(name, args) {
      seen.push(name);
      return {
        abortSignal() {
          return Promise.resolve(
            args?.p_kind === 'contact'
              ? { error: { message: 'Unavailable' } }
              : {
                  data:
                    name === 'search_form_submissions'
                      ? { new_count: 0, done_count: 0 }
                      : [{ new_count: 3, done_count: 5, open_actions: 2 }],
                },
          );
        },
      };
    },
  };
  const result = await loadAdminOverview(client, { can: () => true, certificatesEnabled: true });
  assert.equal(result.messages, undefined);
  assert.deepEqual(result.forms, { value: null, error: true });
  assert.deepEqual(result.certificates, { value: 7, error: false });
  assert.deepEqual(seen, [
    'admin_forms_overview',
    'certificate_requests',
    'search_form_submissions',
    'search_form_submissions',
    'search_form_submissions',
  ]);
  assert.deepEqual(summariseForms([]), { waiting: 0, complete: 0, actions: 0, forms: 0 });
});

test('a permitted queue can report a real zero without querying any other area', async () => {
  const signal = new AbortController().signal;
  for (const [permission, table, filters, key] of [
    ['certificates', 'certificate_requests', [['status', 'pending']], 'certificates'],
  ]) {
    const seen = [];
    const client = {
      from(name) {
        seen.push(name);
        const applied = [];
        return {
          select() {
            return this;
          },
          eq(column, value) {
            applied.push([column, value]);
            return this;
          },
          abortSignal(requestSignal) {
            assert.equal(requestSignal, signal);
            assert.deepEqual(applied, filters);
            return Promise.resolve({ count: 0 });
          },
        };
      },
      rpc() {
        throw new Error('No forms request permitted');
      },
    };
    const result = await loadAdminOverview(client, {
      can: (requested) => requested === permission,
      certificatesEnabled: true,
      signal,
    });
    assert.deepEqual(seen, [table]);
    assert.deepEqual(result, { [key]: { value: 0, error: false } });
  }
});

test('task search matches everyday words across fields and keeps unauthorised tasks hidden', () => {
  const sections = [
    { id: 'dashboard', name: 'Overview', permission: 'dashboard' },
    {
      id: 'prayer',
      name: 'Prayer times',
      permission: 'prayer_times',
      group: 'Prayer & displays',
      description: 'Update the timetable and Jummah times.',
      keywords: ['edit', 'salah'],
    },
    {
      id: 'users',
      name: 'Staff & access',
      permission: 'users',
      group: 'Staff & system',
      description: 'Invite staff and manage permissions.',
      keywords: ['accounts', 'users'],
    },
  ];
  const can = (permission) => ['dashboard', 'prayer_times'].includes(permission);
  assert.deepEqual(
    findAdminTasks(sections, can).map(({ id }) => id),
    ['prayer'],
  );
  for (const query of ['  EDIT   salah ', 'timetable prayer', 'prayer & displays']) {
    assert.deepEqual(
      findAdminTasks(sections, can, query).map(({ id }) => id),
      ['prayer'],
    );
  }
  assert.deepEqual(findAdminTasks(sections, can, 'users'), []);
  assert.deepEqual(findAdminTasks(sections, can, 'prayer accounts'), []);
  assert.deepEqual(
    findAdminTasks(sections, () => false),
    [],
  );
});

test('malformed response totals stay unavailable instead of becoming an empty inbox', async () => {
  for (const value of [null, '', -1, 1.5, 'unknown', Number.MAX_SAFE_INTEGER + 1]) {
    const client = {
      rpc() {
        return {
          abortSignal: async () => ({
            data: [{ new_count: value, done_count: 0, open_actions: 0 }],
          }),
        };
      },
    };
    const result = await loadAdminOverview(client, {
      can: (permission) => permission === 'forms',
      certificatesEnabled: false,
    });
    assert.deepEqual(result.forms, { value: null, error: true });
  }
  assert.deepEqual(summariseForms([{ new_count: '3', done_count: 4, open_actions: '2' }]), {
    waiting: 3,
    complete: 4,
    actions: 2,
    forms: 1,
  });
});

test('every authorised staff role gets a home without gaining extra tools', () => {
  for (const [profile, ids] of [
    [{ permissions: ['tv'] }, ['tv']],
    [{ permissions: [], has_assigned_forms: true }, ['forms']],
    [{ permissions: ['forms_contact'] }, ['forms']],
    [{ permissions: ['media'] }, []],
  ]) {
    const can = (permission) => hasPermission({ ...profile, is_active: true }, permission);
    const tasks = findAdminTasks(ADMIN_SECTIONS, can);
    assert.deepEqual(
      tasks.map(({ id }) => id),
      ids,
    );
    const available = ADMIN_SECTIONS.filter(({ permission }) => can(permission));
    const navigation = getAdminEntrySections(available.map(({ id }) => id));
    assert.equal(navigation.overviewSection, 'dashboard');
    assert.equal(navigation.defaultSection, 'dashboard');
  }
  assert.deepEqual(getAdminEntrySections(['finance', 'dashboard']), {
    defaultSection: 'dashboard',
    overviewSection: 'dashboard',
  });
});

test('staff task groups retain a clear order and real tasks have useful search aliases', () => {
  assert.equal(ADMIN_GROUPS[0], 'Workspace');
  assert.equal(ADMIN_SECTIONS[0].id, 'dashboard');
  assert.equal(new Set(ADMIN_GROUPS).size, ADMIN_GROUPS.length);
  assert.ok(ADMIN_SECTIONS.every(({ group }) => ADMIN_GROUPS.includes(group)));
  for (const [query, id] of [
    ['contact', 'forms'],
    ['messages', 'forms'],
    ['announcements', 'announcements'],
    ['audit', 'audit'],
    ['users', 'users'],
    ['YouTube', 'livestream'],
    ['edit salah', 'prayer'],
    ['invoices', 'finance'],
  ]) {
    assert.ok(findAdminTasks(ADMIN_SECTIONS, () => true, query).some((task) => task.id === id));
  }
});

test('activity loading distinguishes a real empty log from failed and malformed reads', async () => {
  const client = (response) => ({
    from() {
      return {
        select() {
          return this;
        },
        order() {
          return this;
        },
        limit(size) {
          assert.equal(size, 100);
          return response;
        },
      };
    },
  });
  assert.deepEqual(await loadAdminActivity(client({ data: [] })), []);
  const rows = [{ id: 'record', action: 'UPDATE', table_name: 'page_content' }];
  assert.deepEqual(await loadAdminActivity(client({ data: rows })), rows);
  for (const response of [
    { data: null },
    { data: [null] },
    { data: [], error: { message: 'Connection failed' } },
  ]) {
    await assert.rejects(loadAdminActivity(client(response)), /could not be loaded/);
  }
  await assert.rejects(
    loadAdminActivity({
      from() {
        throw new Error('Network failure');
      },
    }),
    /could not be loaded/,
  );
});

test('activity labels explain known areas and retain readable unfamiliar names', () => {
  assert.equal(activityAreaLabel('form_submissions'), 'Form responses');
  assert.equal(activityAreaLabel('community_invoices'), 'Invoices');
  assert.equal(activityActionLabel('REASSIGN'), 'Reassigned');
  assert.equal(activityAreaLabel('new_record_area'), 'New record area');
  assert.equal(activityActionLabel('CUSTOM_REVIEW'), 'Custom review');
  assert.equal(activityAreaLabel('__proto__'), 'Proto');
  assert.equal(activityAreaLabel(null), 'Centre records');
  assert.equal(activityActionLabel(null), 'Change recorded');
});

test('staff home includes permitted registration counts without reading other forms', async () => {
  const calls = [];
  const client = {
    rpc(name, args) {
      calls.push([name, args?.p_kind]);
      return {
        abortSignal: async () => ({
          data:
            name === 'admin_forms_overview'
              ? [{ new_count: 2, done_count: 4, open_actions: 1 }]
              : { new_count: 3, done_count: 1 },
        }),
      };
    },
  };
  const result = await loadAdminOverview(client, {
    can: (permission) => ['forms', 'forms_madrassah'].includes(permission),
    certificatesEnabled: false,
  });
  assert.deepEqual(result.forms, {
    value: { waiting: 5, complete: 5, actions: 1, forms: 2 },
    error: false,
  });
  assert.deepEqual(calls, [
    ['admin_forms_overview', undefined],
    ['search_form_submissions', 'madrassah'],
  ]);
});

test('a personal member or disabled staff account cannot open staff home', () => {
  for (const profile of [
    { is_active: true, permissions: [] },
    { is_active: true, permissions: ['unrecognised'] },
    { is_active: false, permissions: ['tv'] },
  ])
    assert.equal(hasPermission(profile, 'dashboard'), false);
});
