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
 select private.active_account(account) and case when form is not null then exists(select 1 from public.form_submissions f where f.id=form and case when f.kind='custom' then private.staff_custom_form(f.custom_form_id,account) else private.account_permission(account,'forms_'||f.kind) end)
 else exists(select 1 from public.learning_enrolments e where e.course_id=course and e.student_id=student and e.active) and (exists(select 1 from public.profiles where id=account and is_active and is_owner) or exists(select 1 from public.learning_staff s where s.course_id=course and s.user_id=account)) end; $$;
create function private.manage_fee(fee uuid,account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.fee_requests f where f.id=fee and private.fee_source_staff(f.form_id,f.student_id,f.course_id,account)); $$;
create function private.read_fee(fee uuid,account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and exists(select 1 from public.fee_requests f where f.id=fee and (private.fee_source_staff(f.form_id,f.student_id,f.course_id,account)
 or (f.form_id is not null and private.read_custom_submission(f.form_id,account))
 or (f.student_id is not null and private.own_student(f.student_id,account) and exists(select 1 from public.learning_enrolments where course_id=f.course_id and student_id=f.student_id and active)))); $$;

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
 if found then if existing.amount_minor is distinct from p_amount_minor or existing.reference is distinct from trim(p_reference) or existing.recorded_by is distinct from auth.uid() then raise exception 'Payment attempt already used'; end if;return existing.id;end if;
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

-- Account inbox updates are queued with ledger writes, never sent synchronously.
alter table public.user_notifications drop constraint if exists user_notifications_kind_check;
alter table public.user_notifications add constraint user_notifications_kind_check check(kind in('task','learning','form','fee'));
create or replace function private.can_receive_notification(account uuid,kind text,entity uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and case kind when 'task' then private.read_task(entity,account)
 when 'form' then private.read_custom_submission(entity,account)
 when 'fee' then private.read_fee(entity,account)
 when 'learning' then exists(select 1 from public.learning_records r join public.learning_enrolments e using(course_id,student_id)
 where r.id=entity and r.published and e.active and private.own_student(r.student_id,account)) else false end; $$;
create function private.fee_notification() returns trigger language plpgsql security definer set search_path='' as $$
 declare fee public.fee_requests; recipient uuid;
 begin
 if tg_table_name='fee_requests' then select * into fee from public.fee_requests where id=new.id; else select * into fee from public.fee_requests where id=new.fee_id; end if;
 for recipient in select distinct account from (
 select submitter_id account from public.form_submissions where id=fee.form_id
 union select user_id from public.learning_students where id=fee.student_id
 union select guardian_id from public.learning_students where id=fee.student_id) linked
 where account is not null and account is distinct from auth.uid() and private.read_fee(fee.id,account) loop
 insert into public.user_notifications(user_id,kind,entity_id) values(recipient,'fee',fee.id);end loop;return new;end; $$;
create trigger fee_created_notify after insert on public.fee_requests for each row execute function private.fee_notification();
create trigger fee_receipt_notify after insert on public.fee_receipts for each row execute function private.fee_notification();
revoke all on function private.fee_notification() from public,anon,authenticated;

-- Only a signature-verified server webhook may confirm provider payments.
create function public.record_stripe_fee_payment(p_fee_id uuid,p_amount_minor integer,p_currency text,p_event_id text,p_payment_id text) returns uuid language plpgsql security definer set search_path='' as $$
 declare fee public.fee_requests; existing public.fee_receipts; result uuid; paid bigint;
 begin
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
commit;
