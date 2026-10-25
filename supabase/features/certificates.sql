-- STAGED FEATURE: not part of the automatic migration chain.
-- See docs/certificates.md before activating. Uses existing profiles and private.has_permission.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

alter table public.profiles drop constraint if exists permissions_allowed;
alter table public.profiles add constraint permissions_allowed check (
  permissions <@ array['content','media','events','announcements','prayer_times','team',
    'livestream','tv','broadcast','forms_contact','forms_madrassah','forms_itikaaf',
    'forms_manage','forms_custom','certificates','finance','fundraising','safeguarding',
    'users','audit','delete_content']::text[]
  and array_position(permissions, null) is null
);

create table public.certificate_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id),
  client_key uuid not null,
  kind text not null check (kind in ('nikah','shahadah','course','ijazah')),
  recipient_name text not null check (length(trim(recipient_name)) between 2 and 240),
  event_date date,
  notes text not null default '' check (length(notes) <= 2000),
  status text not null default 'pending' check (status in ('pending','issued','declined')),
  review_note text not null default '' check (length(review_note) <= 1000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  unique (applicant_id, client_key)
);
create index certificate_requests_applicant on public.certificate_requests(applicant_id, created_at desc);
create index certificate_requests_queue on public.certificate_requests(status, created_at);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.certificate_requests(id),
  recipient_id uuid not null references public.profiles(id),
  reference text not null unique,
  kind text not null check (kind in ('nikah','shahadah','course','ijazah')),
  recipient_name text not null check (length(trim(recipient_name)) between 2 and 240),
  event_date date,
  statement text not null check (length(trim(statement)) between 10 and 4000),
  issuer_name text not null default 'Jamatia Islamic Centre',
  approved_by uuid not null references public.profiles(id),
  approved_by_name text not null,
  issued_at timestamptz not null default now(),
  verification_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id),
  revocation_reason text,
  check ((revoked_at is null and revoked_by is null and revocation_reason is null)
    or (revoked_at is not null and revoked_by is not null and length(trim(revocation_reason)) between 3 and 1000))
);
create index certificates_recipient on public.certificates(recipient_id, issued_at desc);

create table public.certificate_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.certificate_requests(id),
  certificate_id uuid references public.certificates(id),
  actor_id uuid not null references public.profiles(id),
  action text not null check (action in ('requested','issued','declined','revoked')),
  created_at timestamptz not null default now()
);
create index certificate_events_request on public.certificate_events(request_id, created_at);

create function private.certificate_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_active from public.profiles where id = (select auth.uid())), false);
$$;
revoke all on function private.certificate_account() from public, anon;
grant execute on function private.certificate_account() to authenticated;

alter table public.certificate_requests enable row level security;
alter table public.certificates enable row level security;
alter table public.certificate_events enable row level security;
revoke all on public.certificate_requests, public.certificates, public.certificate_events from public, anon, authenticated;
grant select on public.certificate_requests, public.certificates, public.certificate_events to authenticated;
create policy certificate_requests_read on public.certificate_requests for select to authenticated using (
  (select private.certificate_account()) and
  (applicant_id = (select auth.uid()) or (select private.has_permission('certificates')))
);
create policy certificates_read on public.certificates for select to authenticated using (
  (select private.certificate_account()) and
  (recipient_id = (select auth.uid()) or (select private.has_permission('certificates')))
);
create policy certificate_events_read on public.certificate_events for select to authenticated using (
  (select private.has_permission('certificates'))
);

create function private.protect_issued_certificate() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Issued certificates cannot be deleted'; end if;
  if (to_jsonb(new) - array['revoked_at','revoked_by','revocation_reason'])
    is distinct from (to_jsonb(old) - array['revoked_at','revoked_by','revocation_reason'])
    or old.revoked_at is not null then
    raise exception 'Issued certificates cannot be changed; revoke and issue a replacement';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_issued_certificate() from public, anon, authenticated;
create trigger protect_issued_certificate before update or delete on public.certificates
for each row execute function private.protect_issued_certificate();

