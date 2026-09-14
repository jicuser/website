-- Link existing programme artwork to detail pages without replacing saved content.
begin;
set local lock_timeout='3s';
set local statement_timeout='15s';

do $$
declare catalogue jsonb; poster jsonb; section_path text; programme_kind text;
begin
  select content_value::jsonb into catalogue from public.page_content where content_key='programme_posters';
  if catalogue is null or jsonb_typeof(catalogue)<>'array' then return; end if;
  for poster in select value from jsonb_array_elements(catalogue) loop
    section_path := case poster->>'id'
      when 'open-quran-circle' then '/worship'
      when 'youth-islamic-studies' then '/youth/classes-skills'
      when 'seekers-gateway' then '/education/courses'
      when 'after-maghrib' then '/worship'
      when 'adhan-iqamah-course' then '/worship' end;
    if section_path is null or length(trim(coalesce(poster->>'title',''))) not between 1 and 160 then continue; end if;
    programme_kind := case when poster->>'id'='open-quran-circle' then 'activity'
      when poster->>'id'='after-maghrib' then 'event' else 'course' end;
    insert into public.site_pages(slug,title,body,image_url,placement,kind,schedule,source_poster_id,registration,published)
    values(poster->>'id',trim(poster->>'title'),
      concat_ws(E'\n\n',nullif(poster->>'subtitle',''),nullif(poster->>'detail',''),nullif(poster->>'alt','')),
      coalesce(poster->>'image',''),section_path,programme_kind,coalesce(poster->>'schedule',''),poster->>'id',
      case when poster->>'id'='youth-islamic-studies' then 'interest' else 'none' end,
      case when jsonb_typeof(poster->'groups')='array' then jsonb_array_length(poster->'groups')>0 else false end)
    on conflict do nothing;
  end loop;
end $$;
commit;
