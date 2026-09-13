import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner = id(1),
  teacher = id(2),
  parent = id(3),
  other = id(4),
  office = id(5),
  student = id(6),
  course = id(11),
  pupil = id(12),
  form = id(13);
test('fee ledger enforces source access, integer balances, immutable receipts and exact provider reconciliation', async (t) => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema private;create schema storage;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth,private to anon,authenticated,service_role;
 create table profiles(id uuid primary key,display_name text,is_active boolean default true,is_owner boolean default false,permissions text[] default '{}',staff_kinds text[] default '{}');
 create table form_submissions(id uuid primary key default gen_random_uuid(),kind text not null check(kind in('contact','madrassah','itikaaf')),payload jsonb default '{}',status text default 'new',created_at timestamptz default now());
 create function private.has_permission(required text) returns boolean language sql stable security definer set search_path='' as $$ select coalesce((select is_active and (is_owner or required=any(permissions)) from public.profiles where id=auth.uid()),false) $$;
 alter table form_submissions enable row level security;grant select on form_submissions to authenticated;grant all on profiles,form_submissions to service_role;
 create policy forms_read on form_submissions for select to authenticated using(private.has_permission('forms_'||kind));
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant select,insert,delete on storage.objects to authenticated;grant select on storage.objects to anon;grant all on storage.objects to service_role;`);
  for (const name of (await readdir(new URL('../supabase/migrations/', import.meta.url)))
    .filter((name) => name.startsWith('20260913'))
    .sort())
    await db.exec(
      await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'),
    );
  await db.exec(
    `insert into profiles(id,display_name,is_owner,permissions)values('${owner}','Owner',true,'{}'),('${teacher}','Teacher',false,'{}'),('${parent}','Parent',false,'{}'),('${other}','Other',false,'{}'),('${office}','Office',false,'{forms_contact}'),('${student}','Student',false,'{}');insert into learning_courses(id,title,department)values('${course}','Course','madrassah');insert into learning_staff values('${course}','${teacher}','teacher');insert into learning_students(id,display_name,user_id,guardian_id)values('${pupil}','Pupil','${student}','${parent}');insert into learning_enrolments values('${course}','${pupil}',true);insert into form_submissions(id,kind)values('${form}','contact');`,
  );
  const as = async (user, fn, role = 'authenticated') => {
    await db.exec(
      `set role ${role};select set_config('request.jwt.claim.sub','${user ?? ''}',false);`,
    );
    try {
      return await fn();
    } finally {
      await db.exec('reset role');
    }
  };
  const rpc = async (name, params = []) =>
    (await db.query(`select ${name}(${params.map((_, i) => `$${i + 1}`).join(',')})result`, params))
      .rows[0].result;
  const create = (amount = 2000, attempt = id(20)) =>
    as(teacher, () =>
      rpc('create_fee_request', ['Course fee', amount, 'GBP', null, pupil, course, null, attempt]),
    );
  let fee, receipt;
  await t.test(
    'teachers can charge only enrolled pupils; parents cannot create or confirm fees',
    async () => {
      await as(parent, () =>
        assert.rejects(
          () => rpc('create_fee_request', ['Bad', 2000, 'GBP', null, pupil, course, null, id(21)]),
          /permission/,
        ),
      );
      await as(office, () =>
        assert.rejects(
          () => rpc('create_fee_request', ['Bad', 2000, 'GBP', null, pupil, course, null, id(21)]),
          /permission/,
        ),
      );
      fee = await create();
      assert.equal(await create(), fee);
      await assert.rejects(() => create(2500), /attempt already used/);
      assert.equal(
        (await db.query("select * from user_notifications where kind='fee'")).rows.length,
        2,
      );
      await as(parent, () =>
        assert.rejects(
          () => rpc('confirm_fee_payment', [fee, 2000, 'Fake', '', id(30)]),
          /permission/,
        ),
      );
    },
  );
  await t.test(
    'linked parent/student can read own balance but unrelated account and anon cannot',
    async () => {
      await as(parent, async () => {
        const data = await rpc('list_fee_requests');
        assert.equal(data.total, 1);
        assert.equal(data.rows[0].outstanding_minor, 2000);
        assert.deepEqual(data.outstanding_by_currency, { GBP: 2000 });
        assert.equal((await db.query('select * from fee_audit')).rows.length, 0);
      });
      await as(student, async () => assert.equal((await rpc('list_fee_requests')).total, 1));
      await as(other, async () => assert.equal((await rpc('list_fee_requests')).total, 0));
      await as(
        null,
        () => assert.rejects(() => rpc('list_fee_requests'), /permission denied/),
        'anon',
      );
    },
  );
  await t.test(
    'manual receipt is immutable, idempotent, partial and cannot exceed outstanding',
    async () => {
      receipt = await as(teacher, () =>
        rpc('confirm_fee_payment', [fee, 500, 'Bank check 12', 'Checked statement', id(31)]),
      );
      assert.equal(
        await as(teacher, () =>
          rpc('confirm_fee_payment', [fee, 500, 'Bank check 12', 'Checked statement', id(31)]),
        ),
        receipt,
      );
      await as(teacher, () =>
        assert.rejects(
          () => rpc('confirm_fee_payment', [fee, 600, 'Bank check 12', '', id(31)]),
          /already used/,
        ),
      );
      await as(teacher, () =>
        assert.rejects(
          () => rpc('confirm_fee_payment', [fee, 1501, 'Too much', '', id(32)]),
          /exceeds/,
        ),
      );
      await as(teacher, async () => {
        const rows = (await rpc('list_fee_requests')).rows;
        assert.equal(rows[0].paid_minor, 500);
        assert.equal(rows[0].status, 'partial');
        await assert.rejects(
          () => db.query('update fee_receipts set amount_minor=2000'),
          /permission denied/,
        );
        await assert.rejects(() => db.query('delete from fee_receipts'), /permission denied/);
      });
    },
  );
  await t.test(
    'reversal appends one audited negative receipt and void needs zero paid',
    async () => {
      await as(teacher, () =>
        assert.rejects(() => rpc('void_fee_request', [fee, 'Cancel']), /paid fee/),
      );
      const reversed = await as(teacher, () =>
        rpc('reverse_fee_receipt', [receipt, 'Recorded against wrong pupil']),
      );
      assert.equal(
        await as(teacher, () => rpc('reverse_fee_receipt', [receipt, 'Retry'])),
        reversed,
      );
      await as(teacher, () =>
        assert.rejects(() => rpc('reverse_fee_receipt', [reversed, 'Invalid']), /Only manual/),
      );
      await as(teacher, () => rpc('void_fee_request', [fee, 'Course cancelled']));
      await as(parent, async () => {
        const data = await rpc('list_fee_requests');
        assert.equal(data.rows[0].status, 'void');
        assert.equal(data.rows[0].outstanding_minor, 0);
        assert.equal((await db.query('select * from fee_receipts')).rows.length, 2);
      });
    },
  );
  await t.test(
    'provider confirmation is service-only, exact amount/currency, unique and cannot masquerade as manual',
    async () => {
      const providerFee = await create(3000, id(40));
      const provider = (amount = 3000, currency = 'GBP', event = 'evt_one', payment = 'pi_one') =>
        as(
          null,
          () => rpc('record_stripe_fee_payment', [providerFee, amount, currency, event, payment]),
          'service_role',
        );
      await as(teacher, () =>
        assert.rejects(
          () => rpc('record_stripe_fee_payment', [providerFee, 3000, 'GBP', 'evt_one', 'pi_one']),
          /permission denied/,
        ),
      );
      await assert.rejects(() => provider(2999), /mismatch/);
      await assert.rejects(() => provider(3000, 'USD'), /mismatch/);
      const received = await provider();
      assert.equal(await provider(), received);
      assert.equal(await provider(3000, 'GBP', 'evt_duplicate', 'pi_one'), received);
      await assert.rejects(
        () => provider(3000, 'GBP', 'evt_new', 'pi_new'),
        /already has payments/,
      );
      await as(teacher, () =>
        assert.rejects(() => rpc('reverse_fee_receipt', [received, 'Not a refund']), /Only manual/),
      );
      await as(parent, async () => {
        const detail = await rpc('list_fee_requests', [
          null,
          null,
          null,
          false,
          0,
          50,
          providerFee,
        ]);
        assert.equal(detail.total, 1);
        assert.equal(detail.rows[0].status, 'paid');
      });
    },
  );
  await t.test(
    'legacy contact form fees remain confined to contact staff and deactivation removes access',
    async () => {
      await as(office, () =>
        rpc('create_fee_request', ['Form payment', 1000, 'GBP', form, null, null, null, id(50)]),
      );
      await as(teacher, async () =>
        assert.equal((await rpc('list_fee_requests', [form])).total, 0),
      );
      await as(office, async () => assert.equal((await rpc('list_fee_requests', [form])).total, 1));
      await db.exec(`update profiles set is_active=false where id='${office}'`);
      await as(office, async () => assert.equal((await rpc('list_fee_requests', [form])).total, 0));
    },
  );
  await t.test(
    'all additive migrations compose: custom form reply, fee and optional email queue share one response',
    async () => {
      const definition = await as(owner, () =>
        rpc('save_custom_form', [
          JSON.stringify({
            slug: 'integrated-form',
            title: 'Integrated form',
            schema: { fields: [{ id: 'name', label: 'Name', type: 'text', required: true }] },
            responsible_ids: [teacher],
          }),
        ]),
      );
      await as(owner, () => rpc('publish_custom_form', [definition]));
      const response = await as(
        null,
        () =>
          rpc('submit_custom_form', [
            'integrated-form',
            1,
            JSON.stringify({ name: 'Parent' }),
            'a'.repeat(64),
            id(70),
            parent,
            '[]',
          ]),
        'service_role',
      );
      await as(teacher, () =>
        rpc('reply_custom_form', [response, 'Your place is confirmed', false]),
      );
      const charge = await as(teacher, () =>
        rpc('create_fee_request', [
          'Class materials',
          1500,
          'GBP',
          response,
          null,
          null,
          null,
          id(71),
        ]),
      );
      await as(parent, async () => {
        const rows = await db.query('select * from form_replies where submission_id=$1', [
          response,
        ]);
        assert.equal(rows.rows[0].author_kind, 'account');
        assert.equal((await rpc('list_fee_requests', [response])).rows[0].id, charge);
      });
      await as(null, () => rpc('set_form_email_ready', [true]), 'service_role');
      await as(teacher, () =>
        rpc('queue_form_email', [
          response,
          'parent@example.org',
          'Class materials',
          'Please review the fee in your account',
          id(72),
          true,
        ]),
      );
      assert.equal(
        (await db.query('select * from form_email_outbox where submission_id=$1', [response])).rows
          .length,
        1,
      );
      await as(other, async () => {
        assert.equal((await db.query('select * from form_email_outbox')).rows.length, 0);
        assert.equal((await rpc('list_fee_requests', [response])).total, 0);
      });
    },
  );
  await db.close();
});
