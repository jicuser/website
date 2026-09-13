import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import {
  verifyWebhook,
  emailAddress,
  threadFromAddresses,
  resendProvider,
  dispatchEmails,
  receiveEmail,
} from '../services/form-email/service.mjs';
const id = '00000000-0000-4000-8000-000000000001',
  second = '00000000-0000-4000-8000-000000000002';
const secret = `whsec_${Buffer.from('a-secret-of-at-least-32-characters').toString('base64')}`;
const sign = (raw, ts = 1700000000) => ({
  'svix-id': 'msg_test',
  'svix-timestamp': String(ts),
  'svix-signature': `v1,${createHmac('sha256', Buffer.from(secret.slice(6), 'base64'))
    .update(`msg_test.${ts}.${raw}`)
    .digest('base64')}`,
});
test('signed email webhook rejects tampering, expired replay and untrusted routing', () => {
  const raw = '{"type":"email.received"}';
  assert.deepEqual(verifyWebhook(raw, sign(raw), secret, 1700000000000), {
    type: 'email.received',
  });
  assert.throws(() => verifyWebhook(raw + ' ', sign(raw), secret, 1700000000000), /invalid/);
  assert.throws(() => verifyWebhook(raw, sign(raw), secret, 1700001000000), /invalid/);
  assert.equal(emailAddress('Test <person@example.org>'), 'person@example.org');
  assert.equal(emailAddress('person@example.org\r\nBcc: hidden@example.org'), null);
  assert.equal(threadFromAddresses([`reply+${id}@reply.example.org`], 'reply.example.org'), id);
  assert.equal(threadFromAddresses([`reply+${id}@evil.example.org`], 'reply.example.org'), null);
});
test('send uses text-only payload, fixed reply alias and idempotency key', async () => {
  let call;
  const provider = resendProvider({
    key: 'fake',
    from: 'Office <office@example.org>',
    replyDomain: 'reply.example.org',
    fetcher: async (url, init) => {
      call = { url, init };
      return { ok: true, json: async () => ({ id: 'provider-id' }) };
    },
  });
  await provider.send({
    id,
    thread_id: second,
    recipient: 'visitor@example.org',
    subject: 'Reviewed subject',
    body: 'Reviewed reply',
  });
  assert.equal(call.url, 'https://api.resend.com/emails');
  assert.equal(call.init.headers['Idempotency-Key'], `form-email/${id}`);
  const body = JSON.parse(call.init.body);
  assert.equal(body.reply_to, `reply+${second}@reply.example.org`);
  assert.equal(body.html, undefined);
  assert.equal(body.text, 'Reviewed reply');
});
test('disabled email worker never claims jobs or calls provider', async () => {
  const calls = [];
  await dispatchEmails({
    enabled: false,
    backend: { rpc: async (name, args) => calls.push({ name, args }) },
    provider: {
      send: () => {
        throw Error('Must not send');
      },
    },
  });
  assert.deepEqual(calls, [{ name: 'set_form_email_ready', args: { p_enabled: false } }]);
});
test('signed receiving fetches body from provider and quarantines without marking sender authenticated', async () => {
  const raw = JSON.stringify({ type: 'email.received', data: { email_id: id } }),
    calls = [];
  await receiveEmail({
    raw,
    headers: sign(raw),
    secret,
    now: 1700000000000,
    replyDomain: 'reply.example.org',
    backend: { rpc: async (name, args) => calls.push({ name, args }) },
    provider: {
      receive: async () => ({
        id,
        to: [`reply+${second}@reply.example.org`],
        from: 'Visitor <visitor@example.org>',
        subject: 'Re: answer',
        text: 'My response',
        attachments: [{ filename: 'unsafe.html' }],
      }),
    },
  });
  assert.equal(calls[0].name, 'receive_form_email');
  assert.equal(calls[0].args.p_sender, 'visitor@example.org');
  assert.match(calls[0].args.p_body, /not imported/);
  assert.equal(calls[0].args.author_id, undefined);
});
test('email SQL requires explicit staff sends and quarantines inbound until review', async () => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema private;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,private,auth to anon,authenticated,service_role;
 create table profiles(id uuid primary key,is_active boolean default true);insert into profiles values('${id}',true),('${second}',true);
 create table form_submissions(id uuid primary key,custom_form_id uuid,submitter_id uuid);insert into form_submissions values('${id}','${id}','${second}');
 create table custom_form_staff(form_id uuid,user_id uuid);insert into custom_form_staff values('${id}','${id}');
 create table form_replies(id uuid primary key default gen_random_uuid(),submission_id uuid references form_submissions,author_id uuid not null references profiles,body text,internal boolean default false,created_at timestamptz default now());
 create table user_notifications(user_id uuid,kind text,entity_id uuid);
 create function private.active_account(account uuid) returns boolean language sql stable security definer as $$select exists(select 1 from public.profiles where id=account and is_active)$$;
 create function private.staff_custom_submission(submission uuid,account uuid default auth.uid()) returns boolean language sql stable security definer as $$select account='${id}'::uuid and submission='${id}'::uuid and private.active_account(account)$$;
 create function private.reply_custom_form(submission uuid,body text,internal boolean) returns uuid language plpgsql security definer as $$declare result uuid;begin insert into public.form_replies(submission_id,author_id,body,internal) values(submission,auth.uid(),body,internal) returning id into result;return result;end;$$;
 grant all on profiles,form_submissions,custom_form_staff,form_replies,user_notifications to service_role;`);
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/20260913113136_optional_form_email.sql', import.meta.url),
      'utf8',
    ),
  );
  const as = async (role, user, fn) => {
    await db.exec(
      `set role ${role};select set_config('request.jwt.claim.sub','${user || ''}',false)`,
    );
    try {
      return await fn();
    } finally {
      await db.exec('reset role');
    }
  };
  const queue = (ack = true, body = 'Reviewed reply') =>
    db.query('select queue_form_email($1,$2,$3,$4,$5,$6) as id', [
      id,
      'visitor@example.org',
      'Reply',
      body,
      second,
      ack,
    ]);
  try {
    await as('authenticated', id, () => assert.rejects(() => queue(), /not configured/));
    await as('service_role', null, () => db.query('select set_form_email_ready(true)'));
    await as('authenticated', second, () => assert.rejects(() => queue(), /staff/));
    await as('authenticated', id, () => assert.rejects(() => queue(false), /Review/));
    await as('authenticated', id, async () => {
      assert.equal((await queue()).rows[0].id, second);
      assert.equal((await queue()).rows[0].id, second);
      await assert.rejects(() => queue(true, 'Changed reply'), /changed/);
    });
    assert.equal((await db.query('select count(*) n from form_replies')).rows[0].n, 1);
    assert.equal(
      (await as('authenticated', second, () => db.query('select * from form_email_outbox'))).rows
        .length,
      0,
    );
    await as('authenticated', id, () =>
      assert.rejects(() => db.query('select claim_form_emails()'), /permission denied/),
    );
    const job = (
      await as('service_role', null, () => db.query('select * from claim_form_emails()'))
    ).rows[0];
    assert.equal(job.status, 'sending');
    assert.equal(
      (await as('service_role', null, () => db.query('select * from claim_form_emails()'))).rows
        .length,
      0,
    );
    await as('service_role', null, () =>
      db.query('select finish_form_email($1,$2,$3)', [second, job.lease_id, 'provider-id']),
    );
    await as('service_role', null, async () => {
      await db.query('select receive_form_email($1,$2,$3,$4,$5)', [
        'inbound-id',
        job.thread_id,
        'claimed@example.org',
        'Hello',
        'Unverified inbound',
      ]);
      await db.query('select receive_form_email($1,$2,$3,$4,$5)', [
        'inbound-id',
        job.thread_id,
        'claimed@example.org',
        'Hello',
        'Unverified inbound',
      ]);
    });
    assert.equal((await db.query('select count(*) n from form_email_incoming')).rows[0].n, 1);
    assert.equal((await db.query('select count(*) n from form_replies')).rows[0].n, 1);
    const received = (await db.query('select id from form_email_incoming')).rows[0].id;
    await as('authenticated', second, () =>
      assert.rejects(() => db.query('select review_form_email($1,true)', [received]), /staff/),
    );
    await as('authenticated', id, () => db.query('select review_form_email($1,true)', [received]));
    const reply = (await db.query("select * from form_replies where author_kind='email'")).rows[0];
    assert.equal(reply.author_id, null);
    assert.equal(reply.body, 'Unverified inbound');
    await as('authenticated', id, () => db.query('select review_form_email($1,true)', [received]));
    assert.equal(
      (await db.query("select count(*) n from form_replies where author_kind='email'")).rows[0].n,
      1,
    );
  } finally {
    await db.close();
  }
});

test('worker rechecks staff access before sending a claimed message', async () => {
  const calls = [];
  let sent = false;
  const backend = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === 'claim_form_emails') return [{ id, lease_id: second }];
      if (name === 'form_email_send_allowed') return false;
      return null;
    },
  };
  await dispatchEmails({
    enabled: true,
    backend,
    provider: {
      send: async () => {
        sent = true;
        return 'never';
      },
    },
  });
  assert.equal(sent, false);
  assert.equal(calls.at(-1).name, 'finish_form_email');
  assert.equal(calls.at(-1).args.p_error, 'staff_access_revoked');
});

test('email bridge runs against the real shared workspace and custom-form migrations', async () => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create schema private;create schema storage;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth,private to anon,authenticated,service_role;
    create table profiles(id uuid primary key,display_name text,is_active boolean default true,is_owner boolean default false,permissions text[] default '{}',staff_kinds text[] default '{}');
    create table form_submissions(id uuid primary key default gen_random_uuid(),kind text not null check(kind in('contact','madrassah','itikaaf')),payload jsonb default '{}' check(octet_length(payload::text)<=24000),status text default 'new' check(status in('new','done')),created_at timestamptz default now());
    create function private.has_permission(required text) returns boolean language sql stable security definer set search_path='' as $$ select coalesce((select is_active and (is_owner or required=any(permissions)) from public.profiles where id=auth.uid()),false) $$;
    alter table form_submissions enable row level security;grant select on form_submissions to authenticated;grant update(status) on form_submissions to authenticated;grant all on profiles,form_submissions to service_role;
    create policy forms_read on form_submissions for select to authenticated using(private.has_permission('forms_'||kind));
    create policy forms_update on form_submissions for update to authenticated using(private.has_permission('forms_'||kind)) with check(private.has_permission('forms_'||kind));
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);`);
  for (const file of [
    '20260913100552_community_workspace.sql',
    '20260913111401_custom_forms.sql',
    '20260913113136_optional_form_email.sql',
  ])
    await db.exec(
      await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'),
    );
  await db.exec(
    `insert into profiles(id,display_name,is_owner) values('${id}','Owner',true),('${second}','Visitor',false);`,
  );
  const as = async (role, user, fn) => {
    await db.exec(
      `set role ${role};select set_config('request.jwt.claim.sub','${user || ''}',false);`,
    );
    try {
      return await fn();
    } finally {
      await db.exec('reset role');
    }
  };
  try {
    const form = (
      await as('authenticated', id, () =>
        db.query('select save_custom_form($1) id', [
          JSON.stringify({
            slug: 'email-help',
            title: 'Help',
            description: '',
            schema: { fields: [{ id: 'name', label: 'Name', type: 'text', required: true }] },
            task_title: 'Respond',
            due_hours: 24,
            responsible_ids: [id],
            manager_ids: [],
            watcher_ids: [],
          }),
        ]),
      )
    ).rows[0].id;
    await as('authenticated', id, () => db.query('select publish_custom_form($1)', [form]));
    const submission = (
      await as('service_role', null, () =>
        db.query('select submit_custom_form($1,$2,$3,$4,$5,$6,$7) id', [
          'email-help',
          1,
          JSON.stringify({ name: 'Visitor' }),
          'a'.repeat(64),
          id,
          second,
          '[]',
        ]),
      )
    ).rows[0].id;
    await as('service_role', null, () => db.query('select set_form_email_ready(true)'));
    await as('authenticated', id, () =>
      db.query('select queue_form_email($1,$2,$3,$4,$5,true)', [
        submission,
        'visitor@example.org',
        'Follow up',
        'A reviewed reply',
        second,
      ]),
    );
    const job = (
      await as('service_role', null, () => db.query('select * from claim_form_emails()'))
    ).rows[0];
    assert.equal(job.created_by, id);
    assert.equal(
      (
        await as('service_role', null, () =>
          db.query('select form_email_send_allowed($1,$2) allowed', [job.id, job.lease_id]),
        )
      ).rows[0].allowed,
      true,
    );
    await db.query('update profiles set is_active=false where id=$1', [id]);
    assert.equal(
      (
        await as('service_role', null, () =>
          db.query('select form_email_send_allowed($1,$2) allowed', [job.id, job.lease_id]),
        )
      ).rows[0].allowed,
      false,
    );
    assert.equal(Number((await db.query('select count(*) n from form_replies')).rows[0].n), 1);
  } finally {
    await db.close();
  }
});
