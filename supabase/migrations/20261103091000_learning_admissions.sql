-- Fee tracking is an additive ledger; these RPCs do not charge or refund money.
begin;
create table public.fee_requests (
 id uuid primary key default gen_random_uuid(), form_id uuid references public.form_submissions,
 student_id uuid, course_id uuid, title text not null check(length(trim(title)) between 1 and 160),
 amount_minor integer not null check(amount_minor between 1 and 100000000), currency text not null default 'GBP' check(currency ~ '^[A-Z]{3}$'),
 due_at timestamptz, created_by uuid not null references public.profiles, idempotency_key uuid not null, unique(created_by,idempotency_key), created_at timestamptz not null default now(),
 voided_at timestamptz, void_reason text not null default '' check(length(void_reason)<=2000),
 foreign key(course_id,student_id) references public.learning_enrolments(course_id,student_id),
 check((form_id is not null and student_id is null and course_id is null) or (form_id is null and student_id is not null and course_id is not null)));
create index fee_requests_form on public.fee_requests(form_id,created_at desc);
create index fee_requests_student on public.fee_requests(student_id,course_id,created_at desc);
create table public.fee_receipts (
 id uuid primary key default gen_random_uuid(), fee_id uuid not null references public.fee_requests,
 amount_minor integer not null check(amount_minor between -100000000 and 100000000 and amount_minor<>0),
 method text not null check(method in('manual','stripe','reversal')), reference text not null check(length(trim(reference)) between 1 and 160),
 note text not null default '' check(length(note)<=2000), recorded_by uuid references public.profiles, created_at timestamptz not null default now(),
 reversal_of uuid unique references public.fee_receipts,
 idempotency_key uuid, provider_event text unique, provider_payment text unique,
 unique(fee_id,idempotency_key),
 check((method='reversal' and reversal_of is not null and amount_minor<0 and recorded_by is not null) or (method='manual' and reversal_of is null and amount_minor>0 and recorded_by is not null) or (method='stripe' and reversal_of is null and amount_minor>0 and recorded_by is null and provider_event is not null and provider_payment is not null)));
create index fee_receipts_fee on public.fee_receipts(fee_id,created_at);
create table public.fee_audit (
 id uuid primary key default gen_random_uuid(), fee_id uuid not null references public.fee_requests,
 actor_id uuid references public.profiles, action text not null check(action in('created','manual_payment','stripe_payment','reversal','voided')),
 details jsonb not null default '{}', created_at timestamptz not null default now());
create index fee_audit_fee on public.fee_audit(fee_id,created_at);

