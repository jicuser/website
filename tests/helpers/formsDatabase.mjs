import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
export const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export async function formsDatabase() {
 const db = new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema private; create schema storage;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth,private to anon,authenticated,service_role;
 create table profiles(id uuid primary key,display_name text,is_active boolean not null default true,is_owner boolean not null default false,permissions text[] not null default '{}',staff_kinds text[] not null default '{}');
 create table form_submissions(id uuid primary key default gen_random_uuid(),kind text not null check(kind in('contact','madrassah','itikaaf')),payload jsonb default '{}',status text default 'new' check(status in('new','done')),created_at timestamptz default now());
 create table audit_log(id bigint generated always as identity primary key,actor_id uuid,actor_name text,table_name text,record_id text,action text,old_data jsonb,new_data jsonb,created_at timestamptz default now());
 create function private.has_permission(required text) returns boolean language sql stable security definer set search_path='' as $$ select coalesce((select is_active and (is_owner or required=any(permissions)) from public.profiles where id=auth.uid()),false) $$;
 alter table profiles enable row level security; grant select on profiles to authenticated; create policy own_profile on profiles for select using(id=auth.uid());
 alter table form_submissions enable row level security; grant select on form_submissions to authenticated; grant update(status) on form_submissions to authenticated; grant all on profiles,form_submissions,audit_log to service_role;
 create policy forms_read on form_submissions for select to authenticated using(private.has_permission('forms_'||kind));
 create policy forms_update on form_submissions for update to authenticated using(private.has_permission('forms_'||kind)) with check(private.has_permission('forms_'||kind));
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);`);
 for (const name of ['20260914040000_website_forms.sql','20260914041000_content_pages.sql']) await db.exec(await readFile(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8'));
 await db.exec(`insert into profiles(id,display_name,is_owner,permissions) values('${id(1)}','Owner',true,'{}'),('${id(2)}','Form manager',false,'{forms_manage}'),('${id(3)}','Responsible person',false,'{}'),('${id(4)}','Replacement person',false,'{}'),('${id(5)}','Unrelated account',false,'{}'),('${id(6)}','Content editor',false,'{content}');`);
 const as = async(user,work,role='authenticated') => {
  await db.exec(`set role ${role};select set_config('request.jwt.claim.sub','${user || ''}',false);`);
  try{return await work();}finally{await db.exec('reset role');}
 };
 const rpc = async(name,args=[]) => (await db.query(`select ${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) result`,args)).rows[0]?.result;
 return {db,as,rpc};
}
