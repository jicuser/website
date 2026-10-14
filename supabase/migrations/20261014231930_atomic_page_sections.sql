-- Save a page's editable content blocks as one permission-checked transaction.
-- The existing table, RLS policies and audit trigger remain the authority.
begin;

revoke truncate, references, trigger on public.page_sections from public, anon, authenticated;

create or replace function public.touch_page_sections_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create or replace function public.save_page_sections(
  p_page_path text,
  p_expected jsonb,
  p_sections jsonb
) returns jsonb
language plpgsql security invoker
set search_path = ''
set lock_timeout = '5s'
as $$
declare
  item jsonb;
  image_value jsonb;
  image_address text;
  target uuid;
  destination text;
  section_title text;
  section_body text;
  background text;
  gallery jsonb;
  visible boolean;
  position integer;
  source_position integer := 0;
  previous public.page_sections;
  expected_count integer;
  saved_count integer;
  result jsonb;
begin
  if auth.uid() is null or not private.has_permission('content') then
    raise exception 'Content permission required';
  end if;

  if p_page_path is null or length(p_page_path) > 200 or
     p_page_path !~ '^(/|/[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*)$' then
    raise exception 'Choose a valid website page';
  end if;
  if jsonb_typeof(p_expected) is distinct from 'array' or
     jsonb_typeof(p_sections) is distinct from 'array' then
    raise exception 'Invalid content block list';
  end if;
  if jsonb_array_length(p_expected) > 60 or jsonb_array_length(p_sections) > 60 or
     octet_length(p_expected::text) > 24000 or octet_length(p_sections::text) > 2000000 then
    raise exception 'Too many content blocks or too much content';
  end if;

  for item in select value from jsonb_array_elements(p_expected) loop
    if jsonb_typeof(item) is distinct from 'object' or
       jsonb_typeof(item->'id') is distinct from 'string' or
       jsonb_typeof(item->'updated_at') is distinct from 'string' then
      raise exception 'Invalid saved content block version';
    end if;
    -- Parse before obtaining the write lock. Invalid UUIDs/dates cannot match.
    perform (item->>'id')::uuid, (item->>'updated_at')::timestamptz;
  end loop;
  if (select count(distinct (value->>'id')::uuid) from jsonb_array_elements(p_expected))
     <> jsonb_array_length(p_expected) then
    raise exception 'Duplicate saved content block';
  end if;

  for item in select value from jsonb_array_elements(p_sections) loop
    if jsonb_typeof(item) is distinct from 'object' then
      raise exception 'Invalid content block';
    end if;
    if item->'id' is not null and item->'id' <> 'null'::jsonb then
      if jsonb_typeof(item->'id') is distinct from 'string' then
        raise exception 'Invalid content block ID';
      end if;
      perform (item->>'id')::uuid;
    end if;
    destination := coalesce(item->>'page_path', p_page_path);
    if length(destination) > 200 or
       destination !~ '^(/|/[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*)$' then
      raise exception 'Choose a valid destination page';
    end if;
    if jsonb_typeof(item->'title') is distinct from 'string' or
       length(trim(item->>'title')) not between 1 and 160 then
      raise exception 'Give each content block a heading of 1–160 characters';
    end if;
    if item ? 'body' and jsonb_typeof(item->'body') is distinct from 'string' then
      raise exception 'Content block information must be text';
    end if;
    if length(coalesce(item->>'body', '')) > 12000 then
      raise exception 'Content block information is too long';
    end if;
    if item ? 'published' and jsonb_typeof(item->'published') is distinct from 'boolean' then
      raise exception 'Choose shown or hidden for each content block';
    end if;
    if item ? 'background_image_url' and
       jsonb_typeof(item->'background_image_url') is distinct from 'string' then
      raise exception 'Invalid background image';
    end if;
    gallery := coalesce(item->'image_urls', '[]'::jsonb);
    if jsonb_typeof(gallery) is distinct from 'array' then
      raise exception 'Invalid gallery images';
    end if;
    if jsonb_array_length(gallery) > 12 then
      raise exception 'Use no more than 12 gallery images per content block';
    end if;
    for image_value in
      select value from jsonb_array_elements(
        gallery || jsonb_build_array(coalesce(item->>'background_image_url', ''))
      )
    loop
      if jsonb_typeof(image_value) is distinct from 'string' then
        raise exception 'Invalid image address';
      end if;
      image_address := image_value #>> '{}';
      if length(image_address) > 2000 or
         (image_address <> '' and (
           image_address ~ '[[:space:]\\"<>]' or
           not (image_address ~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$' or
                image_address ~ '^/[^/].*$')
         )) then
        raise exception 'Use an HTTPS or site image address';
      end if;
    end loop;
  end loop;
  if (select count(*) from jsonb_array_elements(p_sections) where value->>'id' is not null)
     <> (select count(distinct (value->>'id')::uuid) from jsonb_array_elements(p_sections)) then
    raise exception 'Duplicate content block';
  end if;

  -- A small, low-volume content table: this serializes saves and also protects
  -- against inserts/deletes from older clients that do not use this RPC.
  -- Public SELECTs continue normally. No elevated privileges or RLS bypass.
  lock table public.page_sections in share row exclusive mode;

  select count(*) into expected_count from public.page_sections where page_path = p_page_path;
  if expected_count <> jsonb_array_length(p_expected) or exists (
    select 1 from jsonb_array_elements(p_expected) e
    left join public.page_sections s on s.id = (e.value->>'id')::uuid and s.page_path = p_page_path
    where s.id is null or s.updated_at is distinct from (e.value->>'updated_at')::timestamptz
  ) then
    raise exception 'These content blocks changed in another session. Reload before saving.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_sections) d
    where d.value->>'id' is not null and not exists (
      select 1 from public.page_sections s
      where s.id = (d.value->>'id')::uuid and s.page_path = p_page_path
    )
  ) then
    raise exception 'A content block does not belong to this page';
  end if;

  if exists (
    select 1 from public.page_sections s where s.page_path = p_page_path and not exists (
      select 1 from jsonb_array_elements(p_sections) d where (d.value->>'id')::uuid = s.id
    )
  ) and not private.has_permission('delete_content') then
    raise exception 'Delete content permission required. Hide the content block instead.';
  end if;

  delete from public.page_sections s where s.page_path = p_page_path and not exists (
    select 1 from jsonb_array_elements(p_sections) d where (d.value->>'id')::uuid = s.id
  );

  for item in select value from jsonb_array_elements(p_sections) loop
    target := (item->>'id')::uuid;
    destination := coalesce(item->>'page_path', p_page_path);
    section_title := trim(item->>'title');
    section_body := coalesce(item->>'body', '');
    background := coalesce(item->>'background_image_url', '');
    gallery := coalesce(item->'image_urls', '[]'::jsonb);
    -- New blocks are hidden unless the editor explicitly chooses to show them.
    visible := coalesce((item->>'published')::boolean, false);
    if destination = p_page_path then
      position := source_position;
      source_position := source_position + 1;
    else
      if (select count(*) from public.page_sections where page_path = destination) >= 60 then
        raise exception 'The destination already has 60 content blocks';
      end if;
      select coalesce(max(sort_order), -1) into position
      from public.page_sections where page_path = destination;
      if position >= 2147483647 then
        raise exception 'The destination order needs to be reset before moving content';
      end if;
      position := position + 1;
    end if;

    if target is null then
      target := gen_random_uuid();
      insert into public.page_sections (
        id, page_path, section_key, title, body, background_image_url, image_urls, sort_order, published
      ) values (
        target, destination, 'block-' || target::text, section_title, section_body,
        background, gallery, position, visible
      );
    else
      select * into previous from public.page_sections where id = target;
      if destination <> p_page_path and exists (
        select 1 from public.page_sections
        where page_path = destination and section_key = previous.section_key and id <> target
      ) then
        raise exception 'A content block with this address already exists on the destination page';
      end if;
      update public.page_sections set
        page_path = destination, title = section_title, body = section_body,
        background_image_url = background, image_urls = gallery, sort_order = position, published = visible
      where id = target and
        (page_path, title, body, background_image_url, image_urls, sort_order, published)
        is distinct from
        (destination, section_title, section_body, background, gallery, position, visible);
    end if;
  end loop;

  select count(*), coalesce(jsonb_agg(to_jsonb(s) order by s.sort_order, s.id), '[]'::jsonb)
  into saved_count, result from public.page_sections s where s.page_path = p_page_path;
  if saved_count <> source_position then
    raise exception 'Not all content blocks were saved';
  end if;
  return result;
end;
$$;

revoke all on function public.save_page_sections(text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_page_sections(text, jsonb, jsonb) to authenticated, service_role;

commit;
