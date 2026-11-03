import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formsDatabase, id } from './helpers/formsDatabase.mjs';
const migration = (name) =>
  readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');

test('additive learning upgrade composes with deployed unified forms and keeps private data scoped', async (t) => {
  const { db, as, rpc } = await formsDatabase();
  t.after(() => db.close());
  await db.exec(
    `create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); alter table profiles add column updated_at timestamptz default now();`,
  );
  const staffSql = await migration('20260912021743_explicit_staff_permissions.sql');
  await db.exec(
    staffSql.slice(
      staffSql.indexOf('create function public.manage_staff_access'),
      staffSql.indexOf('drop function if exists public.has_role'),
    ),
  );
  await db.exec(await migration('20261017225316_community_operations.sql'));
  await db.exec(await migration('20261023193349_unified_form_workflow.sql'));
  await db.exec(`create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security; grant select,insert,delete on storage.objects to authenticated;
    insert into profiles(id,display_name,permissions,staff_kinds) values
    ('${id(7)}','Teacher','{}','{teacher}'),('${id(8)}','Parent','{}','{}'),('${id(9)}','Student','{}','{}'),
    ('${id(10)}','Finance','{finance}','{}'),('${id(11)}','Unassigned teacher','{}','{teacher}');`);
  const before = (
    await db.query(`select p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('read_task','staff_custom_form','can_receive_notification','submit_custom_form') order by 1`)
  ).rows;
  await db.exec(await migration('20261103090000_learning_foundation.sql'));
  await db.exec(await migration('20261103091000_learning_admissions.sql'));
  assert.deepEqual(
    (
      await db.query(`select p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('read_task','staff_custom_form','can_receive_notification','submit_custom_form') order by 1`)
    ).rows,
    before,
  );
  await t.test('release starts off and labels cannot activate it', async () => {
    assert.equal(await as(id(1), () => rpc('get_learning_access')), false);
    await as(id(1), () =>
      assert.rejects(
        () => db.exec(`insert into learning_courses(title,department) values('Hidden','adult')`),
        /row-level/,
      ),
    );
    await as(id(11), () =>
      assert.rejects(
        () => db.exec(`update private.learning_release set enabled=true`),
        /permission denied/,
      ),
    );
  });
  await db.exec('update private.learning_release set enabled=true');
  await as(id(1), () =>
    db.exec(`insert into learning_courses(id,title,department,capacity) values
    ('${id(20)}','Adult class','adult',1),('${id(21)}','Madrasah class','madrassah',20);
    insert into learning_students(id,display_name,user_id,guardian_id) values
    ('${id(30)}','Pupil one','${id(9)}','${id(8)}'),('${id(31)}','Pupil two',null,null);
    insert into learning_staff values('${id(20)}','${id(7)}','teacher');`),
  );
  const count = async (table) =>
    Number((await db.query(`select count(*) n from ${table}`)).rows[0].n);
  let admission, fee;
  await t.test(
    'review creates one pending place and one exact fee, not active enrolment',
    async () => {
      admission = await as(id(1), () =>
        rpc('review_learning_admission', [
          id(20),
          id(30),
          null,
          2000,
          'Walk-in registration checked',
          id(100),
        ]),
      );
      assert.equal(
        await as(id(1), () =>
          rpc('review_learning_admission', [
            id(20),
            id(30),
            null,
            2000,
            'Walk-in registration checked',
            id(100),
          ]),
        ),
        admission,
      );
      await as(id(1), () =>
        assert.rejects(
          () =>
            rpc('review_learning_admission', [
              id(20),
              id(30),
              null,
              2500,
              'Changed request',
              id(100),
            ]),
          /attempt|already/,
        ),
      );
      assert.equal(await count('learning_admissions'), 1);
      assert.equal(await count('fee_requests'), 1);
      assert.equal(
        (await db.query('select active from learning_enrolments')).rows[0].active,
        false,
      );
      fee = (await db.query('select fee_id from learning_admissions')).rows[0].fee_id;
      await as(id(1), () =>
        assert.rejects(
          () => rpc('set_learning_enrolment', [admission, true, 'Approve place']),
          /payment/,
        ),
      );
      await as(id(1), () =>
        assert.rejects(
          () => db.exec('update learning_enrolments set active=true'),
          /permission denied/,
        ),
      );
    },
  );
  await t.test('teacher and parent cannot confirm money; parent sees only their fee', async () => {
    for (const person of [7, 8, 9, 11])
      await as(id(person), () =>
        assert.rejects(
          () => rpc('confirm_fee_payment', [fee, 2000, 'Unverified', '', id(101)]),
          /permission/,
        ),
      );
    const own = await as(id(8), () => rpc('list_fee_requests'));
    assert.equal(own.total, 1);
    assert.equal(own.rows[0].outstanding_minor, 2000);
    assert.equal((await as(id(11), () => rpc('list_fee_requests'))).total, 0);
    await as(id(8), async () => {
      assert.equal(await count('fee_audit'), 0);
      assert.equal(await count('learning_admissions'), 0);
    });
  });
  await t.test(
    'partial payments block activation; full staff-confirmed receipts unlock an idempotent place',
    async () => {
      const receipt = await as(id(10), () =>
        rpc('confirm_fee_payment', [fee, 500, 'Bank reference one', 'Statement checked', id(102)]),
      );
      assert.equal(
        await as(id(10), () =>
          rpc('confirm_fee_payment', [
            fee,
            500,
            'Bank reference one',
            'Statement checked',
            id(102),
          ]),
        ),
        receipt,
      );
      await as(id(1), () =>
        assert.rejects(
          () => rpc('set_learning_enrolment', [admission, true, 'Approve place']),
          /payment/,
        ),
      );
      await as(id(10), () =>
        rpc('confirm_fee_payment', [fee, 1500, 'Bank reference two', 'Statement checked', id(103)]),
      );
      assert.equal(
        await as(id(1), () =>
          rpc('set_learning_enrolment', [admission, true, 'Approved after payment']),
        ),
        true,
      );
      assert.equal(
        await as(id(1), () => rpc('set_learning_enrolment', [admission, true, 'Retry'])),
        true,
      );
      assert.equal(
        (await db.query('select count(*) n from learning_enrolments where active')).rows[0].n,
        1,
      );
      await as(id(8), () =>
        assert.rejects(
          () => rpc('set_learning_enrolment', [admission, true, 'Self approval']),
          /owner/,
        ),
      );
    },
  );
  await t.test('assigned teacher, linked family and unrelated teacher stay isolated', async () => {
    await as(id(7), async () => {
      assert.equal(await count('learning_courses'), 1);
      assert.equal(await count('learning_students'), 1);
    });
    await as(id(8), async () => {
      assert.equal(await count('learning_students'), 1);
      assert.equal(await count('learning_courses'), 1);
    });
    await as(id(11), async () => {
      assert.equal(await count('learning_students'), 0);
      assert.equal(await count('learning_courses'), 0);
    });
    await as(
      null,
      () => assert.rejects(() => db.query('select * from learning_students'), /permission denied/),
      'anon',
    );
    await as(id(7), () =>
      assert.rejects(
        () => db.exec(`insert into learning_staff values('${id(21)}','${id(7)}','head_teacher')`),
        /row-level/,
      ),
    );
  });
  await t.test('register batches are atomic and progress drafts stay private', async () => {
    await as(id(7), () =>
      db.exec(`insert into learning_sessions(id,course_id,starts_at,title) values('${id(40)}','${id(20)}','2026-11-10T18:00:00Z','Tuesday');
      insert into learning_records(id,course_id,student_id,kind,title) values('${id(41)}','${id(20)}','${id(30)}','progress','Reading review');`),
    );
    await as(id(7), () =>
      assert.rejects(
        () =>
          rpc('mark_class_register', [
            id(40),
            [
              { student_id: id(30), status: 'present' },
              { student_id: id(31), status: 'present' },
            ],
          ]),
        /not enrolled/,
      ),
    );
    assert.equal(await count('learning_attendance'), 0);
    await as(id(7), () =>
      rpc('mark_class_register', [id(40), [{ student_id: id(30), status: 'present', note: '' }]]),
    );
    await as(id(8), async () => {
      assert.equal(await count('learning_attendance'), 1);
      assert.equal(await count('learning_records'), 0);
    });
    await as(id(7), () =>
      db.exec(`update learning_records set published=true where id='${id(41)}'`),
    );
    await as(id(8), async () => assert.equal(await count('learning_records'), 1));
  });
  await t.test(
    'capacity, withdrawal and disablement preserve history but revoke access',
    async () => {
      const second = await as(id(1), () =>
        rpc('review_learning_admission', [
          id(20),
          id(31),
          null,
          0,
          'No fee for this reviewed place',
          id(104),
        ]),
      );
      await as(id(1), () =>
        assert.rejects(() => rpc('set_learning_enrolment', [second, true, 'Approve']), /capacity/),
      );
      await as(id(1), () => rpc('set_learning_enrolment', [admission, false, 'Family withdrew']));
      await as(id(8), async () => {
        assert.equal(await count('learning_records'), 0);
        assert.equal(await count('learning_attendance'), 0);
      });
      assert.equal(await count('learning_records'), 1);
      assert.equal(await count('fee_receipts'), 2);
      await as(id(1), () => rpc('set_learning_enrolment', [second, true, 'Approve free place']));
      await db.exec(`update profiles set is_active=false where id='${id(7)}'`);
      await as(id(7), async () => {
        assert.equal(await count('learning_students'), 0);
        assert.equal(await count('learning_courses'), 0);
      });
      await as(id(1), () =>
        assert.rejects(() => db.exec('delete from learning_students'), /permission denied/),
      );
    },
  );
  await t.test(
    'response-to-class link must match an explicitly selected registration form',
    async () => {
      const form = (await db.query("select id from custom_forms where built_in_kind='madrassah'"))
        .rows[0].id;
      const submission = await as(
        null,
        () =>
          rpc('submit_custom_form', [
            'madrassah-enquiry',
            1,
            { name: 'Parent applicant', email: 'parent@example.org', query: 'Child applying' },
            'a'.repeat(64),
            id(106),
            null,
            [],
          ]),
        'service_role',
      );
      await as(id(1), () =>
        assert.rejects(
          () =>
            rpc('review_learning_admission', [
              id(21),
              id(30),
              submission,
              0,
              'Registration reviewed',
              id(105),
            ]),
          /linked registration/,
        ),
      );
      await as(id(1), () =>
        db.query('insert into learning_course_forms(course_id,form_id) values($1,$2)', [
          id(21),
          form,
        ]),
      );
      const linked = await as(id(1), () =>
        rpc('review_learning_admission', [
          id(21),
          id(30),
          submission,
          0,
          'Registration reviewed',
          id(105),
        ]),
      );
      assert.ok(linked);
      assert.equal(
        (await db.query('select count(*) n from form_submissions where id=$1', [submission]))
          .rows[0].n,
        1,
      );
    },
  );
  await t.test(
    'provider confirmations are service-only, exact and idempotent on the production chain',
    async () => {
      await as(id(1), () =>
        db.exec(
          `insert into learning_students(id,display_name) values('${id(32)}','Provider test pupil');`,
        ),
      );
      const app = await as(id(1), () =>
        rpc('review_learning_admission', [
          id(21),
          id(32),
          null,
          3000,
          'Registration checked',
          id(107),
        ]),
      );
      const providerFee = (
        await db.query('select fee_id from learning_admissions where id=$1', [app])
      ).rows[0].fee_id;
      for (const who of [1, 8, 10])
        await as(id(who), () =>
          assert.rejects(
            () =>
              rpc('record_stripe_fee_payment', [providerFee, 3000, 'GBP', 'evt_testA', 'pi_testA']),
            /permission denied/,
          ),
        );
      await as(
        null,
        () =>
          assert.rejects(
            () =>
              rpc('record_stripe_fee_payment', [providerFee, 3000, 'USD', 'evt_testA', 'pi_testA']),
            /mismatch/,
          ),
        'service_role',
      );
      const receipt = await as(
        null,
        () => rpc('record_stripe_fee_payment', [providerFee, 3000, 'GBP', 'evt_testA', 'pi_testA']),
        'service_role',
      );
      assert.equal(
        await as(
          null,
          () =>
            rpc('record_stripe_fee_payment', [providerFee, 3000, 'GBP', 'evt_testA', 'pi_testA']),
          'service_role',
        ),
        receipt,
      );
      assert.equal(
        (await db.query('select active from learning_enrolments where student_id=$1', [id(32)]))
          .rows[0].active,
        false,
      );
      assert.equal(
        await as(id(1), () =>
          rpc('set_learning_enrolment', [app, true, 'Provider receipt verified']),
        ),
        true,
      );
    },
  );
  await t.test(
    'admissions list has server-calculated fees and an owner-only bounded page',
    async () => {
      const result = await as(id(1), () => rpc('list_learning_admissions', [0, 20]));
      assert.equal(result.total, 4);
      const paid = result.rows.find((row) => row.id === admission);
      assert.equal(paid.fee.status, 'paid');
      assert.equal(paid.fee.outstanding_minor, 0);
      for (const who of [8, 10, 11])
        await as(id(who), () =>
          assert.rejects(() => rpc('list_learning_admissions', [0, 20]), /owner/),
        );
      await as(id(1), () =>
        assert.rejects(() => rpc('list_learning_admissions', [0, 1001]), /bounds/),
      );
    },
  );
});
