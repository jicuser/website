-- Initial content transcribed from the current approved programme posters.
-- Preserve later staff edits. An expression of interest is not an admission offer.
begin;
do $$
declare
  owner_id uuid;
  form_id uuid;
  definition public.custom_forms;
  questions jsonb := '{"fields":[
    {"id":"name","type":"text","label":"Your name (parent or carer where appropriate)","required":true},
    {"id":"email","type":"email","label":"Email address","required":true},
    {"id":"phone","type":"phone","label":"Phone number","required":false},
    {"id":"message","type":"textarea","label":"Questions or additional information","required":false}
  ]}'::jsonb;
begin
  if (select count(*) from public.profiles where is_owner and is_active) <> 1 then
    raise exception 'Choose the responsible owner before preparing these programme pages';
  end if;
  select id into owner_id from public.profiles where is_owner and is_active;
  insert into public.custom_forms
    (slug,title,description,schema,published_version,enabled,task_title,due_hours,created_by)
  values
    ('youth-islamic-studies-interest','Youth Islamic Studies — register interest',
     'Leave your contact details so the centre can discuss Youth Islamic Studies with you. This is an expression of interest and does not confirm a place. Please do not include sensitive personal information.',
     questions,1,true,'Review Youth Islamic Studies interest',48,owner_id)
  on conflict(slug) do nothing returning id into form_id;
  if form_id is not null then
    select * into definition from public.custom_forms where id=form_id;
    insert into public.custom_form_versions(form_id,version,title,description,schema,published_by)
    values(form_id,1,definition.title,definition.description,questions,owner_id);
    insert into public.custom_form_staff(form_id,user_id,role)
    values(form_id,owner_id,'responsible');
  else
    select id into form_id from public.custom_forms where slug='youth-islamic-studies-interest';
  end if;

  insert into public.content_pages
    (slug,title,body,image_url,schedule,placement,kind,registration,form_id,source_poster_id,published,created_by)
  values
    ('youth-islamic-studies','Youth Islamic Studies',
     E'Youth Islamic Studies for boys at Jamatia Islamic Centre.\n\nThe advertised programme covers six terms over two years, with classes on Monday, Tuesday and Thursday from 5pm to 6:30pm. Subjects include Fiqh, Aqida, Hadith, Qur’an, du’as, Arabic and Islamic character.\n\nAdvertised start: September 2026. The poster lists £300 per year (£100 per term). Contact the centre for current availability.\n\nThe poster asks families to register their interest. The form below sends your contact details to the centre; it does not confirm a place.',
     '/posters/youth-islamic-studies.jpg','Monday, Tuesday & Thursday · 5pm–6:30pm',
     '/youth/classes-skills','course','interest',form_id,'youth-islamic-studies',
     exists(select 1 from public.custom_forms f where f.id=form_id and f.published_version is not null),owner_id),
    ('seekers-gateway','The Seeker’s Gateway',
     E'Foundations of Islamic scholarship at Jamatia Islamic Centre, supervised by Shaykh Qamar Ilyas. The poster welcomes males and females.\n\nSubjects include Arabic, Fiqh, Aqida, Tajwid, Sirah, Tafsir, Hadith, Usul, Logic and Apologetics.\n\nAdvertised start: September 2026. The poster lists £100 per term, with three terms per year.\n\nFor current availability and joining information, contact 07484127444 between 11am and 12:15pm. The poster does not specify an online application requirement.',
     '/posters/seekers-gateway.jpg','Advertised start: September 2026',
     '/education/courses','course','none',null,'seekers-gateway',true,owner_id),
    ('open-quran-circle','Open Qur’an Circle',
     E'Join the Open Qur’an Circle at Woodlands Road Masjid, Jamatia Islamic Centre.\n\nThe poster advertises Fridays at 6:30pm and welcomes everyone. No online registration requirement is stated.',
     '/posters/open-quran-circle.png','Fridays · 6:30pm',
     '/worship','activity','none',null,'open-quran-circle',true,owner_id),
    ('after-maghrib','After Maghrib',
     E'Gatherings after Maghrib at Jamatia Islamic Centre with Shaykh Muhammad Yaseen.\n\nMonday: Sirah.\nWednesday: Aqida.\nFriday: Majlis of Dhikr.\n\nLocation: 179–183 Woodlands Road, Birmingham B11 4ER. Refer to the prayer timetable for Maghrib time. The poster does not specify an online registration requirement.',
     '/posters/after-maghrib.jpg','Monday, Wednesday & Friday · after Maghrib',
     '/worship','activity','none',null,'after-maghrib',true,owner_id)
  on conflict(source_poster_id) do nothing;
end;
$$;
commit;
