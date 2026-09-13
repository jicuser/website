-- Optional email bridge; disabled until a configured worker sends its readiness heartbeat.
begin;
create table private.form_email_config (id boolean primary key default true check(id),ready_until timestamptz not null default '-infinity');
insert into private.form_email_config default values;
create table private.form_email_threads (
 id uuid primary key default gen_random_uuid(),submission_id uuid not null references public.form_submissions on delete cascade,
 recipient text not null,expires_at timestamptz not null default now()+interval '180 days',unique(submission_id,recipient));
create table public.form_email_outbox (
 id uuid primary key, submission_id uuid not null references public.form_submissions on delete cascade,
 reply_id uuid not null references public.form_replies,thread_id uuid not null references private.form_email_threads,
 created_by uuid references public.profiles,recipient text not null,subject text not null,body text not null,
 status text not null default 'queued' check(status in('queued','sending','sent','failed','uncertain','cancelled')),
 attempts integer not null default 0,lease_id uuid,lease_until timestamptz,available_at timestamptz not null default now(),
 provider_id text,last_error text,created_at timestamptz not null default now());
create index form_email_send_queue on public.form_email_outbox(status,available_at);
create table public.form_email_incoming (
 id uuid primary key default gen_random_uuid(),provider_id text not null unique,submission_id uuid not null references public.form_submissions on delete cascade,
 sender text not null,subject text not null,body text not null,
 status text not null default 'pending' check(status in('pending','accepted','rejected')),reviewed_by uuid references public.profiles,created_at timestamptz not null default now());
