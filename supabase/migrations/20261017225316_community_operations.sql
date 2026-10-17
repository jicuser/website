-- Additive community operations. Does not activate the historical learning workspace.
begin;

alter table public.profiles drop constraint if exists permissions_allowed;
alter table public.profiles add constraint permissions_allowed check (
  permissions <@ array['content','media','events','announcements','prayer_times','team','livestream','tv','broadcast','forms_contact','forms_madrassah','forms_itikaaf','forms_manage','forms_custom','certificates','finance','fundraising','safeguarding','users','audit','delete_content']::text[]
  and array_position(permissions,null) is null);
alter table public.profiles drop constraint if exists staff_kinds_allowed;
alter table public.profiles add constraint staff_kinds_allowed check (
  staff_kinds <@ array['imam','teacher','volunteer','office','media','tv_team','treasurer','secretary','trustee','safeguarding_lead']::text[]
  and array_position(staff_kinds,null) is null);

create table if not exists public.account_access_requests (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254),
  requested_role text not null,
  requested_features text[] not null default '{}',
  message text not null default '' check (char_length(message) <= 2000),
  requested_permissions text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  auth_user_id uuid references public.profiles(id) on delete set null
);
alter table public.account_access_requests drop constraint if exists account_access_requests_requested_role_check;
alter table public.account_access_requests add constraint account_access_requests_requested_role_check
  check (requested_role in ('parent_guardian','student','teacher','volunteer','imam','office','treasurer','secretary','trustee','safeguarding_lead'));
create unique index account_access_requests_pending_email on public.account_access_requests(lower(email)) where status='pending';
create index if not exists account_access_requests_status_created on public.account_access_requests(status,created_at);
alter table public.account_access_requests enable row level security;
revoke all on public.account_access_requests from anon,authenticated;
grant all on public.account_access_requests to service_role;

create table private.community_request_limits (
  source_key text primary key, window_at timestamptz not null default now(), count integer not null default 1
);
revoke all on private.community_request_limits from public,anon,authenticated;

