import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('admin forms workspace exposes live forms, responses and schedule as distinct destinations', async () => {
  const source = await read('src/features/forms/FormsManager.jsx');
  assert.match(source, /<strong>Live forms<\/strong>/);
  assert.match(source, /onChoose\(\{ view: 'forms' \}\)/);
  assert.match(source, /<strong>Schedule<\/strong>/);
  assert.match(source, /<ScheduleManager \/>/);
  assert.match(source, /const view = params\.get\('view'\) \|\| 'home'/);
  assert.match(source, /Contact Us/);
});

test('service forms are seeded into the existing custom forms engine', async () => {
  const sql = await read('supabase/migrations/20260914152000_admin_schedule_and_service_forms.sql');
  for (const slug of ['funeral-enquiry', 'nikah-enquiry', 'hall-booking'])
    assert.match(sql, new RegExp(`'${slug}'`));
  assert.match(sql, /insert into public\.custom_form_versions/);
  assert.match(sql, /'manager'\),\(form_id,owner_id,'responsible'/);
  assert.match(sql, /A submission is a request only/);
});

test('schedule schema separates public hall availability from staff course planning', async () => {
  const sql = await read('supabase/migrations/20260914152000_admin_schedule_and_service_forms.sql');
  assert.match(sql, /create table if not exists public\.hall_bookings/);
  assert.match(sql, /grant select on public\.hall_bookings to anon,authenticated/);
  assert.match(sql, /create table if not exists public\.course_schedule/);
  assert.match(sql, /planner_visible boolean not null default true/);
  assert.doesNotMatch(sql, /customer_name|email text|phone text/);
});

test('course planner automatically renders assigned active days without duplicate planner records', async () => {
  const source = await read('src/features/forms/ScheduleManager.jsx');
  assert.match(source, /row\.active && row\.planner_visible && Number\(row\.day_of_week\)/);
  assert.match(source, /Any active course with an assigned day appears here automatically/);
  assert.match(source, /Do not add it twice/);
});

test('presentation status is server-derived and quick present skips the naming step', async () => {
  const status = await read('src/features/displays/ActiveStreamList.jsx');
  const setup = await read('src/components/admin/StreamSetup.jsx');
  assert.match(status, /tvRequest\(/);
  assert.match(status, /result\.value\.presentation/);
  assert.match(status, /'Offline'/);
  assert.match(status, /active server session/);
  assert.match(status, /another admin device/);
  assert.match(setup, /Quick present/);
  assert.match(setup, /setup\.build\('Quick presentation'\)/);
  assert.match(setup, /stage === 2 && !quickStart/);
  assert.match(setup, /Presentation still live/);
});

test('public service pages link to the requested forms', async () => {
  const hall = await read('src/pages/HallBookingPage.jsx');
  const services = await read('src/components/sections/services/ReligiousServicesTab.jsx');
  assert.match(hall, /to="\/forms\/hall-booking"/);
  assert.match(services, /\/forms\/nikah-enquiry/);
  assert.match(services, /\/forms\/funeral-enquiry/);
});
