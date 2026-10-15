-- Optional, reviewed talk archive. Apply after community_workspace, then configure a worker.
begin;
create table public.sermon_jobs (
 id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 1 and 160),
 speaker text not null default '' check(length(speaker)<=160), created_by uuid references public.profiles on delete set null,
 source_kind text not null check(source_kind in('upload','radio')), source_path text,
 capture_seconds integer not null check(capture_seconds between 60 and 3600),
 status text not null default 'queued' check(status in('queued','processing','review','failed')),
 attempts integer not null default 0, lease_id uuid, lease_until timestamptz, available_at timestamptz not null default now(),
 audio_path text, draft jsonb, last_error text, created_at timestamptz not null default now(),
 check(source_kind='radio' or source_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp3|m4a|wav|ogg|webm)$')
);
create index sermon_queue on public.sermon_jobs(status,available_at);
create table public.sermon_publications (
 id uuid primary key references public.sermon_jobs on delete cascade, title text not null, speaker text not null,
 summary text not null, transcript jsonb not null, quotes jsonb not null default '[]', audio_path text not null,
 reviewed_by uuid references public.profiles on delete set null, published_at timestamptz not null default now()
);
alter table public.sermon_jobs enable row level security;
alter table public.sermon_publications enable row level security;
revoke all on public.sermon_jobs,public.sermon_publications from public,anon,authenticated;
grant select on public.sermon_jobs to authenticated;
grant select(id,title,speaker,summary,transcript,quotes,audio_path,published_at) on public.sermon_publications to anon,authenticated;
grant all on public.sermon_jobs,public.sermon_publications to service_role;
create policy sermon_owner_read on public.sermon_jobs for select to authenticated using(private.workspace_owner());
create policy sermon_public_read on public.sermon_publications for select to anon,authenticated using(true);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('sermon-recordings','sermon-recordings',false,25165824,array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/ogg','audio/webm','video/webm']) on conflict(id) do nothing;
create policy sermon_audio_owner_read on storage.objects for select to authenticated using(bucket_id='sermon-recordings' and private.workspace_owner());
create policy sermon_audio_owner_upload on storage.objects for insert to authenticated with check(
 bucket_id='sermon-recordings' and private.workspace_owner() and name ~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}\.(mp3|m4a|wav|ogg|webm)$'));
create policy sermon_audio_public_read on storage.objects for select to anon,authenticated using(
 bucket_id='sermon-recordings' and exists(select 1 from public.sermon_publications p where p.audio_path=name));

create function public.queue_sermon(p_title text,p_speaker text,p_source_kind text,p_source_path text default null,p_capture_seconds integer default 1800)
 returns uuid language plpgsql security definer set search_path='' as $$
declare job uuid;
begin
 if not private.workspace_owner() then raise exception 'Owner access required'; end if;
 if p_source_kind='upload' and (p_source_path is null or p_source_path !~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}\.(mp3|m4a|wav|ogg|webm)$') or not exists(select 1 from storage.objects where bucket_id='sermon-recordings' and name=p_source_path)) then raise exception 'Upload an owned recording first'; end if;
 if (select count(*) from public.sermon_jobs where status in('queued','processing'))>=20 then raise exception 'Recording queue is full'; end if;
 insert into public.sermon_jobs(title,speaker,created_by,source_kind,source_path,capture_seconds)
 values(trim(p_title),trim(p_speaker),auth.uid(),p_source_kind,case when p_source_kind='upload' then p_source_path end,p_capture_seconds) returning id into job;
 return job;
end; $$;
create function public.claim_sermon_job() returns setof public.sermon_jobs language sql security invoker set search_path='' as $$
 with expired as (update public.sermon_jobs set status='failed',lease_id=null,lease_until=null,last_error='worker_lease_expired' where status='processing' and lease_until<now() and attempts>=3 returning id)
 update public.sermon_jobs set status='processing',attempts=attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '2 hours'
 where id=(select id from public.sermon_jobs where ((status='queued' and available_at<=now()) or (status='processing' and lease_until<now())) and attempts<3 order by created_at for update skip locked limit 1) returning *;
$$;
create function public.save_sermon_audio(p_id uuid,p_lease_id uuid,p_path text) returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.sermon_jobs set audio_path=p_path where id=p_id and lease_id=p_lease_id and status='processing' and lease_until>now();
 if not found then raise exception 'Recording lease expired'; end if;
end; $$;
create function public.finish_sermon_job(p_id uuid,p_lease_id uuid,p_draft jsonb default null,p_error text default null) returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.sermon_jobs set status=case when p_draft is not null then 'review' when attempts>=3 then 'failed' else 'queued' end,
 draft=p_draft,last_error=left(p_error,120),lease_until=null,lease_id=null,available_at=now()+make_interval(secs=>60*power(2,attempts)::integer)
 where id=p_id and lease_id=p_lease_id and status='processing' and lease_until>now();
 if not found then raise exception 'Recording lease expired'; end if;
end; $$;
create function public.retry_sermon(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.workspace_owner() then raise exception 'Owner access required'; end if;
 update public.sermon_jobs set status='queued',attempts=0,available_at=now(),last_error=null where id=p_id and status='failed';
 if not found then raise exception 'Recording is not ready for retry'; end if;
end; $$;
create function public.publish_sermon(p_id uuid,p_title text,p_speaker text,p_summary text,p_transcript jsonb,p_quotes jsonb,p_acknowledged boolean)
 returns void language plpgsql security definer set search_path='' as $$
declare job public.sermon_jobs; segment jsonb; quote jsonb; idx integer;
begin
 if not private.workspace_owner() then raise exception 'Owner access required'; end if;
 if p_acknowledged is distinct from true then raise exception 'Listen and review before publishing'; end if;
 select * into job from public.sermon_jobs where id=p_id for update;
 if job.id is null or job.status<>'review' or job.audio_path is null then raise exception 'Recording is not ready for review'; end if;
 if p_title is null or p_speaker is null or p_summary is null or length(trim(p_title)) not between 1 and 160 or length(p_speaker)>160 or length(trim(p_summary)) not between 1 and 10000 then raise exception 'Invalid publication text'; end if;
 if jsonb_typeof(p_transcript) is distinct from 'array' or jsonb_array_length(p_transcript) not between 1 and 5000 or length(p_transcript::text)>600000 then raise exception 'Invalid transcript'; end if;
 for segment in select * from jsonb_array_elements(p_transcript) loop
  if jsonb_typeof(segment->'text') is distinct from 'string' or length(segment->>'text') not between 1 and 6000 or jsonb_typeof(segment->'start') is distinct from 'number' or jsonb_typeof(segment->'end') is distinct from 'number' or (segment->>'start')::numeric<0 or (segment->>'end')::numeric<(segment->>'start')::numeric or (segment->>'end')::numeric>3605 then raise exception 'Invalid transcript segment'; end if;
 end loop;
 if jsonb_typeof(p_quotes) is distinct from 'array' or jsonb_array_length(p_quotes)>12 then raise exception 'Invalid quotes'; end if;
 for quote in select * from jsonb_array_elements(p_quotes) loop
  if jsonb_typeof(quote->'text') is distinct from 'string' or jsonb_typeof(quote->'kind') is distinct from 'string' or coalesce(quote->>'segment_index','') !~ '^[0-9]+$' or length(trim(quote->>'text')) not between 1 and 400 or quote->>'kind' not in('speaker','quran','hadith','other') then raise exception 'Invalid quote'; end if;
  idx=(quote->>'segment_index')::integer;
  if idx>=jsonb_array_length(p_transcript) or position((quote->>'text') in (p_transcript->idx->>'text'))=0 then raise exception 'Quote must match reviewed transcript'; end if;
  if quote->>'kind'<>'speaker' and (length(trim(coalesce(quote->>'reference','')))<3 or coalesce(quote->>'source_url','') !~ '^https://[^/@[:space:]]+\.[^/@[:space:]]+(/[^[:space:]]*)?$') then raise exception 'Verify reference and source before publishing religious quotations'; end if;
 end loop;
 insert into public.sermon_publications(id,title,speaker,summary,transcript,quotes,audio_path,reviewed_by)
 values(p_id,trim(p_title),trim(p_speaker),trim(p_summary),p_transcript,p_quotes,job.audio_path,auth.uid())
 on conflict(id) do update set title=excluded.title,speaker=excluded.speaker,summary=excluded.summary,transcript=excluded.transcript,quotes=excluded.quotes,audio_path=excluded.audio_path,reviewed_by=excluded.reviewed_by,published_at=now();
end; $$;
create function public.withdraw_sermon(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin if not private.workspace_owner() then raise exception 'Owner access required'; end if;
 delete from public.sermon_publications where id=p_id; end; $$;
revoke all on function public.queue_sermon(text,text,text,text,integer),public.retry_sermon(uuid),public.publish_sermon(uuid,text,text,text,jsonb,jsonb,boolean),public.withdraw_sermon(uuid),public.claim_sermon_job(),public.save_sermon_audio(uuid,uuid,text),public.finish_sermon_job(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.queue_sermon(text,text,text,text,integer),public.retry_sermon(uuid),public.publish_sermon(uuid,text,text,text,jsonb,jsonb,boolean),public.withdraw_sermon(uuid) to authenticated;
grant execute on function public.claim_sermon_job(),public.save_sermon_audio(uuid,uuid,text),public.finish_sermon_job(uuid,uuid,jsonb,text) to service_role;
commit;