create function public.submit_account_request(p_body jsonb,p_source_key text) returns void
language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
  if p_source_key !~ '^[a-f0-9]{64}$' or p_source_key is null then raise exception 'invalid_request';end if;
  if char_length(trim(p_body->>'display_name')) not between 2 and 120
    or coalesce(p_body->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(p_body->>'email')>254 or char_length(coalesce(p_body->>'message',''))>2000
    or coalesce(p_body->>'requested_role','') not in ('parent_guardian','student','teacher','volunteer','imam','office','treasurer','secretary','trustee','safeguarding_lead')
    then raise exception 'invalid_request';end if;
  delete from private.community_request_limits where window_at<now()-interval '2 days';
  insert into private.community_request_limits as r(source_key) values(p_source_key)
    on conflict(source_key) do update set
    count=case when r.window_at<now()-interval '1 hour' then 1 else r.count+1 end,
    window_at=case when r.window_at<now()-interval '1 hour' then now() else r.window_at end
    returning count into v_count;
  if v_count>5 then raise exception 'request_rate_limit';end if;
  insert into public.account_access_requests(display_name,email,requested_role,requested_features,message)
    values(trim(p_body->>'display_name'),lower(trim(p_body->>'email')),p_body->>'requested_role',
      array(select distinct value from jsonb_array_elements_text(coalesce(p_body->'requested_features','[]')) where value in ('family_updates','learning','teacher_tools','forms','community','finance','fundraising','staff')),
      trim(coalesce(p_body->>'message','')))
    on conflict(lower(email)) where status='pending' do nothing;
end;$$;
revoke all on function public.submit_account_request(jsonb,text) from public,anon,authenticated;
grant execute on function public.submit_account_request(jsonb,text) to service_role;

create function public.account_request_user(p_request_id uuid) returns uuid
language sql security definer set search_path='' as $$
  select u.id from auth.users u join public.account_access_requests r on lower(u.email)=lower(r.email)
    where r.id=p_request_id and r.status='pending' limit 1
$$;
revoke all on function public.account_request_user(uuid) from public,anon,authenticated;
grant execute on function public.account_request_user(uuid) to service_role;

create function public.resolve_account_request(p_actor uuid,p_request uuid,p_target uuid,p_permissions text[],p_kinds text[],p_approve boolean) returns void
language plpgsql security definer set search_path='' as $$
declare r public.account_access_requests; a public.profiles; v_permissions text[];v_kinds text[];
begin
  select * into r from public.account_access_requests where id=p_request for update;
  if not found or r.status<>'pending' then raise exception 'This request has already been reviewed.';end if;
  select * into a from public.profiles where id=p_actor for update;
  if not coalesce(a.is_active and (a.is_owner or 'users'=any(a.permissions)),false) then raise exception 'Staff management permission required.';end if;
  if p_approve then
    if not exists(select 1 from auth.users where id=p_target and lower(email)=lower(r.email)) then raise exception 'Account email does not match this request.';end if;
    select array(select distinct unnest(permissions||coalesce(p_permissions,'{}'))),array(select distinct unnest(staff_kinds||coalesce(p_kinds,'{}')))
      into v_permissions,v_kinds from public.profiles where id=p_target;
    perform public.manage_staff_access(p_actor,p_target,v_permissions,v_kinds,true);
  end if;
  update public.account_access_requests set status=case when p_approve then 'approved' else 'rejected' end,
    reviewed_at=now(),reviewed_by=p_actor,auth_user_id=case when p_approve then p_target else null end,
    requested_permissions=coalesce(p_permissions,'{}') where id=p_request;
  insert into public.audit_log(actor_id,actor_name,table_name,record_id,action)
    values(p_actor,a.display_name,'account_access_requests',p_request,case when p_approve then 'APPROVE' else 'DECLINE' end);
end;$$;
revoke all on function public.resolve_account_request(uuid,uuid,uuid,text[],text[],boolean) from public,anon,authenticated;
grant execute on function public.resolve_account_request(uuid,uuid,uuid,text[],text[],boolean) to service_role;

create function private.operations_audit(p_table text,p_id uuid,p_action text) returns void
language sql security definer set search_path='' as $$
  insert into public.audit_log(actor_id,actor_name,table_name,record_id,action)
  select id,display_name,p_table,p_id,p_action from public.profiles where id=auth.uid()
$$;
revoke all on function private.operations_audit(text,uuid,text) from public,anon,authenticated;

create table public.community_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  slug text not null unique default ('support-'||replace(gen_random_uuid()::text,'-','')),
  reference text not null unique default ('JIC-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  title text not null check(char_length(trim(title)) between 5 and 120),
  organiser text not null check(char_length(trim(organiser)) between 2 and 100),
  story text not null check(char_length(trim(story)) between 40 and 4000),
  category text not null check(category in ('community','ramadan','education','masjid')),
  target_pence integer not null check(target_pence between 100 and 100000000),
  status text not null default 'pending' check(status in ('pending','published','closed','rejected')),
  review_note text not null default '' check(char_length(review_note)<=1000),
  version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null
);
create index community_campaigns_owner on public.community_campaigns(owner_id,created_at desc);
alter table public.community_campaigns enable row level security;
revoke all on public.community_campaigns from public,anon,authenticated;
grant select on public.community_campaigns to authenticated;
create policy campaign_read on public.community_campaigns for select to authenticated using (
  (owner_id=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and is_active))
  or private.has_permission('fundraising') or (private.has_permission('finance') and status in ('published','closed'))
);