create function private.request_certificate(
  p_kind text, p_recipient_name text, p_event_date date, p_notes text, p_client_key uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid = auth.uid(); result uuid; previous public.certificate_requests;
begin
  perform 1 from public.profiles where id = actor and is_active for update;
  if not found then raise exception 'An active account is required'; end if;
  if p_client_key is null then raise exception 'A request key is required'; end if;
  select * into previous from public.certificate_requests where applicant_id = actor and client_key = p_client_key;
  if found then
    if previous.kind is distinct from p_kind or previous.recipient_name is distinct from trim(p_recipient_name)
      or previous.event_date is distinct from p_event_date or previous.notes is distinct from trim(coalesce(p_notes,'')) then
      raise exception 'This request key already belongs to different details; start a new request';
    end if;
    return previous.id;
  end if;
  if (select count(*) from public.certificate_requests where applicant_id = actor and created_at > now() - interval '1 day') >= 5
    then raise exception 'You have reached the daily request limit'; end if;
  if p_event_date > current_date then raise exception 'The event date cannot be in the future'; end if;
  insert into public.certificate_requests(applicant_id,client_key,kind,recipient_name,event_date,notes)
    values(actor,p_client_key,p_kind,trim(p_recipient_name),p_event_date,trim(coalesce(p_notes,''))) returning id into result;
  insert into public.certificate_events(request_id,actor_id,action) values(result,actor,'requested');
  return result;
end;
$$;
create function public.request_certificate(
  p_kind text, p_recipient_name text, p_event_date date, p_notes text, p_client_key uuid
) returns uuid language sql security invoker set search_path = '' as $$
  select private.request_certificate(p_kind,p_recipient_name,p_event_date,p_notes,p_client_key);
$$;

create function private.review_certificate_request(
  p_request_id uuid, p_decision text, p_statement text, p_note text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid = auth.uid(); request public.certificate_requests; result uuid; signer text;
begin
  perform 1 from public.profiles where id = actor for share;
  if not private.has_permission('certificates') then raise exception 'Certificate permission is required'; end if;
  select * into request from public.certificate_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if request.applicant_id = actor then raise exception 'Another authorised staff member must review your request'; end if;
  if p_decision is null or p_decision not in ('issue','decline') then raise exception 'Choose an approval decision'; end if;
  -- Retry after a lost response returns the existing certificate, never another copy.
  if request.status = 'issued' and p_decision = 'issue' then
    select id into result from public.certificates where request_id = request.id;
    return result;
  end if;
  if request.status <> 'pending' then raise exception 'This request has already been reviewed'; end if;
  if p_decision = 'decline' and length(trim(coalesce(p_note,''))) < 3 then raise exception 'Explain why the request cannot be approved'; end if;
  if p_decision = 'issue' then
    perform 1 from public.profiles where id = request.applicant_id and is_active for share;
    if not found then raise exception 'The recipient account is not active'; end if;
    select display_name into signer from public.profiles where id = actor;
    if length(trim(coalesce(signer,''))) < 2 then raise exception 'Add your staff display name before issuing'; end if;
    insert into public.certificates(request_id,recipient_id,reference,kind,recipient_name,event_date,statement,approved_by,approved_by_name)
      values(request.id,request.applicant_id,'JIC-' || to_char(current_date,'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
        request.kind,request.recipient_name,request.event_date,trim(p_statement),actor,signer) returning id into result;
  end if;
  update public.certificate_requests set status = case when p_decision = 'issue' then 'issued' else 'declined' end,
    review_note = trim(coalesce(p_note,'')), reviewed_at = now(), reviewed_by = actor where id = request.id;
  insert into public.certificate_events(request_id,certificate_id,actor_id,action)
    values(request.id,result,actor,case when p_decision = 'issue' then 'issued' else 'declined' end);
  return result;
end;
$$;
create function public.review_certificate_request(
  p_request_id uuid, p_decision text, p_statement text default '', p_note text default ''
) returns uuid language sql security invoker set search_path = '' as $$
  select private.review_certificate_request(p_request_id,p_decision,p_statement,p_note);
$$;

create function private.revoke_certificate(p_certificate_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid = auth.uid(); certificate public.certificates;
begin
  perform 1 from public.profiles where id = actor for share;
  if not private.has_permission('certificates') then raise exception 'Certificate permission is required'; end if;
  select * into certificate from public.certificates where id = p_certificate_id for update;
  if not found then raise exception 'Certificate not found'; end if;
  if certificate.revoked_at is not null then return; end if;
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'A revocation reason is required'; end if;
  update public.certificates set revoked_at = now(), revoked_by = actor, revocation_reason = trim(p_reason) where id = certificate.id;
  insert into public.certificate_events(request_id,certificate_id,actor_id,action)
    values(certificate.request_id,certificate.id,actor,'revoked');
end;
$$;
create function public.revoke_certificate(p_certificate_id uuid, p_reason text) returns void
language sql security invoker set search_path = '' as $$
  select private.revoke_certificate(p_certificate_id,p_reason);
$$;

-- Capability URL: exact random token only. Never disclose names, event dates,
-- account IDs, signatures, statements, notes or revocation reasons publicly.
create function private.verify_certificate(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'reference',reference, 'kind',kind, 'issuer_name',issuer_name,
    'issued_on',issued_at::date, 'status',case when revoked_at is null then 'valid' else 'revoked' end
  ) from public.certificates where verification_token = p_token and p_token ~ '^[0-9a-f]{32}$';
$$;
create function public.verify_certificate(p_token text) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.verify_certificate(p_token);
$$;

revoke all on function private.request_certificate(text,text,date,text,uuid), public.request_certificate(text,text,date,text,uuid),
  private.review_certificate_request(uuid,text,text,text), public.review_certificate_request(uuid,text,text,text),
  private.revoke_certificate(uuid,text), public.revoke_certificate(uuid,text),
  private.verify_certificate(text), public.verify_certificate(text) from public, anon, authenticated;
grant usage on schema private to authenticated, anon;
grant execute on function private.request_certificate(text,text,date,text,uuid), public.request_certificate(text,text,date,text,uuid),
  private.review_certificate_request(uuid,text,text,text), public.review_certificate_request(uuid,text,text,text),
  private.revoke_certificate(uuid,text), public.revoke_certificate(uuid,text) to authenticated;
grant execute on function private.verify_certificate(text), public.verify_certificate(text) to authenticated, anon;
commit;
