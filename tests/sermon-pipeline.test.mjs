import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { publicAddress, checkedHttps, validateTranscript, validateSummary, openAI, processJob, download } from '../services/sermon-worker/pipeline.mjs';
import { quoteCardSvg, safeQuoteSource } from '../src/lib/quoteCard.js';
const transcript = [{ start: 0, end: 8, text: 'Remember your neighbours and help them.' }];

test('media download rejects internal addresses and insecure URLs', async () => {
  for (const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','100.64.0.1','172.16.0.1','192.168.1.1','::1','fe80::1','fc00::1','::ffff:127.0.0.1']) assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress('8.8.8.8'), true); assert.equal(publicAddress('2606:4700:4700::1111'), true);
  for (const url of ['http://example.org','https://user:pass@example.org','https://example.org:8443']) assert.throws(() => checkedHttps(url));
  await assert.rejects(() => download('https://example.org/audio', '/tmp/never-created-sermon', { resolver: async () => [{address:'127.0.0.1',family:4}] }), /non_public/);
});
test('model output requires valid timings and verbatim quotes without automatic references', () => {
  assert.deepEqual(validateTranscript({ segments: transcript }), transcript);
  assert.throws(() => validateTranscript({ segments: [{start:5,end:1,text:'No'}] }));
  assert.throws(() => validateSummary({ summary: 'Summary', quotes: [{text:'Invented words', segment_index:0,kind:'hadith'}] }, transcript), /quote_not_in_transcript/);
  const result = validateSummary({ summary:'A reminder about neighbours.', quotes:[{text:'help them.',segment_index:0,kind:'hadith',reference:'Invented reference'}] },transcript);
  assert.equal(result.quotes[0].reference, ''); assert.equal(result.quotes[0].source_url, '');
});
test('provider uses timed transcription and strict Responses schema without logging error bodies', async () => {
  const dir = await mkdtemp(join(tmpdir(),'sermon-test-'));
  try {
    const file = join(dir,'audio.mp3'); await writeFile(file,'fixture'); const calls=[];
    const provider=openAI({key:'test-key',summaryModel:'configured-model',fetcher:async(url,init)=>{
      calls.push({url,init}); return {ok:true,json:async()=>url.endsWith('/transcriptions') ? {segments:transcript} : {status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({summary:'A reminder.',quotes:[]})}]}]}};
    }});
    await provider.transcribe(file); await provider.summarise(transcript);
    assert.equal(calls[0].init.body.get('response_format'),'verbose_json');
    const body=JSON.parse(calls[1].init.body); assert.equal(body.store,false); assert.equal(body.text.format.strict,true);
    const denied=openAI({key:'test',summaryModel:'test',fetcher:async()=>({ok:false,status:429})});
    await assert.rejects(()=>denied.summarise(transcript),/^Error: provider_http_429$/);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('retry reuses persisted audio and only submits a review draft', async () => {
  const directory=await mkdtemp(join(tmpdir(),'sermon-test-')); const calls=[];
  try {
    await processJob({id:'job',lease_id:'lease',audio_path:'processed/job.mp3'}, {directory,radioUrl:'https://example.org/live',backend:{download:async(path,file)=>{calls.push(path);await writeFile(file,'fixture');},rpc:async(name,body)=>calls.push({name,body})},provider:{transcribe:async()=>transcript,summarise:async()=>({summary:'Draft',quotes:[]})},downloadAudio:()=>{throw Error('Must not recapture');}});
    assert.equal(calls[0],'processed/job.mp3'); assert.equal(calls[1].name,'finish_sermon_job'); assert.equal(calls[1].body.p_draft.summary,'Draft');
    assert.equal(calls.some((call)=>call.name==='publish_sermon'),false);
  } finally { await rm(directory,{recursive:true,force:true}); }
});
test('quote card escapes active content and forbids unsafe reference URLs', () => {
  const svg=quoteCardSvg({text:'<script>alert("x")</script>'},{title:'<talk>',speaker:'A & B'});
  assert.equal(svg.includes('<script>'),false); assert.ok(svg.includes('&lt;script&gt;')); assert.ok(svg.includes('A &amp; B'));
  assert.equal(safeQuoteSource('javascript:alert(1)'),null); assert.equal(safeQuoteSource('https://user@host.org'),null);
});
test('SQL enforces owner queue, worker leases, private drafts and reviewed publication', async () => {
  const db=new PGlite(); const owner='00000000-0000-4000-8000-000000000001', member='00000000-0000-4000-8000-000000000002';
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema private; create schema storage;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,private,auth,storage to anon,authenticated,service_role;
    create table profiles(id uuid primary key,is_active boolean,is_owner boolean);
    insert into profiles values('${owner}',true,true),('${member}',true,false);
    create function private.workspace_owner() returns boolean language sql stable security definer set search_path='' as $$select coalesce((select is_active and is_owner from public.profiles where id=auth.uid()),false)$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant select,insert on storage.objects to anon,authenticated; grant all on storage.objects to service_role;`);
  await db.exec(await readFile(new URL('../supabase/migrations/20260913111515_sermon_archive.sql',import.meta.url),'utf8'));
  const as=async(role,user,fn)=>{await db.exec(`set role ${role};select set_config('request.jwt.claim.sub','${user||''}',false)`);try{return await fn();}finally{await db.exec('reset role');}};
  try {
    await as('anon',null,()=>assert.rejects(()=>db.query("select queue_sermon('Talk','','radio')"),/permission denied/));
    await as('authenticated',member,()=>assert.rejects(()=>db.query("select queue_sermon('Talk','','radio')"),/Owner/));
    const id=(await as('authenticated',owner,()=>db.query("select queue_sermon('Talk','Speaker','radio',null,60) as id"))).rows[0].id;
    assert.equal((await as('authenticated',member,()=>db.query('select * from sermon_jobs'))).rows.length,0);
    await as('authenticated',owner,()=>assert.rejects(()=>db.query('select claim_sermon_job()'),/permission denied/));
    const job=(await as('service_role',null,()=>db.query('select * from claim_sermon_job()'))).rows[0]; assert.equal(job.status,'processing');
    assert.equal((await as('service_role',null,()=>db.query('select * from claim_sermon_job()'))).rows.length,0);
    await as('service_role',null,()=>assert.rejects(()=>db.query('select finish_sermon_job($1,$2,$3)',[id,member,'{}']),/lease/));
    await as('service_role',null,()=>db.query('select save_sermon_audio($1,$2,$3)',[id,job.lease_id,`processed/${id}.mp3`]));
    await as('service_role',null,()=>db.query('select finish_sermon_job($1,$2,$3)',[id,job.lease_id,JSON.stringify({transcript,summary:'Draft',quotes:[]})]));
    assert.equal((await as('anon',null,()=>db.query('select id from sermon_publications'))).rows.length,0);
    const publish=(quotes,ack=true)=>db.query('select publish_sermon($1,$2,$3,$4,$5,$6,$7)',[id,'Talk','Speaker','Reviewed summary',JSON.stringify(transcript),JSON.stringify(quotes),ack]);
    await as('authenticated',member,()=>assert.rejects(()=>publish([]),/Owner/));
    await as('authenticated',owner,async()=>{
      await assert.rejects(()=>publish([],false),/review/); await assert.rejects(()=>publish([{text:'Invented',segment_index:0,kind:'speaker'}]),/match/);
      await assert.rejects(()=>publish([{text:'help them.',segment_index:0,kind:'hadith'}]),/Verify/);
      await assert.rejects(()=>publish([{text:null,segment_index:0,kind:'speaker'}]),/Invalid quote/);
      await publish([{text:'help them.',segment_index:0,kind:'speaker',reference:'',source_url:''}]);
    });
    assert.equal((await as('anon',null,()=>db.query('select id from sermon_publications'))).rows.length,1);
    await as('anon',null,()=>assert.rejects(()=>db.query('select reviewed_by from sermon_publications'),/permission denied/));
    await as('service_role',null,()=>db.query("insert into storage.objects(bucket_id,name) values('sermon-recordings',$1),('sermon-recordings','private.mp3')",[`processed/${id}.mp3`]));
    assert.equal((await as('anon',null,()=>db.query('select name from storage.objects'))).rows.length,1);
    await as('authenticated',owner,()=>db.query('select withdraw_sermon($1)',[id])); assert.equal((await as('anon',null,()=>db.query('select name from storage.objects'))).rows.length,0);
    await db.query('update profiles set is_active=false where id=$1',[owner]); await as('authenticated',owner,()=>assert.rejects(()=>publish([]),/Owner/));
  } finally { await db.close(); }
});