create function public.save_community_campaign(p_id uuid,p_body jsonb,p_version integer default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;r public.community_campaigns;
begin
  perform 1 from public.profiles where id=auth.uid() and is_active for update;
  if not found then raise exception 'Sign in with an active account.';end if;
  if p_id is null then
    if (select count(*) from public.community_campaigns where owner_id=auth.uid() and created_at>now()-interval '1 day')>=3 then raise exception 'Please wait before submitting another campaign.';end if;
    insert into public.community_campaigns(owner_id,title,organiser,story,category,target_pence)
    values(auth.uid(),trim(p_body->>'title'),trim(p_body->>'organiser'),trim(p_body->>'story'),p_body->>'category',(p_body->>'target_pence')::integer) returning id into v_id;
  else
    select * into r from public.community_campaigns where id=p_id and owner_id=auth.uid() for update;
    if not found or r.status not in ('pending','rejected') then raise exception 'Only your campaigns awaiting approval can be edited.';end if;
    if p_version is distinct from r.version then raise exception 'This campaign changed. Reload it before saving.';end if;
    update public.community_campaigns set title=trim(p_body->>'title'),organiser=trim(p_body->>'organiser'),story=trim(p_body->>'story'),
      category=p_body->>'category',target_pence=(p_body->>'target_pence')::integer,status='pending',review_note='',version=version+1,updated_at=now() where id=p_id;
    v_id:=p_id;
  end if;
  perform private.operations_audit('community_campaigns',v_id,'SUBMIT');return v_id;
end;$$;
revoke all on function public.save_community_campaign(uuid,jsonb,integer) from public,anon;
grant execute on function public.save_community_campaign(uuid,jsonb,integer) to authenticated;

create function public.review_community_campaign(p_id uuid,p_status text,p_note text,p_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare r public.community_campaigns;
begin
  if not private.has_permission('fundraising') then raise exception 'Fundraising permission required.';end if;
  if p_status not in ('published','rejected','closed') or char_length(coalesce(p_note,''))>1000 then raise exception 'Choose a valid decision.';end if;
  if p_status='rejected' and char_length(trim(coalesce(p_note,'')))<5 then raise exception 'Explain what needs changing.';end if;
  select * into r from public.community_campaigns where id=p_id for update;
  if not found or p_version is distinct from r.version then raise exception 'This campaign changed. Reload before reviewing.';end if;
  update public.community_campaigns set status=p_status,review_note=coalesce(p_note,''),reviewed_by=auth.uid(),updated_at=now(),version=version+1 where id=p_id;
  perform private.operations_audit('community_campaigns',p_id,upper(p_status));
end;$$;
revoke all on function public.review_community_campaign(uuid,text,text,integer) from public,anon;
grant execute on function public.review_community_campaign(uuid,text,text,integer) to authenticated;

create table public.community_finance_settings (
  singleton boolean primary key default true check(singleton),
  issuer_name text not null check(char_length(trim(issuer_name)) between 2 and 160),
  issuer_address text not null check(char_length(trim(issuer_address)) between 10 and 600),
  issuer_email text not null check(char_length(issuer_email) between 5 and 254),
  registration_note text not null default '' check(char_length(registration_note)<=200),
  non_vat_confirmed boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.community_finance_settings enable row level security;
revoke all on public.community_finance_settings from public,anon,authenticated;
grant select on public.community_finance_settings to authenticated;
create policy finance_settings_read on public.community_finance_settings for select to authenticated using(private.has_permission('finance'));
create function public.save_community_finance_settings(p_body jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.has_permission('finance') then raise exception 'Finance permission required.';end if;
  insert into public.community_finance_settings(issuer_name,issuer_address,issuer_email,registration_note,non_vat_confirmed)
  values(trim(p_body->>'issuer_name'),trim(p_body->>'issuer_address'),trim(p_body->>'issuer_email'),trim(coalesce(p_body->>'registration_note','')),coalesce((p_body->>'non_vat_confirmed')::boolean,false))
  on conflict(singleton) do update set issuer_name=excluded.issuer_name,issuer_address=excluded.issuer_address,issuer_email=excluded.issuer_email,
    registration_note=excluded.registration_note,non_vat_confirmed=excluded.non_vat_confirmed,updated_at=now();
  perform private.operations_audit('community_finance_settings',null,'UPDATE');
end;$$;
revoke all on function public.save_community_finance_settings(jsonb) from public,anon;
grant execute on function public.save_community_finance_settings(jsonb) to authenticated;

create sequence private.community_invoice_number;
create table public.community_invoices (
  id uuid primary key default gen_random_uuid(),
  number text unique,
  kind text not null check(kind in ('janazah','madrassah','hall','other')),
  recipient_name text not null check(char_length(trim(recipient_name)) between 2 and 160),
  recipient_address text not null check(char_length(trim(recipient_address)) between 5 and 600),
  recipient_email text not null default '' check(char_length(recipient_email)<=254),
  member_id uuid references public.profiles(id) on delete set null,
  supply_date date not null, due_date date not null,
  lines jsonb not null,
  total_pence integer not null check(total_pence between 1 and 100000000),
  notes text not null default '' check(char_length(notes)<=2000),
  status text not null default 'draft' check(status in ('draft','issued','void')),
  issuer jsonb, issued_at timestamptz, void_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), version integer not null default 1
);
create index community_invoices_member on public.community_invoices(member_id,created_at desc);
alter table public.community_invoices enable row level security;
revoke all on public.community_invoices from public,anon,authenticated;
grant select on public.community_invoices to authenticated;
create policy invoice_read on public.community_invoices for select to authenticated using(
  private.has_permission('finance') or (member_id=auth.uid() and status<>'draft' and exists(select 1 from public.profiles where id=auth.uid() and is_active))
);

create function public.save_community_invoice(p_id uuid,p_body jsonb,p_version integer default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;r public.community_invoices;v_line jsonb;v_total bigint:=0;v_qty integer;v_unit integer;v_lines jsonb:='[]';
begin
  if not private.has_permission('finance') then raise exception 'Finance permission required.';end if;
  if jsonb_typeof(p_body->'lines') is distinct from 'array' or jsonb_array_length(p_body->'lines') not between 1 and 30 then raise exception 'Add between 1 and 30 invoice items.';end if;
  for v_line in select * from jsonb_array_elements(p_body->'lines') loop
    v_qty:=(v_line->>'quantity')::integer;v_unit:=(v_line->>'unit_pence')::integer;
    if char_length(trim(coalesce(v_line->>'description',''))) not between 2 and 300 or v_qty is null or v_qty not between 1 and 10000 or v_unit is null or v_unit not between 1 and 100000000 then raise exception 'Check the invoice items.';end if;
    v_total:=v_total+v_qty::bigint*v_unit;
    v_lines:=v_lines||jsonb_build_array(jsonb_build_object('description',trim(v_line->>'description'),'quantity',v_qty,'unit_pence',v_unit));
  end loop;
  if v_total not between 1 and 100000000 then raise exception 'Invoice total is outside the supported range.';end if;
  if p_body->>'member_id' is not null and not exists(select 1 from public.profiles where id=(p_body->>'member_id')::uuid and is_active) then raise exception 'Choose an active portal account.';end if;
  if p_id is not null then
    select * into r from public.community_invoices where id=p_id for update;
    if not found or r.status<>'draft' or p_version is distinct from r.version then raise exception 'This draft changed or was issued. Reload before saving.';end if;
    update public.community_invoices set kind=p_body->>'kind',recipient_name=trim(p_body->>'recipient_name'),recipient_address=trim(p_body->>'recipient_address'),recipient_email=trim(coalesce(p_body->>'recipient_email','')),
      member_id=(p_body->>'member_id')::uuid,supply_date=(p_body->>'supply_date')::date,due_date=(p_body->>'due_date')::date,lines=v_lines,total_pence=v_total,notes=coalesce(p_body->>'notes',''),version=version+1 where id=p_id;
    v_id:=p_id;
  else
    insert into public.community_invoices(kind,recipient_name,recipient_address,recipient_email,member_id,supply_date,due_date,lines,total_pence,notes,created_by)
    values(p_body->>'kind',trim(p_body->>'recipient_name'),trim(p_body->>'recipient_address'),trim(coalesce(p_body->>'recipient_email','')),(p_body->>'member_id')::uuid,
      (p_body->>'supply_date')::date,(p_body->>'due_date')::date,v_lines,v_total,coalesce(p_body->>'notes',''),auth.uid()) returning id into v_id;
  end if;
  perform private.operations_audit('community_invoices',v_id,'SAVE_DRAFT');return v_id;
end;$$;
revoke all on function public.save_community_invoice(uuid,jsonb,integer) from public,anon;
grant execute on function public.save_community_invoice(uuid,jsonb,integer) to authenticated;

create table public.community_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.community_invoices(id),
  campaign_id uuid references public.community_campaigns(id),
  amount_pence integer not null check(amount_pence<>0 and abs(amount_pence)<=100000000),
  happened_on date not null,
  method text not null check(method in ('bank','cash','reversal')),
  reference text not null check(char_length(trim(reference)) between 2 and 200),
  idempotency_key uuid not null unique,
  reversal_of uuid unique references public.community_payments(id),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check(num_nonnulls(invoice_id,campaign_id)=1),
  check((amount_pence>0 and reversal_of is null and method<>'reversal') or (amount_pence<0 and reversal_of is not null and method='reversal'))
);
create index community_payments_invoice on public.community_payments(invoice_id);
create index community_payments_campaign on public.community_payments(campaign_id);
alter table public.community_payments enable row level security;
revoke all on public.community_payments from public,anon,authenticated;
grant select on public.community_payments to authenticated;
create policy payment_read on public.community_payments for select to authenticated using(
  private.has_permission('finance') or (invoice_id is not null and exists(select 1 from public.community_invoices i where i.id=invoice_id and i.member_id=auth.uid() and i.status<>'draft'))
);

create function public.issue_community_invoice(p_id uuid,p_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare r public.community_invoices;s public.community_finance_settings;
begin
  if not private.has_permission('finance') then raise exception 'Finance permission required.';end if;
  select * into r from public.community_invoices where id=p_id for update;
  if not found or r.status<>'draft' or p_version is distinct from r.version then raise exception 'This invoice changed. Reload before issuing.';end if;
  select * into s from public.community_finance_settings where singleton;
  if not found or not s.non_vat_confirmed then raise exception 'Confirm the issuing organisation and non-VAT status in Finance settings first.';end if;
  update public.community_invoices set status='issued',number='JIC-'||to_char(now() at time zone 'Europe/London','YYYY')||'-'||lpad(nextval('private.community_invoice_number')::text,6,'0'),
    issuer=jsonb_build_object('name',s.issuer_name,'address',s.issuer_address,'email',s.issuer_email,'registration_note',s.registration_note,'vat','No VAT charged'),issued_at=now(),version=version+1 where id=p_id;
  perform private.operations_audit('community_invoices',p_id,'ISSUE');
end;$$;
revoke all on function public.issue_community_invoice(uuid,integer) from public,anon;
grant execute on function public.issue_community_invoice(uuid,integer) to authenticated;

create function public.void_community_invoice(p_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.has_permission('finance') then raise exception 'Finance permission required.';end if;
  perform 1 from public.community_invoices where id=p_id and status<>'void' for update;
  if not found then raise exception 'Invoice is unavailable or already void.';end if;
  if char_length(trim(coalesce(p_reason,''))) not between 5 and 500 then raise exception 'Explain why this invoice is void.';end if;
  if (select coalesce(sum(amount_pence),0) from public.community_payments where invoice_id=p_id)<>0 then raise exception 'Reverse recorded payments before voiding. Arrange any refund separately.';end if;
  update public.community_invoices set status='void',void_reason=trim(p_reason),version=version+1 where id=p_id;
  perform private.operations_audit('community_invoices',p_id,'VOID');
end;$$;
revoke all on function public.void_community_invoice(uuid,text) from public,anon;
grant execute on function public.void_community_invoice(uuid,text) to authenticated;

create function public.record_community_payment(p_invoice uuid,p_campaign uuid,p_amount integer,p_date date,p_method text,p_reference text,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.community_invoices;v_total bigint;v_id uuid;v_existing public.community_payments;
begin
  if not private.has_permission('finance') then raise exception 'Finance permission required.';end if;
  if num_nonnulls(p_invoice,p_campaign)<>1 or p_amount is null or p_amount not between 1 and 100000000 or p_date is null or p_date>(now() at time zone 'Europe/London')::date or p_method not in ('bank','cash') or p_method is null or p_key is null then raise exception 'Check the payment amount, date and method.';end if;
  if p_invoice is not null then
    select * into r from public.community_invoices where id=p_invoice for update;
    if not found or r.status<>'issued' then raise exception 'Only issued invoices can receive payments.';end if;
  else
    perform 1 from public.community_campaigns where id=p_campaign and status in ('published','closed') for update;
    if not found then raise exception 'Choose an approved campaign.';end if;
  end if;
  select * into v_existing from public.community_payments where idempotency_key=p_key;
  if found then
    if v_existing.invoice_id is not distinct from p_invoice and v_existing.campaign_id is not distinct from p_campaign and v_existing.amount_pence=p_amount and v_existing.happened_on=p_date and v_existing.method=p_method and v_existing.reference=trim(p_reference) then return v_existing.id;end if;
    raise exception 'Payment reference already used for a different entry.';
  end if;
  if p_invoice is not null then
    select coalesce(sum(amount_pence),0) into v_total from public.community_payments where invoice_id=p_invoice;
    if v_total+p_amount>r.total_pence then raise exception 'Payment is greater than the outstanding balance.';end if;
  end if;
  insert into public.community_payments(invoice_id,campaign_id,amount_pence,happened_on,method,reference,idempotency_key,created_by)
    values(p_invoice,p_campaign,p_amount,p_date,p_method,trim(p_reference),p_key,auth.uid()) returning id into v_id;
  perform private.operations_audit('community_payments',v_id,'RECORD');return v_id;
end;$$;
revoke all on function public.record_community_payment(uuid,uuid,integer,date,text,text,uuid) from public,anon;
grant execute on function public.record_community_payment(uuid,uuid,integer,date,text,text,uuid) to authenticated;

create function public.reverse_community_payment(p_id uuid,p_reason text,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.community_payments;v_id uuid;
begin
  if not private.has_permission('finance') then raise exception 'Finance permission required.';end if;
  select * into r from public.community_payments where id=p_id;
  if not found or r.amount_pence<=0 then raise exception 'Choose an original payment.';end if;
  -- Same parent lock order as recording/voiding prevents payment races.
  if r.invoice_id is not null then perform 1 from public.community_invoices where id=r.invoice_id for update;
  else perform 1 from public.community_campaigns where id=r.campaign_id for update;end if;
  select id into v_id from public.community_payments where reversal_of=p_id;
  if found then return v_id;end if;
  if char_length(trim(coalesce(p_reason,''))) not between 5 and 200 then raise exception 'Explain the correction. This does not transfer a refund.';end if;
  insert into public.community_payments(invoice_id,campaign_id,amount_pence,happened_on,method,reference,idempotency_key,reversal_of,created_by)
    values(r.invoice_id,r.campaign_id,-r.amount_pence,(now() at time zone 'Europe/London')::date,'reversal',trim(p_reason),p_key,p_id,auth.uid()) returning id into v_id;
  perform private.operations_audit('community_payments',v_id,'REVERSE');return v_id;
end;$$;
revoke all on function public.reverse_community_payment(uuid,text,uuid) from public,anon;
grant execute on function public.reverse_community_payment(uuid,text,uuid) to authenticated;

create function public.public_community_campaigns(p_slug text default null) returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'slug',c.slug,'reference',c.reference,'title',c.title,'organiser',c.organiser,'story',c.story,'category',c.category,'target_pence',c.target_pence,'status',c.status,'raised_pence',coalesce((select sum(p.amount_pence) from public.community_payments p where p.campaign_id=c.id),0),'created_at',c.created_at) order by c.created_at desc),'[]'::jsonb)
  from (select * from public.community_campaigns where status in ('published','closed') and (p_slug is null or slug=p_slug) order by created_at desc limit 100) c
$$;
revoke all on function public.public_community_campaigns(text) from public;
grant execute on function public.public_community_campaigns(text) to anon,authenticated;

create table public.community_safeguarding_checks (
  id uuid primary key default gen_random_uuid(),
  subject_name text not null check(char_length(trim(subject_name)) between 2 and 160),
  role_name text not null check(char_length(trim(role_name)) between 2 and 120),
  check_level text not null check(check_level in ('basic','standard','enhanced','enhanced_barred')),
  checked_on date not null, review_on date not null, retention_review_on date not null,
  status text not null check(status in ('recorded','review_needed','action_required')),
  policy_reference text not null check(char_length(trim(policy_reference)) between 5 and 300),
  policy_confirmed boolean not null check(policy_confirmed),
  recorded_by uuid references public.profiles(id) on delete set null,
  version integer not null default 1, updated_at timestamptz not null default now(),
  check(review_on>=checked_on and retention_review_on>=checked_on)
);
alter table public.community_safeguarding_checks enable row level security;
revoke all on public.community_safeguarding_checks from public,anon,authenticated;
grant select on public.community_safeguarding_checks to authenticated;
create policy safeguarding_read on public.community_safeguarding_checks for select to authenticated using(private.has_permission('safeguarding'));
create function public.save_community_safeguarding(p_id uuid,p_body jsonb,p_version integer default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if not private.has_permission('safeguarding') then raise exception 'Safeguarding permission required.';end if;
  if (p_body->>'checked_on')::date>(now() at time zone 'Europe/London')::date then raise exception 'Check date cannot be in the future.';end if;
  if p_id is null then
    insert into public.community_safeguarding_checks(subject_name,role_name,check_level,checked_on,review_on,retention_review_on,status,policy_reference,policy_confirmed,recorded_by)
    values(trim(p_body->>'subject_name'),trim(p_body->>'role_name'),p_body->>'check_level',(p_body->>'checked_on')::date,(p_body->>'review_on')::date,(p_body->>'retention_review_on')::date,p_body->>'status',trim(p_body->>'policy_reference'),(p_body->>'policy_confirmed')::boolean,auth.uid()) returning id into v_id;
  else
    perform 1 from public.community_safeguarding_checks where id=p_id and version=p_version for update;
    if not found then raise exception 'Record changed. Reload before saving.';end if;
    update public.community_safeguarding_checks set subject_name=trim(p_body->>'subject_name'),role_name=trim(p_body->>'role_name'),check_level=p_body->>'check_level',checked_on=(p_body->>'checked_on')::date,review_on=(p_body->>'review_on')::date,retention_review_on=(p_body->>'retention_review_on')::date,status=p_body->>'status',policy_reference=trim(p_body->>'policy_reference'),policy_confirmed=(p_body->>'policy_confirmed')::boolean,recorded_by=auth.uid(),updated_at=now(),version=version+1 where id=p_id;
    v_id:=p_id;
  end if;
  perform private.operations_audit('community_safeguarding_checks',v_id,'SAVE');return v_id;
end;$$;
revoke all on function public.save_community_safeguarding(uuid,jsonb,integer) from public,anon;
grant execute on function public.save_community_safeguarding(uuid,jsonb,integer) to authenticated;
create function public.remove_community_safeguarding(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.has_permission('safeguarding') then raise exception 'Safeguarding permission required.';end if;
  delete from public.community_safeguarding_checks where id=p_id;
  if not found then raise exception 'Record no longer available.';end if;
  perform private.operations_audit('community_safeguarding_checks',p_id,'RETENTION_DELETE');
end;$$;
revoke all on function public.remove_community_safeguarding(uuid) from public,anon;
grant execute on function public.remove_community_safeguarding(uuid) to authenticated;

create function public.finance_member_by_email(p_email text) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare v_id uuid;
begin
  if not private.has_permission('finance') then raise exception 'Finance permission required.';end if;
  select u.id into v_id from auth.users u join public.profiles p on p.id=u.id
    where lower(u.email)=lower(trim(p_email)) and u.email_confirmed_at is not null and p.is_active;
  if v_id is null then raise exception 'No verified active portal account uses this email. Save without portal sharing or ask them to verify their account first.';end if;
  return v_id;
end;$$;
revoke all on function public.finance_member_by_email(text) from public,anon;
grant execute on function public.finance_member_by_email(text) to authenticated;
create function public.community_finance_overview() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.has_permission('finance') then raise exception 'Finance permission required.';end if;
  return jsonb_build_object(
    'invoices',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('paid_pence',coalesce((select sum(amount_pence) from public.community_payments where invoice_id=i.id),0)) order by i.created_at desc) from (select * from public.community_invoices order by created_at desc limit 100) i),'[]'::jsonb),
    'payments',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('reversed',exists(select 1 from public.community_payments r where r.reversal_of=p.id)) order by p.created_at desc) from (select * from public.community_payments order by created_at desc limit 100) p),'[]'::jsonb),
    'settings',(select to_jsonb(s) from public.community_finance_settings s where singleton),
    'campaigns',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'reference',reference,'status',status) order by created_at desc) from public.community_campaigns where status in ('published','closed')),'[]'::jsonb),
    'outstanding',coalesce((select sum(greatest(0,i.total_pence-coalesce((select sum(amount_pence) from public.community_payments where invoice_id=i.id),0))) from public.community_invoices i where status='issued'),0),
    'overdue',coalesce((select sum(greatest(0,i.total_pence-coalesce((select sum(amount_pence) from public.community_payments where invoice_id=i.id),0))) from public.community_invoices i where status='issued' and due_date<(now() at time zone 'Europe/London')::date),0),
    'received',coalesce((select sum(amount_pence) from public.community_payments where invoice_id is not null),0),
    'donations',coalesce((select sum(amount_pence) from public.community_payments where campaign_id is not null),0),
    'months',(select jsonb_agg(jsonb_build_object('key',to_char(m,'YYYY-MM'),'label',to_char(m,'Mon YY'),'total',coalesce((select sum(amount_pence) from public.community_payments where happened_on>=m::date and happened_on<(m+interval '1 month')::date),0)) order by m) from generate_series(date_trunc('month',now() at time zone 'Europe/London')-interval '5 months',date_trunc('month',now() at time zone 'Europe/London'),interval '1 month') m)
  );
end;$$;
revoke all on function public.community_finance_overview() from public,anon;
grant execute on function public.community_finance_overview() to authenticated;

create function public.my_community_invoices() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('paid_pence',coalesce((select sum(amount_pence) from public.community_payments where invoice_id=i.id),0)) order by i.created_at desc),'[]'::jsonb)
 from public.community_invoices i where member_id=auth.uid() and status<>'draft' and exists(select 1 from public.profiles where id=auth.uid() and is_active)
$$;
revoke all on function public.my_community_invoices() from public,anon;
grant execute on function public.my_community_invoices() to authenticated;
commit;
