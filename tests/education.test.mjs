import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdultProgramme, weeklySessions, validSessions } from '../src/lib/education.js';
import { posterCatalogue, DEFAULT_POSTERS } from '../src/lib/posters.js';
import { validReadingEntry, publicAssetUrl } from '../src/lib/mobileContent.js';

test('adult education excludes youth and Madrassah posters and unknown audiences',()=>{
 const posters=posterCatalogue(null);
 const adult=posters.filter(isAdultProgramme);
 assert.ok(adult.some((row)=>row.id==='seekers-gateway'));
 assert.ok(!adult.some((row)=>row.id==='youth-islamic-studies'));
 assert.equal(isAdultProgramme({groups:['education'],audience:'madrassah'}),false);
 assert.equal(isAdultProgramme({groups:['education']}),false);
 assert.ok(weeklySessions(posters).every((row)=>row.id!=='youth-islamic-studies'));
});
test('legacy posters inherit known sessions only while their schedule remains unchanged',()=>{
 const original=DEFAULT_POSTERS.find((row)=>row.id==='open-quran-circle');
 const {audience,sessions,...legacy}=original;
 assert.deepEqual(posterCatalogue(JSON.stringify([legacy]))[0].sessions,sessions);
 assert.equal(posterCatalogue(JSON.stringify([{...legacy,schedule:'Ask about new dates'}]))[0].sessions.length,0);
 assert.deepEqual(weeklySessions(posterCatalogue(JSON.stringify([{...legacy,sessions:[]}]))),[]);
});
test('weekly sessions reject invalid clocks, duplicate timing modes and impossible days',()=>{
 for(const row of [{day:0,time:'18:00'},{day:8,time:'18:00'},{day:1,time:'25:00'},{day:1,time:'18:00',after:'Maghrib'},{day:1,time:'18:00',end:'17:00'},{day:1,after:'Something'}])assert.equal(validSessions([row]),false);
 assert.equal(validSessions([{day:1,after:'Maghrib'},{day:5,time:'18:30',end:'20:00'}]),true);
});
test('approved reading requires source and reference, with no executable links',()=>{
 const reading={id:'one',collection:'hadith',title:'Approved reading',text:'Reviewed text',reference:'Exact reference',source:'https://example.org/source'};
 assert.equal(validReadingEntry(reading),true);
 assert.equal(validReadingEntry({...reading,reference:''}),false);
 for(const source of ['javascript:alert(1)','//example.org','https://name:password@example.org','http://example.org','/\\evil']){
  assert.equal(publicAssetUrl(source),false,source);
  assert.equal(validReadingEntry({...reading,source}),false);
 }
});