create index form_email_incoming_submission on public.form_email_incoming(submission_id,created_at);
alter table public.form_replies alter column author_id drop not null;
alter table public.form_replies add column author_kind text not null default 'account' check(author_kind in('account','email'));
alter table public.form_replies add constraint reply_author_source check((author_kind='account' and author_id is not null) or (author_kind='email' and author_id is null));
alter table public.form_email_outbox enable row level security;
alter table public.form_email_incoming enable row level security;
revoke all on private.form_email_config,private.form_email_threads,public.form_email_outbox,public.form_email_incoming from public,anon,authenticated;
grant all on private.form_email_config,private.form_email_threads,public.form_email_outbox,public.form_email_incoming to service_role;
grant select on public.form_email_outbox,public.form_email_incoming to authenticated;
create policy form_email_outbox_staff on public.form_email_outbox for select to authenticated using(private.staff_custom_submission(submission_id));
create policy form_email_incoming_staff on public.form_email_incoming for select to authenticated using(private.staff_custom_submission(submission_id));
create function public.form_email_capability(p_submission_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin if not private.staff_custom_submission(p_submission_id) then raise exception 'Form staff access required'; end if;
 return jsonb_build_object('enabled',(select ready_until>now() from private.form_email_config)); end; $$;
create function public.set_form_email_ready(p_enabled boolean) returns void language sql security invoker set search_path='' as $$
 update private.form_email_config set ready_until=case when p_enabled then now()+interval '10 minutes' else '-infinity'::timestamptz end; $$;
create function public.queue_form_email(p_submission_id uuid,p_recipient text,p_subject text,p_body text,p_idempotency_key uuid,p_acknowledged boolean)
 returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.form_email_outbox; reply uuid; thread uuid;
begin
 if not private.staff_custom_submission(p_submission_id) then raise exception 'Form staff access required'; end if;
 if p_acknowledged is distinct from true then raise exception 'Review recipient and message before sending'; end if;
 if p_idempotency_key is null or p_recipient is null or length(p_recipient)>254 or p_recipient !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$' or p_subject is null or length(trim(p_subject)) not between 1 and 160 or p_subject ~ '[\r\n]' or p_body is null or length(trim(p_body)) not between 1 and 6000 then raise exception 'Invalid email fields'; end if;
 p_recipient=lower(p_recipient);
 perform pg_advisory_xact_lock(hashtext(p_idempotency_key::text));
 select * into existing from public.form_email_outbox where id=p_idempotency_key;
 if existing.id is not null then
  if existing.created_by<>auth.uid() or existing.submission_id<>p_submission_id or existing.recipient<>p_recipient or existing.subject<>trim(p_subject) or existing.body<>trim(p_body) then raise exception 'Email attempt changed; start a new message'; end if;
  return existing.id;
 end if;
 if not (select ready_until>now() from private.form_email_config) then raise exception 'Email is not configured; use the portal reply'; end if;
 if (select count(*) from public.form_email_outbox where created_by=auth.uid() and created_at>now()-interval '1 hour')>=30 then raise exception 'Email send limit reached'; end if;
 insert into private.form_email_threads(submission_id,recipient) values(p_submission_id,p_recipient) on conflict(submission_id,recipient) do update set expires_at=now()+interval '180 days' returning id into thread;
 reply=private.reply_custom_form(p_submission_id,p_body,false);
 insert into public.form_email_outbox(id,submission_id,reply_id,thread_id,created_by,recipient,subject,body) values(p_idempotency_key,p_submission_id,reply,thread,auth.uid(),p_recipient,trim(p_subject),trim(p_body));
 return p_idempotency_key;
end; $$;
create function public.claim_form_emails() returns setof public.form_email_outbox language sql security invoker set search_path='' as $$
 with stale as (update public.form_email_outbox set status='uncertain',last_error='delivery_not_confirmed',lease_until=null where status in('queued','sending') and created_at<now()-interval '23 hours' returning id),
 revoked as (update public.form_email_outbox set status='cancelled',last_error='staff_access_revoked',lease_until=null where status in('queued','sending') and not private.staff_custom_submission(submission_id,created_by) returning id)
 update public.form_email_outbox set status='sending',attempts=attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes'
 where id in(select id from public.form_email_outbox where ((status='queued' and available_at<=now()) or (status='sending' and lease_until<now())) and attempts<5 and created_at>now()-interval '23 hours' and private.staff_custom_submission(submission_id,created_by) order by created_at for update skip locked limit 5) returning *;
$$;
create function public.finish_form_email(p_id uuid,p_lease_id uuid,p_provider_id text default null,p_error text default null) returns void language plpgsql security invoker set search_path='' as $$
begin update public.form_email_outbox set status=case when p_provider_id is not null then 'sent' when attempts>=5 then 'failed' else 'queued' end,provider_id=p_provider_id,last_error=left(p_error,120),lease_until=null,lease_id=null,available_at=now()+make_interval(secs=>60*power(2,attempts)::integer)
 where id=p_id and lease_id=p_lease_id and status='sending' and lease_until>now();
 if not found then raise exception 'Email lease expired'; end if; end; $$;
create function public.receive_form_email(p_provider_id text,p_thread_id uuid,p_sender text,p_subject text,p_body text) returns boolean language plpgsql security invoker set search_path='' as $$
declare thread private.form_email_threads; recipient uuid; created uuid;
begin
 if p_provider_id is null or length(p_provider_id)>200 or p_sender is null or length(p_sender)>320 or p_body is null or length(trim(p_body)) not between 1 and 6000 or p_subject is null or length(p_subject)>160 then raise exception 'Invalid received email'; end if;
 select * into thread from private.form_email_threads where id=p_thread_id and expires_at>now();
 if thread.id is null then return false; end if;
 insert into public.form_email_incoming(provider_id,submission_id,sender,subject,body) values(p_provider_id,thread.submission_id,p_sender,p_subject,trim(p_body)) on conflict(provider_id) do nothing returning id into created;
 if created is null then return true; end if;
 for recipient in select distinct user_id from public.custom_form_staff where form_id=(select custom_form_id from public.form_submissions where id=thread.submission_id) and private.active_account(user_id) loop
 insert into public.user_notifications(user_id,kind,entity_id) values(recipient,'form',thread.submission_id); end loop;
 return true;
end; $$;
create function public.review_form_email(p_id uuid,p_accept boolean) returns void language plpgsql security definer set search_path='' as $$
declare item public.form_email_incoming; submitter uuid;
begin
 select * into item from public.form_email_incoming where id=p_id for update;
 if item.id is null or not private.staff_custom_submission(item.submission_id) then raise exception 'Form staff access required'; end if;
 if item.status<>'pending' then return; end if;
 update public.form_email_incoming set status=case when p_accept then 'accepted' else 'rejected' end,reviewed_by=auth.uid() where id=p_id;
 if p_accept then
  insert into public.form_replies(submission_id,author_id,author_kind,body,internal) values(item.submission_id,null,'email',item.body,false);
  select submitter_id into submitter from public.form_submissions where id=item.submission_id;
  if submitter is not null and private.active_account(submitter) then insert into public.user_notifications(user_id,kind,entity_id) values(submitter,'form',item.submission_id); end if;
 end if;
end; $$;
revoke all on function public.form_email_capability(uuid),public.set_form_email_ready(boolean),public.queue_form_email(uuid,text,text,text,uuid,boolean),public.claim_form_emails(),public.finish_form_email(uuid,uuid,text,text),public.receive_form_email(text,uuid,text,text,text),public.review_form_email(uuid,boolean) from public,anon,authenticated;
grant execute on function public.form_email_capability(uuid),public.queue_form_email(uuid,text,text,text,uuid,boolean),public.review_form_email(uuid,boolean) to authenticated;
grant execute on function public.set_form_email_ready(boolean),public.claim_form_emails(),public.finish_form_email(uuid,uuid,text,text),public.receive_form_email(text,uuid,text,text,text) to service_role;
commit;