create function private.fee_source_staff(form uuid,student uuid,course uuid,account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.learning_live() and private.account_permission(account,'finance') and case when form is not null then exists(select 1 from public.form_submissions f where f.id=form and private.read_custom_submission(f.id,account))
 else exists(select 1 from public.learning_enrolments e where e.course_id=course and e.student_id=student) end; $$;
create function private.manage_fee(fee uuid,account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.fee_requests f where f.id=fee and private.fee_source_staff(f.form_id,f.student_id,f.course_id,account)); $$;
create function private.read_fee(fee uuid,account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.learning_live() and private.active_account(account) and exists(select 1 from public.fee_requests f where f.id=fee and
 (private.fee_source_staff(f.form_id,f.student_id,f.course_id,account) or (f.form_id is not null and private.read_custom_submission(f.form_id,account))
 or (f.student_id is not null and private.own_student(f.student_id,account)))); $$;

do $$ declare t text; begin foreach t in array array['fee_requests','fee_receipts','fee_audit'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);execute format('grant all on public.%I to service_role',t);
 end loop;end $$;
create policy fee_read on public.fee_requests for select to authenticated using(private.read_fee(id));
create policy receipt_read on public.fee_receipts for select to authenticated using(private.read_fee(fee_id));
create policy fee_audit_read on public.fee_audit for select to authenticated using(private.manage_fee(fee_id));

create function private.create_fee_request(p_title text,p_amount_minor integer,p_currency text,p_form_id uuid,p_student_id uuid,p_course_id uuid,p_due_at timestamptz,p_idempotency_key uuid) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid; existing public.fee_requests;
 begin
 perform 1 from public.profiles where id=auth.uid() for no key update;
 if not private.fee_source_staff(p_form_id,p_student_id,p_course_id) then raise exception 'Fee source staff permission required'; end if;
 if p_idempotency_key is null then raise exception 'Fee request attempt required'; end if;
 select * into existing from public.fee_requests where created_by=auth.uid() and idempotency_key=p_idempotency_key;
 if found then if existing.form_id is distinct from p_form_id or existing.student_id is distinct from p_student_id or existing.course_id is distinct from p_course_id or existing.title is distinct from trim(p_title) or existing.amount_minor is distinct from p_amount_minor or existing.currency is distinct from p_currency or existing.due_at is distinct from p_due_at then raise exception 'Fee request attempt already used'; end if;return existing.id;end if;
 if (select count(*) from public.fee_requests where created_by=auth.uid() and created_at>now()-interval '1 hour')>=100 then raise exception 'Fee request creation limit reached'; end if;
 insert into public.fee_requests(form_id,student_id,course_id,title,amount_minor,currency,due_at,created_by,idempotency_key) values(p_form_id,p_student_id,p_course_id,trim(p_title),p_amount_minor,p_currency,p_due_at,auth.uid(),p_idempotency_key) returning id into result;
 insert into public.fee_audit(fee_id,actor_id,action,details) values(result,auth.uid(),'created',jsonb_build_object('amount_minor',p_amount_minor,'currency',p_currency));
 return result;end; $$;
create function public.create_fee_request(p_title text,p_amount_minor integer,p_currency text default 'GBP',p_form_id uuid default null,p_student_id uuid default null,p_course_id uuid default null,p_due_at timestamptz default null,p_idempotency_key uuid default null) returns uuid language sql security invoker set search_path='' as $$ select private.create_fee_request(p_title,p_amount_minor,p_currency,p_form_id,p_student_id,p_course_id,p_due_at,p_idempotency_key); $$;
create function public.list_fee_requests(p_form_id uuid default null,p_student_id uuid default null,p_course_id uuid default null,p_outstanding_only boolean default false,p_offset integer default 0,p_limit integer default 50,p_fee_id uuid default null) returns jsonb language plpgsql stable security invoker set search_path='' as $$
 declare result jsonb;
 begin
 if p_offset is null or p_limit is null or p_offset not between 0 and 25000 or p_limit not between 1 and 100 then raise exception 'Invalid fee search bounds'; end if;
 with paid as(select fee_id,sum(amount_minor)::bigint paid_minor from public.fee_receipts group by fee_id),
 matching as materialized(select f.*,coalesce(p.paid_minor,0) paid_minor,case when f.voided_at is not null then 0 else greatest(0,f.amount_minor-coalesce(p.paid_minor,0)) end outstanding_minor,
 case when f.voided_at is not null then 'void' when coalesce(p.paid_minor,0)>=f.amount_minor then 'paid' when coalesce(p.paid_minor,0)>0 then 'partial' else 'unpaid' end status
 from public.fee_requests f left join paid p on p.fee_id=f.id where (p_fee_id is null or f.id=p_fee_id) and (p_form_id is null or f.form_id=p_form_id) and (p_student_id is null or f.student_id=p_student_id) and (p_course_id is null or f.course_id=p_course_id)),
 selected as(select * from matching where not p_outstanding_only or outstanding_minor>0),
 page as(select * from selected order by created_at desc,id limit p_limit offset p_offset)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from selected),'outstanding_minor',coalesce((select sum(outstanding_minor) from matching),0),'outstanding_by_currency',coalesce((select jsonb_object_agg(currency,amount) from (select currency,sum(outstanding_minor) amount from matching group by currency) totals),'{}'::jsonb)) into result;
 return result;end; $$;

