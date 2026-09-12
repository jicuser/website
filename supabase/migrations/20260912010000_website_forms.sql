-- One private inbox. Visitors submit through the validated Edge Function only.
create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact', 'madrassah', 'itikaaf')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 24000),
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);
create index form_submissions_inbox on public.form_submissions (status, created_at desc);
alter table public.form_submissions enable row level security;
revoke all on public.form_submissions from public, anon, authenticated;
grant select on public.form_submissions to authenticated;
grant update (status) on public.form_submissions to authenticated;
grant all on public.form_submissions to service_role;

create policy "Staff read assigned forms" on public.form_submissions for select to authenticated
using (private.has_role(array['admin','super_admin'])
  or (kind = 'madrassah' and private.has_role(array['teacher']))
  or (kind = 'itikaaf' and private.has_role(array['events_manager'])));
create policy "Staff complete assigned forms" on public.form_submissions for update to authenticated
using (private.has_role(array['admin','super_admin'])
  or (kind = 'madrassah' and private.has_role(array['teacher']))
  or (kind = 'itikaaf' and private.has_role(array['events_manager'])))
with check (private.has_role(array['admin','super_admin'])
  or (kind = 'madrassah' and private.has_role(array['teacher']))
  or (kind = 'itikaaf' and private.has_role(array['events_manager'])));

-- Atomic rate buckets stay outside the public API and expire after one day.
create table private.form_rate_limits (
  source_key text not null,
  bucket timestamptz not null,
  hits integer not null,
  primary key (source_key, bucket)
);
create index form_rate_limits_expiry on private.form_rate_limits (bucket);
revoke all on private.form_rate_limits from public, anon, authenticated;
create function public.submit_website_form(p_kind text, p_payload jsonb, p_source_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  requests integer;
  window_start timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
begin
  if p_source_key is null or p_source_key !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_source';
  end if;
  delete from private.form_rate_limits where bucket < now() - interval '1 day';
  insert into private.form_rate_limits (source_key, bucket, hits)
    values (p_source_key, window_start, 1)
    on conflict (source_key, bucket) do update set hits = private.form_rate_limits.hits + 1
    returning hits into requests;
  if requests > 10 then raise exception 'submission_rate_limit'; end if;
  insert into public.form_submissions (kind, payload) values (p_kind, p_payload);
end;
$$;
revoke all on function public.submit_website_form(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_website_form(text, jsonb, text) to service_role;
