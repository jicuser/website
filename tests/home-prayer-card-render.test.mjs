import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as state from '../src/lib/prayerDisplayState.js';
import * as view from '../src/lib/homePrayerView.js';
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/home/HomePrayerCard.jsx',import.meta.url),'utf8');
const compiled = ts.transpileModule(source, {compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const today={d_date:'2026-11-03',fajr:'05:34',sunrise:'07:05',dhuhr:'11:56',asr:'14:44',maghrib:'16:37',isha:'18:24',jamaah_fajr:'06:15',jamaah_dhuhr:'13:00',jamaah_asr:'15:30',jamaah_maghrib:'16:37',jamaah_isha:'19:30'};
function render(data={},clock='2026-11-03T17:13:00Z',props={}) {
 const mod={exports:{}};
 const dependencies={
  './HomePrayerExtras':{__esModule:true,default:()=>null},
  react:React,'lucide-react':require('lucide-react'),
  'react-router-dom':{Link:({to,children,...props})=>React.createElement('a',{...props,href:to},children)},
  '@/context/PrayerTimesContext':{usePublicPrayerTimes:()=>({todaysTimes:today,monthlyPrayerTimes:[],jummahTimes:[{prayer:'12:35'},{prayer:'13:30'}],...data})},
  '@/hooks/useDisplayClock':{__esModule:true,default:()=>new Date(clock)},
  '@/lib/timetable':{displayTime:value=>value||'—'},
  '@/lib/prayerDisplayState':state,'@/lib/homePrayerView':view,'@/styles/jic-prayer-modern.css':{},
 };
 new Function('require','module','exports',compiled)((name)=>{assert.ok(name in dependencies,`Unresolved ${name}`);return dependencies[name];},mod,mod.exports);
 return renderToStaticMarkup(React.createElement(mod.exports.default,props));
}
test('real component uses one semantic table, not five nested cards',()=>{
 const html=render();assert.equal((html.match(/<table /g)||[]).length,1);assert.equal((html.match(/scope="row"/g)||[]).length,2);assert.doesNotMatch(html,/jic-prayer-browser-item/);
});
test('current prayer is one full column, not competing current and next highlights',()=>{
 const html=render();assert.equal((html.match(/aria-current="time"/g)||[]).length,1);assert.equal((html.match(/data-current="true"/g)||[]).length,3);assert.match(html,/Current: Maghrib/);assert.doesNotMatch(html,/is-next-jamaat/);
});
test('starts countdown includes both next beginning and congregation without repeated radio link',()=>{
 const html=render();assert.match(html,/Begins in/);assert.match(html,/01:11:00/);assert.match(html,/Jamaat 19:30/);assert.doesNotMatch(html,/href="\/radio"/);assert.match(html,/href="\/prayer-times\/reminders"/);
});
test('after the start the same countdown changes to Jamaat',()=>{
 const html=render({},'2026-11-03T14:48:41Z');assert.match(html,/Jamaat in/);assert.match(html,/00:41:19/);assert.match(html,/Current: Asr/);
});
test('native date picker replaces the overflowing month-long strip',()=>{
 const html=render();assert.match(html,/type="date"/);assert.match(html,/aria-label="Previous day"/);assert.match(html,/aria-label="Next day"/);assert.doesNotMatch(html,/jic-prayer-day-strip/);
});
test('no published row displays no fabricated times or live clock',()=>{
 const html=render({todaysTimes:null,jummahTimes:[]});assert.match(html,/No published timetable for today/);assert.doesNotMatch(html,/<table |role="timer"/);
});
test('stale times and zero-length data do not create a current-prayer claim',()=>{
 const html=render({todaysTimes:{...today,d_date:'2026-11-02'}});assert.doesNotMatch(html,/aria-current="time"|role="timer"/);
});
test('same-time Maghrib displays the Jamaat notice instead of a negative timer',()=>{
 const html=render({},'2026-11-03T16:37:00Z');assert.match(html,/Maghrib Jamaat time/);assert.doesNotMatch(html,/role="timer"/);
});
test('installed card labels tomorrow Fajr separately from today’s timetable',()=>{
 const html=render({tomorrowsTimes:{...today,d_date:'2026-11-04',fajr:'05:35'}},'2026-11-03T21:00:00Z',{compact:true});
 assert.match(html,/Today’s Salah/);assert.match(html,/Current · Isha/);assert.match(html,/Fajr tomorrow/);assert.match(html,/<time>05:35<\/time>/);assert.match(html,/05:34/);assert.match(html,/Starts in/);
});
test('installed card keeps the next Jamaat clear and the exact-time notice visible',()=>{
 const html=render({},'2026-11-03T18:45:00Z',{compact:true});
 assert.match(html,/Next Jamaat/);assert.match(html,/<time>19:30<\/time>/);
 assert.match(render({},'2026-11-03T16:37:00Z',{compact:true}),/Maghrib Jamaat time/);
});
test('installed card handles the daylight gap and missing publication without a current claim',()=>{
 const html=render({},'2026-11-03T10:00:00Z',{compact:true});
 assert.match(html,/Dhuhr/);assert.doesNotMatch(html,/Current ·|aria-current="time"/);
 assert.doesNotMatch(render({todaysTimes:null,jummahTimes:[]},undefined,{compact:true}),/Current ·|<table |role="timer"/);
});
