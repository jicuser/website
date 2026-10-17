import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { toPence } from '../src/features/operations/model.js';
import { polycamEmbed, validateStages, DEFAULT_STAGES } from '../src/features/projects/model.js';

test('currency inputs do not silently round or accept negative and exponential values', () => {
  assert.equal(toPence('19.99'), 1999);
  assert.equal(toPence('1.5'), 150);
  for (const amount of ['-1', '1.999', '1e3', 'Infinity', '1,000', '0', '1000001'])
    assert.throws(() => toPence(amount));
});
test('project walkthroughs accept only public Polycam capture URLs, never embedded scripts or other origins', () => {
  assert.equal(
    polycamEmbed('https://poly.cam/capture/abc123'),
    'https://poly.cam/capture/abc123/embed',
  );
  assert.equal(
    polycamEmbed('<iframe src="https://poly.cam/capture/abc123/embed"></iframe>'),
    'https://poly.cam/capture/abc123/embed',
  );
  for (const value of [
    'javascript:alert(1)',
    'https://poly.cam.evil.test/capture/a',
    'https://user@poly.cam/capture/a',
    'https://poly.cam:4430/capture/a',
    'https://poly.cam/account',
  ])
    assert.equal(polycamEmbed(value), '');
  assert.equal(validateStages(DEFAULT_STAGES).length, 4);
  assert.throws(() => validateStages([...DEFAULT_STAGES, DEFAULT_STAGES[0]]));
});
test('community operations enforce ownership, permissions, financial integrity and public projections', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,private,public to authenticated,service_role,anon;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create table public.profiles(id uuid primary key references auth.users,display_name text,is_active boolean default true,is_owner boolean default false,permissions text[] default '{}',staff_kinds text[] default '{}',updated_at timestamptz default now());
 create table public.audit_log(id bigint generated always as identity primary key,actor_id uuid,actor_name text,table_name text,record_id text,action text,old_data jsonb,new_data jsonb);
 alter table public.profiles enable row level security;
 grant select on public.profiles to authenticated;
 create policy self_read on public.profiles for select to authenticated using(id=auth.uid());
 create function private.has_permission(required text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and is_active and (is_owner or required=any(permissions)))$$;
 grant all on public.profiles,public.audit_log,auth.users to service_role;grant all on all sequences in schema public to service_role;`);
  const staffSql = await readFile(
    new URL(
      '../supabase/migrations/20260912021743_explicit_staff_permissions.sql',
      import.meta.url,
    ),
    'utf8',
  );
  await db.exec(
    staffSql.slice(
      staffSql.indexOf('create function public.manage_staff_access'),
      staffSql.indexOf('drop function if exists public.has_role'),
    ),
  );
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/20261017225316_community_operations.sql', import.meta.url),
      'utf8',
    ),
  );
  const users = {
    owner: '10000000-0000-4000-8000-000000000001',
    member: '10000000-0000-4000-8000-000000000002',
    other: '10000000-0000-4000-8000-000000000003',
    finance: '10000000-0000-4000-8000-000000000004',
    reviewer: '10000000-0000-4000-8000-000000000005',
  };
  for (const [name, id] of Object.entries(users)) {
    await db.query('insert into auth.users values($1,$2,now())', [id, `${name}@example.test`]);
    await db.query(
      'insert into public.profiles(id,display_name,is_owner,permissions) values($1,$2,$3,$4)',
      [
        id,
        name,
        name === 'owner',
        name === 'finance' ? ['finance'] : name === 'reviewer' ? ['fundraising'] : [],
      ],
    );
  }
  const run = async (user, sql, args = [], role = 'authenticated') => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [users[user] || '']);
    await db.exec(`set role ${role}`);
    try {
      return (await db.query(sql, args)).rows;
    } finally {
      await db.exec('reset role');
    }
  };
  const call = async (user, fn, args = [], role = 'authenticated') =>
    (
      await run(
        user,
        `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(',')}) result`,
        args,
        role,
      )
    )[0].result;
  const campaignBody = {
    title: 'Test community fundraiser',
    organiser: 'A community member',
    story: 'A fixture fundraiser used only in this isolated database to check permissions.',
    category: 'ramadan',
    target_pence: 50000,
  };
  let campaign, invoice;
  await t.test(
    'public clients cannot read requests or private records; members cannot perform staff actions',
    async () => {
      await assert.rejects(
        run('', 'select * from public.account_access_requests', [], 'anon'),
        /permission denied/,
      );
      await assert.rejects(call('member', 'community_finance_overview'), /Finance permission/);
      await assert.rejects(
        call('member', 'submit_account_request', [{}, 'a'.repeat(64)]),
        /permission denied/,
      );
      assert.deepEqual(await run('member', 'select * from public.community_invoices'), []);
      assert.deepEqual(
        await run('finance', 'select * from public.community_safeguarding_checks'),
        [],
      );
    },
  );
  await t.test(
    'campaign owners can edit pending pages but cannot publish or edit another person’s page',
    async () => {
      campaign = await call('member', 'save_community_campaign', [null, campaignBody, null]);
      assert.equal((await run('other', 'select * from public.community_campaigns')).length, 0);
      assert.deepEqual(await call('', 'public_community_campaigns', [null], 'anon'), []);
      await assert.rejects(
        call('other', 'save_community_campaign', [campaign, campaignBody, 1]),
        /Only your campaigns/,
      );
      await assert.rejects(
        call('member', 'review_community_campaign', [campaign, 'published', '', 1]),
        /Fundraising permission/,
      );
      await call('reviewer', 'review_community_campaign', [
        campaign,
        'published',
        'Staff-only review note',
        1,
      ]);
      const published = (await call('', 'public_community_campaigns', [null], 'anon'))[0];
      assert.equal(published.title, campaignBody.title);
      assert.equal(published.raised_pence, 0);
      for (const key of ['owner_id', 'review_note', 'reviewed_by'])
        assert.equal(key in published, false);
      await assert.rejects(
        call('member', 'save_community_campaign', [campaign, campaignBody, 2]),
        /Only your campaigns/,
      );
    },
  );
  await t.test(
    'invoice totals come from validated items; issue requires configured issuer and makes the draft immutable',
    async () => {
      const body = {
        kind: 'janazah',
        recipient_name: 'Test family',
        recipient_address: '1 Fixture Road, Birmingham',
        recipient_email: 'member@example.test',
        member_id: users.member,
        supply_date: '2026-10-01',
        due_date: '2026-10-12',
        lines: [{ description: 'Test service', quantity: 2, unit_pence: 5000 }],
        total_pence: 1,
      };
      invoice = await call('finance', 'save_community_invoice', [null, body, null]);
      assert.deepEqual(await call('member', 'my_community_invoices'), []);
      await assert.rejects(
        call('finance', 'issue_community_invoice', [invoice, 1]),
        /Confirm the issuing/,
      );
      await call('finance', 'save_community_finance_settings', [
        {
          issuer_name: 'Test JIC',
          issuer_address: '1 Test Road, Birmingham',
          issuer_email: 'test@example.test',
          non_vat_confirmed: true,
        },
      ]);
      await call('finance', 'issue_community_invoice', [invoice, 1]);
      const personal = await call('member', 'my_community_invoices');
      assert.equal(personal[0].total_pence, 10000);
      assert.match(personal[0].number, /^JIC-\d{4}-\d{6}$/);
      assert.deepEqual(await call('other', 'my_community_invoices'), []);
      await assert.rejects(
        call('finance', 'save_community_invoice', [invoice, body, 2]),
        /changed or was issued/,
      );
      await assert.rejects(
        run('member', 'update public.community_invoices set total_pence=1 where id=$1', [invoice]),
        /permission denied/,
      );
    },
  );
  await t.test(
    'payments are idempotent, cannot overpay and use auditable corrections before voiding',
    async () => {
      const key = '20000000-0000-4000-8000-000000000001';
      const args = [invoice, null, 6000, '2026-10-10', 'bank', 'Fixture receipt', key];
      const id = await call('finance', 'record_community_payment', args);
      assert.equal(await call('finance', 'record_community_payment', args), id);
      await assert.rejects(
        call('finance', 'record_community_payment', [
          invoice,
          null,
          6001,
          '2026-10-10',
          'bank',
          'Fixture receipt',
          key,
        ]),
        /already used/,
      );
      await assert.rejects(
        call('finance', 'record_community_payment', [
          invoice,
          null,
          5000,
          '2026-10-10',
          'bank',
          'Other receipt',
          '20000000-0000-4000-8000-000000000002',
        ]),
        /greater than/,
      );
      await assert.rejects(
        call('finance', 'void_community_invoice', [invoice, 'Test cancellation']),
        /Reverse recorded/,
      );
      let overview = await call('finance', 'community_finance_overview');
      assert.equal(overview.outstanding, 4000);
      assert.equal(overview.received, 6000);
      await call('finance', 'reverse_community_payment', [
        id,
        'Correction of fixture record',
        '20000000-0000-4000-8000-000000000003',
      ]);
      overview = await call('finance', 'community_finance_overview');
      assert.equal(overview.outstanding, 10000);
      assert.equal(overview.received, 0);
      assert.equal(overview.payments.length, 2);
      await call('finance', 'void_community_invoice', [invoice, 'Test cancellation']);
      assert.equal((await call('finance', 'community_finance_overview')).outstanding, 0);
    },
  );
  await t.test(
    'only finance can confirm donation totals; public output never contains payment references',
    async () => {
      const args = [
        null,
        campaign,
        2500,
        '2026-10-11',
        'cash',
        'Private cash receipt',
        '30000000-0000-4000-8000-000000000001',
      ];
      await assert.rejects(
        call('reviewer', 'record_community_payment', args),
        /Finance permission/,
      );
      await call('finance', 'record_community_payment', args);
      const published = (await call('', 'public_community_campaigns', [null], 'anon'))[0];
      assert.equal(published.raised_pence, 2500);
      assert.equal(JSON.stringify(published).includes('Private cash'), false);
    },
  );
  await t.test(
    'account requests deduplicate and approval supports an existing email account without self-assigned permissions',
    async () => {
      const body = {
        display_name: 'Existing member',
        email: 'member@example.test',
        requested_role: 'volunteer',
        requested_features: ['staff'],
        message: 'I would like to volunteer.',
      };
      await call('', 'submit_account_request', [body, 'b'.repeat(64)], 'service_role');
      await call('', 'submit_account_request', [body, 'b'.repeat(64)], 'service_role');
      const result = await db.query('select * from account_access_requests');
      assert.equal(result.rows.length, 1);
      const id = result.rows[0].id;
      assert.equal(await call('', 'account_request_user', [id], 'service_role'), users.member);
      await call(
        '',
        'resolve_account_request',
        [users.owner, id, users.member, [], ['volunteer'], true],
        'service_role',
      );
      const p = (await db.query('select * from profiles where id=$1', [users.member])).rows[0];
      assert.deepEqual(p.permissions, []);
      assert.deepEqual(p.staff_kinds, ['volunteer']);
      await assert.rejects(
        call(
          '',
          'resolve_account_request',
          [users.owner, id, users.member, ['finance'], [], true],
          'service_role',
        ),
        /already been reviewed/,
      );
    },
  );
  await t.test(
    'safeguarding requires a separate permission and acknowledged policy; disabled users lose access',
    async () => {
      const body = {
        subject_name: 'Test volunteer',
        role_name: 'Children’s tutor',
        check_level: 'enhanced',
        checked_on: '2026-10-01',
        review_on: '2027-10-01',
        retention_review_on: '2027-04-01',
        status: 'recorded',
        policy_reference: 'Test policy reference',
        policy_confirmed: true,
      };
      await assert.rejects(
        call('finance', 'save_community_safeguarding', [null, body, null]),
        /Safeguarding permission/,
      );
      await assert.rejects(
        call('owner', 'save_community_safeguarding', [
          null,
          { ...body, policy_confirmed: false },
          null,
        ]),
        /check constraint/,
      );
      const id = await call('owner', 'save_community_safeguarding', [null, body, null]);
      assert.equal((await run('finance', 'select * from community_safeguarding_checks')).length, 0);
      await call('owner', 'remove_community_safeguarding', [id]);
      await db.query('update profiles set is_active=false where id=$1', [users.finance]);
      await assert.rejects(call('finance', 'community_finance_overview'), /Finance permission/);
    },
  );
});