create function private.confirm_fee_payment(p_fee_id uuid,p_amount_minor integer,p_reference text,p_note text,p_idempotency_key uuid) returns uuid language plpgsql security definer set search_path='' as $$
 declare fee public.fee_requests; existing public.fee_receipts; result uuid; paid bigint;
 begin
 select * into fee from public.fee_requests where id=p_fee_id for update;
 if fee.id is null or not private.manage_fee(fee.id) then raise exception 'Fee staff permission required'; end if;
 if p_idempotency_key is null then raise exception 'Payment attempt required'; end if;
 select * into existing from public.fee_receipts where fee_id=fee.id and idempotency_key=p_idempotency_key;
 if found then if existing.amount_minor is distinct from p_amount_minor or existing.reference is distinct from trim(p_reference) or existing.recorded_by is distinct from auth.uid() or existing.note is distinct from coalesce(p_note,'') then raise exception 'Payment attempt already used'; end if;return existing.id;end if;
 select coalesce(sum(amount_minor),0) into paid from public.fee_receipts where fee_id=fee.id;
 if fee.voided_at is not null or p_amount_minor is null or p_amount_minor<=0 or paid+p_amount_minor>fee.amount_minor then raise exception 'Payment exceeds outstanding amount or fee is void'; end if;
 insert into public.fee_receipts(fee_id,amount_minor,method,reference,note,recorded_by,idempotency_key) values(fee.id,p_amount_minor,'manual',trim(p_reference),coalesce(p_note,''),auth.uid(),p_idempotency_key) returning id into result;
 insert into public.fee_audit(fee_id,actor_id,action,details) values(fee.id,auth.uid(),'manual_payment',jsonb_build_object('receipt_id',result,'amount_minor',p_amount_minor,'reference',trim(p_reference)));
 return result;end; $$;
