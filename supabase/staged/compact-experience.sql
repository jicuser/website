-- Apply only after tests/compact-database.test.mjs passes against the deployment schema.
-- Presentation tables are separate from authentication and the payment ledger.
begin;
create table if not exists public.dashboard_templates (
  id uuid not null default gen_random_uuid() unique,
  scope text not null check (scope in ('staff','portal')),
  audience text not null check (audience in ('owner','staff','teacher','volunteer','member')),
  layout jsonb not null default '{"order":[],"hidden":[],"density":"compact"}',
  version integer not null default 1 check (version > 0),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(), primary key(scope,audience)
);
alter table public.dashboard_templates enable row level security;
revoke all on public.dashboard_templates from anon, authenticated;
grant select on public.dashboard_templates to authenticated;
drop policy if exists dashboard_templates_read on public.dashboard_templates;
create policy dashboard_templates_read on public.dashboard_templates for select to authenticated
using (exists(select 1 from public.profiles where id=(select auth.uid()) and is_active));
create table if not exists public.campaign_presentations (
  campaign_id uuid primary key references public.community_campaigns(id) on delete cascade,
  cover_image text not null default '' check(length(cover_image)<=2000),
  image_alt text not null default '' check(length(image_alt)<=240),
  outcome text not null default '' check(length(outcome)<=2000),
  completed_on date, featured boolean not null default false,
  version integer not null default 1 check(version>0),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.campaign_presentations enable row level security;
revoke all on public.campaign_presentations from anon, authenticated;
grant select on public.campaign_presentations to authenticated;
drop policy if exists campaign_presentations_staff_read on public.campaign_presentations;
create policy campaign_presentations_staff_read on public.campaign_presentations for select to authenticated using (private.has_permission('fundraising'));
create or replace function public.save_dashboard_template(p_scope text,p_audience text,p_layout jsonb,p_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare allowed text[]; k text; n integer; unique_n integer; bad boolean; clean jsonb; r public.dashboard_templates;
begin
  if (select auth.uid()) is null or not private.has_permission('users') then raise exception 'People and access permission required.'; end if;
  if p_scope is null or p_scope not in ('staff','portal') or p_audience is null or p_audience not in ('owner','staff','teacher','volunteer','member') then raise exception 'Choose a valid dashboard and audience.'; end if;
  if p_version is null or p_version<0 or jsonb_typeof(p_layout) is distinct from 'object' then raise exception 'Invalid dashboard settings.'; end if;
  if coalesce(p_layout->>'density','') not in ('compact','comfortable') then raise exception 'Choose a supported density.'; end if;
  allowed := case when p_scope='staff' then array['forms','certificates','visibility','content','menus','announcements','events','posters','team','projects','app_content','prayer','tv','livestream','hall','ramadan','finance','fundraising','users','safeguarding','audit'] else array['invoices','certificates','fundraising','family','learning','forms','fees','tasks','booking','donate'] end;
  foreach k in array array['order','hidden'] loop
    if jsonb_typeof(p_layout->k) is distinct from 'array' or jsonb_array_length(p_layout->k)>64 then raise exception 'Use an array of up to 64 widgets.'; end if;
    select count(*),count(distinct value),coalesce(bool_or(value is null or not(value=any(allowed))),false) into n,unique_n,bad from jsonb_array_elements_text(p_layout->k);
    if bad or n<>unique_n then raise exception 'Unknown or duplicate dashboard widgets.'; end if;
  end loop;
  clean:=jsonb_build_object('order',p_layout->'order','hidden',p_layout->'hidden','density',p_layout->>'density');
  if p_version=0 then
    insert into public.dashboard_templates(scope,audience,layout,updated_by) values(p_scope,p_audience,clean,auth.uid()) on conflict do nothing returning * into r;
  else
    update public.dashboard_templates set layout=clean,version=version+1,updated_by=auth.uid(),updated_at=now() where scope=p_scope and audience=p_audience and version=p_version returning * into r;
  end if;
  if r.id is null then raise exception 'This layout changed in another window. Reload before saving.'; end if;
  perform private.operations_audit('dashboard_templates',r.id,'UPDATE');
  return jsonb_build_object('version',r.version);
end; $$;
revoke all on function public.save_dashboard_template(text,text,jsonb,integer) from public, anon;
grant execute on function public.save_dashboard_template(text,text,jsonb,integer) to authenticated;
create or replace function public.save_campaign_presentation(p_id uuid,p_body jsonb,p_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cover text; alt_text text; result_text text; completion date; pin boolean; r public.campaign_presentations;
begin
  if (select auth.uid()) is null or not private.has_permission('fundraising') then raise exception 'Fundraising permission required.'; end if;
  if p_version is null or p_version<0 or jsonb_typeof(p_body) is distinct from 'object' then raise exception 'Invalid appeal display settings.'; end if;
  perform 1 from public.community_campaigns where id=p_id;
  if not found then raise exception 'Campaign unavailable.'; end if;
  cover:=trim(coalesce(p_body->>'cover_image','')); alt_text:=trim(coalesce(p_body->>'image_alt','')); result_text:=trim(coalesce(p_body->>'outcome',''));
  if length(cover)>2000 or (cover<>'' and (cover~'[[:space:]\\]' or not(cover ~ '^/[^/\\]' or cover ~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]\\]*)?$'))) then raise exception 'Use a secure image URL or an uploaded image.'; end if;
  if length(alt_text)>240 or (cover<>'' and alt_text='') then raise exception 'Add a short image description.'; end if;
  if length(result_text)>2000 then raise exception 'Keep the outcome under 2,000 characters.'; end if;
  if coalesce(p_body->>'completed_on','')<>'' then
    if p_body->>'completed_on' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Choose a valid completion date.'; end if;
    completion:=(p_body->>'completed_on')::date;
  end if;
  if jsonb_typeof(p_body->'featured') is distinct from 'boolean' then raise exception 'Choose whether to feature this appeal.'; end if;
  pin:=(p_body->>'featured')::boolean;
  if p_version=0 then
    insert into public.campaign_presentations(campaign_id,cover_image,image_alt,outcome,completed_on,featured,updated_by) values(p_id,cover,alt_text,result_text,completion,pin,auth.uid()) on conflict do nothing returning * into r;
  else
    update public.campaign_presentations set cover_image=cover,image_alt=alt_text,outcome=result_text,completed_on=completion,featured=pin,version=version+1,updated_by=auth.uid(),updated_at=now() where campaign_id=p_id and version=p_version returning * into r;
  end if;
  if r.campaign_id is null then raise exception 'This appeal display changed. Reload before saving.'; end if;
  perform private.operations_audit('campaign_presentations',p_id,'UPDATE');
  return jsonb_build_object('version',r.version);
end; $$;
revoke all on function public.save_campaign_presentation(uuid,jsonb,integer) from public, anon;
grant execute on function public.save_campaign_presentation(uuid,jsonb,integer) to authenticated;
-- Deliberately public, sanitized projection: never expose donor or account records.
create or replace function public.public_community_campaigns(p_slug text default null)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'slug',c.slug,'reference',c.reference,'title',c.title,'organiser',c.organiser,'story',c.story,'category',c.category,'target_pence',c.target_pence,'status',c.status,
    'raised_pence',coalesce((select sum(p.amount_pence) from public.community_payments p where p.campaign_id=c.id),0),
    'created_at',c.created_at,'cover_image',coalesce(v.cover_image,''),'image_alt',coalesce(v.image_alt,''),'outcome',coalesce(v.outcome,''),'completed_on',v.completed_on,'featured',coalesce(v.featured,false)
  ) order by c.created_at desc),'[]'::jsonb)
  from (select * from public.community_campaigns where status in ('published','closed') and (p_slug is null or slug=p_slug) order by created_at desc limit 100) c
  left join public.campaign_presentations v on v.campaign_id=c.id
$$;
revoke all on function public.public_community_campaigns(text) from public;
grant execute on function public.public_community_campaigns(text) to anon, authenticated;
commit;
