-- Linked website detail pages. Publication never depends on hiding a menu link.
begin;
create table public.content_pages (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'),
 title text not null check(length(trim(title)) between 1 and 160),
 body text not null default '' check(length(body)<=12000),
 image_url text not null default '' check(length(image_url)<=2000),
 schedule text not null default '' check(length(schedule)<=400),
 placement text not null check(placement in('/education','/education/courses','/madrassah','/youth','/youth/classes-skills','/worship','/services','/about','/projects')),
 kind text not null default 'page' check(kind in('page','course','activity','talk','event','announcement')),
 registration text not null default 'none' check(registration in('none','interest','application','registration')),
 form_id uuid references public.custom_forms,
 source_poster_id text unique check(source_poster_id ~ '^[a-zA-Z0-9_-]{1,64}$'),
 published boolean not null default false,
 created_by uuid not null default auth.uid() references public.profiles,
 updated_at timestamptz not null default clock_timestamp()
);
create index content_pages_placement on public.content_pages(placement) where published;
alter table public.content_pages enable row level security;
revoke all on public.content_pages from public,anon,authenticated;
grant all on public.content_pages to service_role;
grant select on public.content_pages to authenticated;
create policy content_pages_staff_read on public.content_pages for select to authenticated using(private.has_permission('content') or private.staff_custom_form(form_id));

create function public.save_content_page(p_page jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
 declare target uuid=(p_page->>'id')::uuid; previous public.content_pages; result public.content_pages; image text=coalesce(p_page->>'image_url',''); linked uuid=(p_page->>'form_id')::uuid;
 begin
 if not private.has_permission('content') then raise exception 'Website content permission required'; end if;
 if octet_length(p_page::text)>24000 then raise exception 'Page is too large'; end if;
 if image<>'' and (image ~ '[[:space:]\\]' or image !~ '^(/[^/]|https://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/|$))' or image ~ '^https://[^/]*@') then raise exception 'Use an HTTPS picture address or existing site image'; end if;
 if target is not null then
 select * into previous from public.content_pages where id=target for update;
 if previous.id is null then raise exception 'Page not found'; end if;
 if previous.slug is distinct from p_page->>'slug' then raise exception 'A saved page address cannot change'; end if;
 if previous.updated_at is distinct from (p_page->>'updated_at')::timestamptz then raise exception 'This page changed. Reload before saving'; end if;
 end if;
 if linked is not null and not private.staff_custom_form(linked) and (previous.id is null or linked is distinct from previous.form_id) then raise exception 'Form staff access required to link this form'; end if;
 if coalesce((p_page->>'published')::boolean,false) and coalesce(p_page->>'registration','none')<>'none' and (previous.id is null or not previous.published or previous.form_id is distinct from linked or previous.registration is distinct from p_page->>'registration') then
 if not exists(select 1 from public.custom_forms where id=linked and enabled and published_version is not null) then raise exception 'Publish and open a registration form before publishing this page'; end if;
 end if;
 insert into public.content_pages(id,slug,title,body,image_url,schedule,placement,kind,registration,form_id,source_poster_id,published,created_by)
 values(coalesce(target,gen_random_uuid()),p_page->>'slug',trim(p_page->>'title'),coalesce(p_page->>'body',''),image,coalesce(p_page->>'schedule',''),p_page->>'placement',coalesce(p_page->>'kind','page'),coalesce(p_page->>'registration','none'),linked,nullif(p_page->>'source_poster_id',''),coalesce((p_page->>'published')::boolean,false),auth.uid())
 on conflict(id) do update set title=excluded.title,body=excluded.body,image_url=excluded.image_url,schedule=excluded.schedule,placement=excluded.placement,kind=excluded.kind,registration=excluded.registration,form_id=excluded.form_id,published=excluded.published,updated_at=clock_timestamp()
 returning * into result;
 return to_jsonb(result);
 end; $$;

create function public.list_content_pages() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'slug',p.slug,'title',p.title,'image_url',p.image_url,'schedule',p.schedule,'placement',p.placement,'kind',p.kind,'registration',p.registration,'source_poster_id',p.source_poster_id,'form_slug',case when p.registration<>'none' then f.slug end,'accepting',coalesce(f.enabled and f.published_version is not null,false)) order by p.title),'[]'::jsonb)
 from public.content_pages p left join public.custom_forms f on f.id=p.form_id where p.published; $$;
create function public.get_content_page(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select value || jsonb_build_object('body',p.body) from jsonb_array_elements(public.list_content_pages()) value join public.content_pages p on p.slug=value->>'slug' where p.slug=p_slug and p.published; $$;

revoke all on function public.save_content_page(jsonb) from public,anon;
grant execute on function public.save_content_page(jsonb) to authenticated,service_role;
revoke all on function public.list_content_pages(),public.get_content_page(text) from public;
grant execute on function public.list_content_pages(),public.get_content_page(text) to anon,authenticated,service_role;
commit;