create function public.confirm_fee_payment(p_fee_id uuid,p_amount_minor integer,p_reference text,p_note text default '',p_idempotency_key uuid default null) returns uuid language sql security invoker set search_path='' as $$ select private.confirm_fee_payment(p_fee_id,p_amount_minor,p_reference,p_note,p_idempotency_key); $$;
create function private.reverse_fee_receipt(p_receipt_id uuid,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
 declare receipt public.fee_receipts; result uuid;
 begin
 select * into receipt from public.fee_receipts where id=p_receipt_id;
 if receipt.id is null or not private.manage_fee(receipt.fee_id) then raise exception 'Fee staff permission required'; end if;
 perform 1 from public.fee_requests where id=receipt.fee_id for update;
 if coalesce(length(trim(p_reason)),0) not between 1 and 2000 then raise exception 'Reversal reason required'; end if;
 select id into result from public.fee_receipts where reversal_of=p_receipt_id;if found then return result;end if;
 if receipt.method<>'manual' or receipt.amount_minor<=0 then raise exception 'Only manual receipts can be reversed here'; end if;
 insert into public.fee_receipts(fee_id,amount_minor,method,reference,note,recorded_by,reversal_of) values(receipt.fee_id,-receipt.amount_minor,'reversal',receipt.reference,trim(p_reason),auth.uid(),receipt.id) returning id into result;
 insert into public.fee_audit(fee_id,actor_id,action,details) values(receipt.fee_id,auth.uid(),'reversal',jsonb_build_object('receipt_id',result,'reversal_of',receipt.id,'reason',trim(p_reason)));
 return result;end; $$;
create function public.reverse_fee_receipt(p_receipt_id uuid,p_reason text) returns uuid language sql security invoker set search_path='' as $$ select private.reverse_fee_receipt(p_receipt_id,p_reason); $$;
create function private.void_fee_request(p_fee_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
 declare fee public.fee_requests;
 begin select * into fee from public.fee_requests where id=p_fee_id for update;
 if fee.id is null or not private.manage_fee(fee.id) then raise exception 'Fee staff permission required'; end if;
 if coalesce(length(trim(p_reason)),0) not between 1 and 2000 then raise exception 'Void reason required'; end if;
 if fee.voided_at is not null then return; end if;
 if (select coalesce(sum(amount_minor),0) from public.fee_receipts where fee_id=fee.id)<>0 then raise exception 'A paid fee cannot be voided'; end if;
 update public.fee_requests set voided_at=now(),void_reason=trim(p_reason) where id=fee.id;
 insert into public.fee_audit(fee_id,actor_id,action,details) values(fee.id,auth.uid(),'voided',jsonb_build_object('reason',trim(p_reason)));end; $$;
create function public.void_fee_request(p_fee_id uuid,p_reason text) returns void language sql security invoker set search_path='' as $$ select private.void_fee_request(p_fee_id,p_reason); $$;

-- Only a signature-verified server webhook may confirm provider payments.
create function public.record_stripe_fee_payment(p_fee_id uuid,p_amount_minor integer,p_currency text,p_event_id text,p_payment_id text) returns uuid language plpgsql security definer set search_path='' as $$
 declare fee public.fee_requests; existing public.fee_receipts; result uuid; paid bigint;
 begin
 if not private.learning_live() then raise exception 'Learning fee release is disabled'; end if;
 if p_event_id is null or p_event_id !~ '^evt_[a-zA-Z0-9]{1,120}$' or p_payment_id is null or p_payment_id !~ '^pi_[a-zA-Z0-9]{1,120}$' then raise exception 'Invalid provider identifiers'; end if;
 -- Lock the provider payment before its fee to serialize duplicate deliveries across IDs.
 perform pg_advisory_xact_lock(hashtextextended(p_payment_id,0));
 select * into existing from public.fee_receipts where provider_event=p_event_id or provider_payment=p_payment_id;
 if found then if existing.fee_id is distinct from p_fee_id or existing.amount_minor is distinct from p_amount_minor or not exists(select 1 from public.fee_requests where id=existing.fee_id and currency=p_currency) then raise exception 'Provider receipt conflict';end if;return existing.id;end if;
 select * into fee from public.fee_requests where id=p_fee_id for update;
 if fee.id is null or fee.voided_at is not null or fee.amount_minor is distinct from p_amount_minor or fee.currency is distinct from p_currency then raise exception 'Provider amount or currency mismatch';end if;
 select coalesce(sum(amount_minor),0) into paid from public.fee_receipts where fee_id=fee.id;
 if paid<>0 then raise exception 'Fee already has payments; reconciliation required';end if;
 insert into public.fee_receipts(fee_id,amount_minor,method,reference,provider_event,provider_payment) values(fee.id,p_amount_minor,'stripe',p_payment_id,p_event_id,p_payment_id) returning id into result;
 insert into public.fee_audit(fee_id,action,details) values(fee.id,'stripe_payment',jsonb_build_object('receipt_id',result,'event_id',p_event_id,'payment_id',p_payment_id));return result;
 end; $$;

do $$ declare f record;begin for f in select p.oid::regprocedure signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.proname=any(array['fee_source_staff','manage_fee','read_fee','create_fee_request','list_fee_requests','confirm_fee_payment','reverse_fee_receipt','void_fee_request','record_stripe_fee_payment']) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);
 if f.proname<>'record_stripe_fee_payment' then execute format('grant execute on function %s to authenticated',f.signature);end if;
 end loop;end $$;

create table public.learning_course_forms (
 course_id uuid not null references public.learning_courses,
 form_id uuid not null references public.custom_forms,
 primary key(course_id,form_id)
);
alter table public.learning_course_forms enable row level security;
revoke all on public.learning_course_forms from public,anon,authenticated;
grant select,insert,delete on public.learning_course_forms to authenticated;
grant all on public.learning_course_forms to service_role;
create policy course_form_owner on public.learning_course_forms for all to authenticated using(private.learning_owner()) with check(private.learning_owner());

create table public.learning_admissions (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null, student_id uuid not null,
 submission_id uuid references public.form_submissions,
 fee_id uuid unique references public.fee_requests,
 amount_minor integer not null check(amount_minor between 0 and 100000000),
 review_note text not null check(length(trim(review_note)) between 3 and 2000),
 state text not null default 'approved' check(state in('approved','enrolled','withdrawn')),
 created_by uuid not null references public.profiles, created_at timestamptz not null default now(),
 attempt_id uuid not null, enrolled_at timestamptz, withdrawn_at timestamptz,
 unique(created_by,attempt_id),unique(course_id,student_id),
 foreign key(course_id,student_id) references public.learning_enrolments,
 check((amount_minor=0 and fee_id is null) or (amount_minor>0 and fee_id is not null))
);
create index learning_admission_source on public.learning_admissions(submission_id);
alter table public.learning_admissions enable row level security;
revoke all on public.learning_admissions from public,anon,authenticated;
grant select on public.learning_admissions to authenticated;
grant all on public.learning_admissions to service_role;
create policy admission_owner_read on public.learning_admissions for select to authenticated using(private.learning_owner());
create trigger admission_change_audit after insert or update on public.learning_admissions for each row execute function private.audit_learning_change();

create function public.review_learning_admission(
 p_course_id uuid,p_student_id uuid,p_submission_id uuid,p_amount_minor integer,p_note text,p_attempt_id uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare course public.learning_courses; prior public.learning_admissions; result uuid; fee uuid;
begin
 if not private.learning_owner() then raise exception 'Active learning owner required'; end if;
 if p_attempt_id is null or p_amount_minor is null or p_amount_minor not between 0 and 100000000
 or coalesce(length(trim(p_note)),0) not between 3 and 2000 then raise exception 'Review reason, fee and attempt are required'; end if;
 select * into course from public.learning_courses where id=p_course_id and not archived for update;
 if not found then raise exception 'Choose an active class'; end if;
 perform 1 from public.learning_students where id=p_student_id and not archived for share;
 if not found then raise exception 'Choose an active student'; end if;
 select * into prior from public.learning_admissions where created_by=auth.uid() and attempt_id=p_attempt_id;
 if found then
  if prior.course_id is distinct from p_course_id or prior.student_id is distinct from p_student_id
  or prior.submission_id is distinct from p_submission_id or prior.amount_minor is distinct from p_amount_minor
  or prior.review_note is distinct from trim(p_note) then raise exception 'Admission attempt already used'; end if;
  return prior.id;
 end if;
 if exists(select 1 from public.learning_admissions where course_id=p_course_id and student_id=p_student_id)
 then raise exception 'This student already has an admission for this class. Open the existing admission.'; end if;
 if p_submission_id is not null and not exists(
  select 1 from public.form_submissions f join public.learning_course_forms l on l.course_id=p_course_id
  join public.custom_forms c on c.id=l.form_id
  where f.id=p_submission_id and (f.custom_form_id=l.form_id or (f.kind<>'custom' and f.kind=c.built_in_kind))
 ) then raise exception 'Choose a response from a linked registration form'; end if;
 if exists(select 1 from public.learning_enrolments where course_id=p_course_id and student_id=p_student_id and active)
 then raise exception 'This student is already enrolled'; end if;
 if (select count(*) from public.learning_admissions where created_by=auth.uid() and created_at>now()-interval '1 hour')>=100
 then raise exception 'Admission creation limit reached; try later'; end if;
 insert into public.learning_enrolments(course_id,student_id,active) values(p_course_id,p_student_id,false)
 on conflict(course_id,student_id) do nothing;
 if p_amount_minor>0 then
  fee=private.create_fee_request(left(course.title,144)||' admission fee',p_amount_minor,'GBP',null,p_student_id,p_course_id,null,p_attempt_id);
 end if;
 insert into public.learning_admissions(course_id,student_id,submission_id,fee_id,amount_minor,review_note,created_by,attempt_id)
 values(p_course_id,p_student_id,p_submission_id,fee,p_amount_minor,trim(p_note),auth.uid(),p_attempt_id) returning id into result;
 return result;
end; $$;

create function public.set_learning_enrolment(p_admission_id uuid,p_active boolean,p_reason text) returns boolean
language plpgsql security definer set search_path='' as $$
declare admission public.learning_admissions; course public.learning_courses; fee public.fee_requests; paid bigint;
begin
 if not private.learning_owner() then raise exception 'Active learning owner required'; end if;
 if p_active is null or coalesce(length(trim(p_reason)),0) not between 1 and 2000 then raise exception 'A decision and reason are required'; end if;
 -- All place mutations lock the class first, so parallel enrolments cannot exceed capacity.
 select c.* into course from public.learning_courses c join public.learning_admissions a on a.course_id=c.id
 where a.id=p_admission_id for update of c;
 if not found then raise exception 'Admission not found'; end if;
 select * into admission from public.learning_admissions where id=p_admission_id for update;
 if p_active and admission.state='enrolled' then return true; end if;
 if not p_active and admission.state='withdrawn' then return false; end if;
 if p_active then
  if course.archived or not exists(select 1 from public.learning_students where id=admission.student_id and not archived)
  then raise exception 'Restore the class and student before enrolling'; end if;
  if course.capacity is not null and (select count(*) from public.learning_enrolments where course_id=course.id and active)>=course.capacity
  then raise exception 'Class capacity has been reached'; end if;
  if admission.fee_id is not null then
   select * into fee from public.fee_requests where id=admission.fee_id for update;
   select coalesce(sum(amount_minor),0) into paid from public.fee_receipts where fee_id=fee.id;
   if fee.voided_at is not null or fee.amount_minor is distinct from admission.amount_minor or fee.currency<>'GBP'
   or fee.student_id is distinct from admission.student_id or fee.course_id is distinct from admission.course_id
   or paid<>fee.amount_minor then raise exception 'Full confirmed payment for this admission is required'; end if;
  end if;
 end if;
 update public.learning_enrolments set active=p_active where course_id=admission.course_id and student_id=admission.student_id;
 update public.learning_admissions set state=case when p_active then 'enrolled' else 'withdrawn' end,
 enrolled_at=case when p_active then now() else enrolled_at end,withdrawn_at=case when not p_active then now() else null end
 where id=p_admission_id;
 insert into public.learning_admission_decisions(admission_id,actor_id,active,reason) values(p_admission_id,auth.uid(),p_active,trim(p_reason));
 return p_active;
end; $$;
create table public.learning_admission_decisions (
 id uuid primary key default gen_random_uuid(),admission_id uuid not null references public.learning_admissions,
 actor_id uuid not null references public.profiles,active boolean not null,reason text not null,
 created_at timestamptz not null default now()
);
alter table public.learning_admission_decisions enable row level security;
revoke all on public.learning_admission_decisions from public,anon,authenticated;
grant select on public.learning_admission_decisions to authenticated;
grant all on public.learning_admission_decisions to service_role;
create policy admission_decision_owner on public.learning_admission_decisions for select to authenticated using(private.learning_owner());
revoke all on function public.review_learning_admission(uuid,uuid,uuid,integer,text,uuid),public.set_learning_enrolment(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.review_learning_admission(uuid,uuid,uuid,integer,text,uuid),public.set_learning_enrolment(uuid,boolean,text) to authenticated;
-- A bounded owner-only view of applications with balances calculated from the ledger.
create function public.list_learning_admissions(p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if not private.learning_owner() then raise exception 'Active learning owner required'; end if;
 if p_offset is null or p_limit is null or p_offset not between 0 and 25000 or p_limit not between 1 and 100 then raise exception 'Invalid page bounds'; end if;
 with page as materialized(select a.* from public.learning_admissions a order by a.created_at desc,a.id limit p_limit offset p_offset),
 details as (select a.*, case when f.id is null then null else jsonb_build_object('id',f.id,'status',case when f.voided_at is not null then 'void' when coalesce(p.paid,0)=f.amount_minor then 'paid' when coalesce(p.paid,0)>0 then 'partial' else 'unpaid' end,
 'outstanding_minor',case when f.voided_at is not null then 0 else greatest(0,f.amount_minor-coalesce(p.paid,0)) end,'amount_minor',f.amount_minor,'currency',f.currency) end fee
 from page a left join public.fee_requests f on f.id=a.fee_id
 left join lateral(select sum(r.amount_minor)::bigint paid from public.fee_receipts r where r.fee_id=f.id) p on true)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc,d.id) from details d),'[]'::jsonb),'total',(select count(*) from public.learning_admissions)) into result;
 return result;
end; $$;
revoke all on function public.list_learning_admissions(integer,integer) from public,anon,authenticated;
grant execute on function public.list_learning_admissions(integer,integer) to authenticated;
commit;
