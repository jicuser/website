-- Draft appearance is staff-only. Published appearance reuses the existing public content cache.
create table if not exists public.website_design (
  id boolean primary key default true check (id),
  draft jsonb not null default '{"palette":"navy-gold","layout":"compact","pages":{},"icons":{}}',
  published jsonb not null default '{"palette":"navy-gold","layout":"compact","pages":{},"icons":{}}',
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.website_design enable row level security;
revoke all on public.website_design from anon, authenticated;
grant select on public.website_design to authenticated;
create policy website_design_staff_read on public.website_design for select to authenticated using (private.has_permission('content'));

create or replace function private.valid_website_design(v jsonb) returns boolean
language plpgsql immutable set search_path=pg_catalog as $$
declare k text; item jsonb;
begin
  if jsonb_typeof(v) is distinct from 'object' or coalesce(v->>'palette','') not in ('navy-gold','forest','slate') or coalesce(v->>'layout','') not in ('compact','list') or jsonb_typeof(v->'pages') is distinct from 'object' or jsonb_typeof(v->'icons') is distinct from 'object' then return false; end if;
  if exists(select 1 from jsonb_object_keys(v) x where x not in ('palette','layout','pages','icons')) then return false;end if;
  for k,item in select * from jsonb_each(v->'pages') loop
    if k not in ('/','/services','/worship','/education','/events') or jsonb_typeof(item) is distinct from 'object' then return false; end if;
    if exists(select 1 from jsonb_object_keys(item) x where x not in ('palette','layout')) then return false;end if;
    if item ? 'palette' and coalesce(item->>'palette','') not in ('navy-gold','forest','slate') then return false; end if;
    if item ? 'layout' and coalesce(item->>'layout','') not in ('compact','list') then return false; end if;
  end loop;
  for k,item in select * from jsonb_each(v->'icons') loop
    if k not in ('support','nikah','funerals','learning','careers','youth','community','hall') or (item#>>'{}') not in ('support','heart','graduation','book','sparkles','users','calendar') or jsonb_typeof(item) is distinct from 'string' then return false; end if;
  end loop;
  return true;
exception when others then return false;
end $$;

create or replace function private.valid_guided_help(v jsonb) returns boolean
language plpgsql immutable set search_path=pg_catalog as $$
declare node jsonb; answer jsonb; n integer; reached integer; loops boolean; ids text[];
begin
  if jsonb_typeof(v) is distinct from 'object' or jsonb_typeof(v->'questions') is distinct from 'array' or jsonb_typeof(v->'results') is distinct from 'array' then return false;end if;
  if jsonb_array_length(v->'questions') not between 1 and 10 or jsonb_array_length(v->'results') not between 1 and 16 or (v ? 'enabled' and jsonb_typeof(v->'enabled') is distinct from 'boolean') then return false;end if;
  select array_agg(x->>'id'),count(*) into ids,n from jsonb_array_elements((v->'questions')||(v->'results')) x;
  if cardinality(array(select distinct unnest(ids)))<>n then return false;end if;
  for node in select * from jsonb_array_elements((v->'questions')||(v->'results')) loop
    if coalesce(node->>'id','') !~ '^[a-z][a-z0-9-]{0,39}$' or jsonb_typeof(node->'title') is distinct from 'string' or length(trim(node->>'title')) not between 1 and 160 then return false;end if;
  end loop;
  if not exists(select 1 from jsonb_array_elements(v->'questions') q where q->>'id'=v->>'start') then return false;end if;
  for node in select * from jsonb_array_elements(v->'questions') loop
    if jsonb_typeof(node->'choices') is distinct from 'array' or jsonb_array_length(node->'choices') not between 2 and 6 then return false;end if;
    if (select count(distinct x->>'id') from jsonb_array_elements(node->'choices') x)<>jsonb_array_length(node->'choices') then return false;end if;
    for answer in select * from jsonb_array_elements(node->'choices') loop
      if coalesce(answer->>'id','') !~ '^[a-z][a-z0-9-]{0,63}$' or jsonb_typeof(answer->'label') is distinct from 'string' or length(trim(answer->>'label')) not between 1 and 120 or not coalesce((answer->>'next')=any(ids),false) then return false;end if;
    end loop;
  end loop;
  for node in select * from jsonb_array_elements(v->'results') loop
    if jsonb_typeof(node->'body') is distinct from 'string' or length(node->>'body')>2000 or jsonb_typeof(node->'steps') is distinct from 'array' or jsonb_array_length(node->'steps')>8 or jsonb_typeof(node->'resources') is distinct from 'array' then return false;end if;
    if exists(select 1 from jsonb_array_elements(node->'steps') x where jsonb_typeof(x)<>'string' or length(x#>>'{}')>300) then return false;end if;
    if exists(select 1 from jsonb_array_elements(node->'resources') x where jsonb_typeof(x)<>'string' or x#>>'{}' not in ('living','health','safety','cv','interview','skills','careers','adult','child','enrol','funeral','nikah','volunteer')) then return false;end if;
    if trim(node->>'body')='' and jsonb_array_length(node->'steps')=0 and jsonb_array_length(node->'resources')=0 then return false;end if;
  end loop;
  -- Transitive closure visits at most 26² pairs, even for a densely linked invalid graph.
  with recursive edges(src,dst) as (
    select q->>'id', a->>'next' from jsonb_array_elements(v->'questions') q
      cross join lateral jsonb_array_elements(q->'choices') a
  ), walk(src,dst) as (
    select * from edges
    union
    select w.src,e.dst from walk w join edges e on e.src=w.dst
  ) select
    (select count(*) from (select v->>'start' as id union select dst from walk where src=v->>'start') reachable),
    exists(select 1 from walk where src=dst)
    into reached,loops;
  return reached=n and not loops;
exception when others then return false;
end $$;

create or replace function public.save_website_design(p_design jsonb,p_expected_revision bigint,p_publish boolean default false) returns bigint
language plpgsql security definer set search_path=pg_catalog,public as $$
declare current_revision bigint;
begin
  if not private.has_permission('content') then raise exception 'Website content access required.';end if;
  if not private.valid_website_design(p_design) then raise exception 'Choose supported website colours, layouts and icons.';end if;
  insert into public.website_design(id) values(true) on conflict do nothing;
  select revision into current_revision from public.website_design where id=true for update;
  if p_expected_revision is distinct from current_revision then raise exception 'Another editor changed these settings. Your draft is retained; reload the latest version before saving.' using errcode='40001';end if;
  update public.website_design set draft=p_design,published=case when p_publish then p_design else published end,revision=revision+1,updated_at=now(),updated_by=auth.uid() where id=true;
  if p_publish then
    insert into public.page_content(content_key,content_value,content_type) values('site_design',p_design::text,'json') on conflict(content_key) do update set content_value=excluded.content_value,content_type='json';
  end if;
  return current_revision+1;
end $$;
revoke all on function public.save_website_design(jsonb,bigint,boolean) from public,anon;
grant execute on function public.save_website_design(jsonb,bigint,boolean) to authenticated;

-- Page publication uses an atomic compare-and-set; every writer still passes the validation trigger.
create or replace function private.validate_website_content() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
declare v jsonb; item jsonb;
begin
  if new.content_key='site_design' and not private.valid_website_design(new.content_value::jsonb) then raise exception 'Invalid website appearance settings.';end if;
  if new.content_key like 'page:/%' and new.content_type='json' then
    v:=new.content_value::jsonb;
    if v ? 'guidedJourney' and not private.valid_guided_help(v->'guidedJourney') then raise exception 'Guided help has an invalid, unreachable or looping branch.';end if;
    if v ? 'guidance' then
      if jsonb_typeof(v->'guidance') is distinct from 'array' or jsonb_array_length(v->'guidance')>8 then raise exception 'Use at most eight guidance questions.';end if;
      for item in select * from jsonb_array_elements(v->'guidance') loop
        if coalesce(item->>'enabled','true')<>'false' and (length(trim(coalesce(item->>'question',''))) not between 1 and 160 or length(trim(coalesce(item->>'answer',''))) not between 1 and 2000) then raise exception 'Add a short question and helpful answer.';end if;
      end loop;
    end if;
  end if;
  return new;
end $$;
create trigger validate_website_content before insert or update on public.page_content for each row execute function private.validate_website_content();
create or replace function public.save_website_page(p_path text,p_content text,p_expected text default null) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare current_value text; v jsonb;
begin
  if not private.has_permission('content') then raise exception 'Website content access required.';end if;
  if coalesce(p_path,'') !~ '^/([a-z0-9-]+/?)*$' or length(p_path)>200 or coalesce(length(p_content),0) not between 2 and 200000 then raise exception 'Invalid page content.';end if;
  v:=p_content::jsonb;
  if jsonb_typeof(v) is distinct from 'object' then raise exception 'Invalid page content.';end if;
  if coalesce(v->>'image','')<>'' and coalesce(v->>'image','') !~ '^https://' then raise exception 'Use an HTTPS image URL.';end if;
  perform pg_advisory_xact_lock(hashtextextended('page:'||p_path,0));
  select content_value into current_value from public.page_content where content_key='page:'||p_path for update;
  if current_value is distinct from p_expected then raise exception 'Another editor changed this page. Your edits are retained; reload the latest page before saving.' using errcode='40001';end if;
  insert into public.page_content(content_key,content_value,content_type,page) values('page:'||p_path,p_content,'json',p_path) on conflict(content_key) do update set content_value=excluded.content_value,content_type='json';
end $$;
revoke all on function public.save_website_page(text,text,text) from public,anon;
grant execute on function public.save_website_page(text,text,text) to authenticated;
