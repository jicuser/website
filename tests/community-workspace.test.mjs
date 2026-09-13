import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner = id(1),
  teacher = id(2),
  parent = id(3),
  other = id(4),
  student = id(5),
  formStaff = id(6),
  fakeOwner = id(7);
const course = id(11),
  otherCourse = id(12),
  pupil = id(21),
  otherPupil = id(22),
  session = id(31),
  record = id(41),
  draft = id(42),
  form = id(51);

test('workspace RLS, transactional register, moderation, delegation and private push', async (t) => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema private;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth,private to authenticated,anon,service_role;
 create table public.profiles(id uuid primary key,display_name text,is_active boolean default true,is_owner boolean default false,permissions text[] default '{}',staff_kinds text[] default '{}');
 create table public.form_submissions(id uuid primary key default gen_random_uuid(),kind text not null,payload jsonb default '{}',status text default 'new',created_at timestamptz default now());
 create function private.has_permission(required text) returns boolean language sql stable security definer set search_path='' as $$ select coalesce((select is_active and (is_owner or required=any(permissions)) from public.profiles where id=auth.uid()),false) $$;
 alter table public.form_submissions enable row level security;
 grant select on public.form_submissions to authenticated;
 grant all on public.profiles,public.form_submissions to service_role;
 create policy form_read on public.form_submissions for select to authenticated using(private.has_permission('forms_'||kind));`);
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/20260913100552_community_workspace.sql', import.meta.url),
      'utf8',
    ),
  );
  await db.exec(`insert into profiles(id,display_name,is_owner,permissions,staff_kinds) values
 ('${owner}','Owner',true,'{}','{}'),('${teacher}','Teacher',false,'{}','{teacher}'),('${parent}','Parent',false,'{}','{}'),('${other}','Other',false,'{}','{}'),('${student}','Student',false,'{}','{}'),('${formStaff}','Office',false,'{forms_contact}','{}'),('${fakeOwner}','Fake role label',false,'{}','{super_admin}');
 insert into learning_courses(id,title,department) values('${course}','Adults','adult'),('${otherCourse}','Madrasah','madrassah');
 insert into learning_staff values('${course}','${teacher}','teacher');
 insert into learning_students(id,display_name,user_id,guardian_id) values('${pupil}','Pupil','${student}','${parent}'),('${otherPupil}','Other pupil','${other}',null);
 insert into learning_enrolments values('${course}','${pupil}',true),('${otherCourse}','${otherPupil}',true);
 insert into learning_sessions(id,course_id,starts_at,title) values('${session}','${course}',now(),'Class');
 insert into form_submissions(id,kind) values('${form}','contact');`);
  const as = async (user, fn, role = 'authenticated') => {
    await db.exec(
      `set role ${role}; select set_config('request.jwt.claim.sub','${user ?? ''}',false);`,
    );
    try {
      return await fn();
    } finally {
      await db.exec('reset role;');
    }
  };
  const count = async (table) =>
    Number((await db.query(`select count(*) as n from ${table}`)).rows[0].n);
  let task, notification, contribution;
  await t.test('anonymous sees no private tables or RPCs', async () => {
    await as(
      null,
      async () => {
        await assert.rejects(
          () => db.query('select * from learning_students'),
          /permission denied/,
        );
        await assert.rejects(
          () => db.query(`select create_work_task('x','${owner}')`),
          /permission denied/,
        );
      },
      'anon',
    );
  });
  await t.test('assigned teacher sees one class and pupil; label alone has no access', async () => {
    await as(teacher, async () => {
      assert.equal(await count('learning_courses'), 1);
      assert.equal(await count('learning_students'), 1);
    });
    await as(fakeOwner, async () => {
      assert.equal(await count('learning_courses'), 0);
      assert.equal(await count('learning_students'), 0);
    });
  });
  await t.test('parent sees own published records, never draft or unrelated pupil', async () => {
    await as(teacher, () =>
      db.exec(
        `insert into learning_records(id,course_id,student_id,kind,title,published,created_by) values('${record}','${course}','${pupil}','progress','Published',true,'${owner}'),('${draft}','${course}','${pupil}','plan','Draft',false,'${owner}');`,
      ),
    );
    assert.equal(
      (await db.query(`select created_by from learning_records where id='${record}'`)).rows[0]
        .created_by,
      teacher,
    );
    await as(parent, async () => {
      assert.equal(await count('learning_records'), 1);
      assert.equal(await count('learning_students'), 1);
    });
    await as(other, async () => assert.equal(await count('learning_records'), 0));
  });
  await t.test('register writes are atomic and forbid students outside the class', async () => {
    await as(teacher, async () => {
      await assert.rejects(
        () =>
          db.query('select mark_class_register($1,$2::jsonb)', [
            session,
            JSON.stringify([
              { student_id: pupil, status: 'present' },
              { student_id: otherPupil, status: 'present' },
            ]),
          ]),
        /not enrolled/,
      );
      assert.equal(await count('learning_attendance'), 0);
      await db.query('select mark_class_register($1,$2::jsonb)', [
        session,
        JSON.stringify([{ student_id: pupil, status: 'late', note: 'Arrived later' }]),
      ]);
      assert.equal(await count('learning_attendance'), 1);
      await assert.rejects(
        () =>
          db.query(`update learning_sessions set course_id='${otherCourse}' where id='${session}'`),
        /permission denied/,
      );
    });
    await as(parent, () =>
      assert.rejects(
        () => db.query('select mark_class_register($1,$2::jsonb)', [session, '[]']),
        /permission/,
      ),
    );
  });
  await t.test('student poetry is private until an assigned teacher approves it', async () => {
    contribution = await as(student, async () => {
      const r = await db.query('select submit_student_contribution($1,$2,$3,$4) as id', [
        pupil,
        course,
        'My poem',
        'Student supplied poem',
      ]);
      assert.equal(
        (
          await db.query(
            `update student_contributions set published=true where id='${r.rows[0].id}' returning id`,
          )
        ).rows.length,
        0,
      );
      return r.rows[0].id;
    });
    await as(other, async () => assert.equal(await count('student_contributions'), 0));
    await as(teacher, async () =>
      assert.equal(
        (
          await db.query(
            `update student_contributions set published=true where id='${contribution}' returning id`,
          )
        ).rows.length,
        1,
      ),
    );
  });
  await t.test('meeting request cannot target another student', async () => {
    await as(parent, async () => {
      await assert.rejects(
        () =>
          db.query('select request_learning_meeting($1,$2,$3)', [otherPupil, otherCourse, 'Hello']),
        /access required/,
      );
      await db.query('select request_learning_meeting($1,$2,$3)', [
        pupil,
        course,
        'Please discuss progress',
      ]);
      assert.equal(await count('learning_meetings'), 1);
      assert.equal(
        (await db.query("update learning_meetings set status='confirmed' returning id")).rows
          .length,
        0,
      );
    });
  });
  await t.test(
    'form assignment checks both users and notification reads do not complete tasks',
    async () => {
      await as(formStaff, async () => {
        await assert.rejects(
          () => db.query('select create_work_task($1,$2,$3)', ['Contact', other, form]),
          /Form access/,
        );
        task = (
          await db.query('select create_work_task($1,$2,$3) as id', ['Contact', formStaff, form])
        ).rows[0].id;
        notification = (
          await db.query(`select id from user_notifications where entity_id='${task}'`)
        ).rows[0].id;
        await db.query(`update user_notifications set read_at=now() where id='${notification}'`);
        assert.equal(
          (await db.query(`select status from work_tasks where id='${task}'`)).rows[0].status,
          'open',
        );
        await assert.rejects(
          () => db.query(`update work_tasks set assigned_to='${other}' where id='${task}'`),
          /permission denied/,
        );
        await assert.rejects(
          () => db.query('select create_work_task($1,$2)', ['Delegate', other]),
          /Owner permission/,
        );
      });
    },
  );
  await t.test(
    'push device tokens cannot be read or rebound; disablement immediately removes access',
    async () => {
      const token = 'opaque-device-token-1234567890';
      await as(formStaff, async () => {
        await db.query('select register_push_device($1,$2)', [token, 'android']);
        await assert.rejects(() => db.query('select * from push_devices'), /permission denied/);
      });
      await as(other, () =>
        assert.rejects(
          () => db.query('select register_push_device($1,$2)', [token, 'ios']),
          /another account/,
        ),
      );
      await db.exec(`update profiles set is_active=false where id='${formStaff}';`);
      await as(formStaff, async () => {
        assert.equal(await count('work_tasks'), 0);
        assert.equal(await count('user_notifications'), 0);
        await assert.rejects(
          () =>
            db.query('select register_push_device($1,$2)', ['another-opaque-token-123456', 'ios']),
          /Active/,
        );
        await db.query('select unregister_push_device($1)', [token]);
      });
      await db.exec(`update profiles set is_active=true where id='${formStaff}';`);
    },
  );
  await t.test(
    'owner form routing creates task, notification and outbox in one transaction',
    async () => {
      await as(owner, () =>
        db.query(
          'insert into form_workflows(kind,assigned_to,title,configured_by) values($1,$2,$3,$4)',
          ['contact', formStaff, 'Call back', other],
        ),
      );
      assert.equal(
        (await db.query('select configured_by from form_workflows')).rows[0].configured_by,
        owner,
      );
      const before = await count('push_outbox');
      await db.exec("insert into form_submissions(kind) values('contact');");
      assert.equal(await count('push_outbox'), before + 1);
      await as(other, async () => {
        assert.equal(
          (await db.query('update form_workflows set enabled=false returning kind')).rows.length,
          0,
        );
      });
    },
  );
  await t.test('outbox leases are exclusive; revoked recipient is not eligible', async () => {
    await as(
      null,
      async () => {
        const jobs = (await db.query('select * from claim_push_jobs()')).rows;
        assert.ok(jobs.length > 0);
        assert.equal((await db.query('select * from claim_push_jobs()')).rows.length, 0);
        const first = jobs[0];
        await db.query('select finish_push_job($1,$2,true)', [first.id, id(999)]);
        assert.equal(
          (await db.query('select delivered_at from push_outbox where id=$1', [first.id])).rows[0]
            .delivered_at,
          null,
        );
        await db.query('select finish_push_job($1,$2,true)', [first.id, first.lease_id]);
        assert.ok(
          (await db.query('select delivered_at from push_outbox where id=$1', [first.id])).rows[0]
            .delivered_at,
        );
      },
      'service_role',
    );
    await db.exec(`update profiles set permissions='{}' where id='${formStaff}';`);
    await as(
      null,
      async () => {
        assert.equal(
          (await db.query('select push_recipient_allowed($1) as allowed', [notification])).rows[0]
            .allowed,
          false,
        );
      },
      'service_role',
    );
  });
  await db.close();
});
